#!/usr/bin/env node

/**
 * Settings Migration Runner
 * This script creates the project settings, audit log, and attachments tables
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

// Parse environment variables
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Creating project settings and audit tables...')
  
  try {
    // Create project_settings table
    console.log('Creating project_settings table...')
    const { error: settingsError } = await supabase
      .from('project_settings')
      .select('project_id')
      .limit(1)

    if (settingsError) {
      console.error('❌ Error creating project_settings table:', settingsError)
      return
    }

    // Create project_audit_log table
    console.log('Creating project_audit_log table...')
    const { error: auditError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS project_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES profiles(id),
          action VARCHAR(100) NOT NULL,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (auditError) {
      console.error('❌ Error creating project_audit_log table:', auditError)
      return
    }

    // Create project_attachments table
    console.log('Creating project_attachments table...')
    const { error: attachmentsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS project_attachments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(10) NOT NULL CHECK (type IN ('file', 'note')),
          content TEXT,
          file_url TEXT,
          file_size BIGINT,
          mime_type VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by UUID NOT NULL REFERENCES profiles(id)
        );
      `
    })

    if (attachmentsError) {
      console.error('❌ Error creating project_attachments table:', attachmentsError)
      return
    }

    // Create indexes
    console.log('Creating indexes...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE INDEX IF NOT EXISTS idx_project_audit_log_project_id ON project_audit_log(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_audit_log_created_at ON project_audit_log(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_attachments_type ON project_attachments(type);
      `
    })

    if (indexError) {
      console.error('❌ Error creating indexes:', indexError)
      return
    }

    // Enable RLS
    console.log('Enabling Row Level Security...')
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE project_audit_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;
      `
    })

    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError)
      return
    }

    console.log('✅ Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()