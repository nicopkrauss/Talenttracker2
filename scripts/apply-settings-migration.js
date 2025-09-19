#!/usr/bin/env node

/**
 * Apply Settings Migration
 * This script applies the settings migration using individual SQL statements
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

// SQL statements to create the tables
const sqlStatements = [
  // Create project_settings table
  `CREATE TABLE IF NOT EXISTS project_settings (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    default_break_duration INTEGER DEFAULT 30 CHECK (default_break_duration >= 15 AND default_break_duration <= 120),
    payroll_export_format VARCHAR(10) DEFAULT 'csv' CHECK (payroll_export_format IN ('csv', 'xlsx', 'pdf')),
    notification_rules JSONB DEFAULT '{
      "timecardReminders": true,
      "shiftAlerts": true,
      "talentArrivalNotifications": false,
      "overtimeWarnings": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
  );`,
  
  // Create project_audit_log table
  `CREATE TABLE IF NOT EXISTS project_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  
  // Create project_attachments table
  `CREATE TABLE IF NOT EXISTS project_attachments (
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
  );`,
  
  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_project_audit_log_project_id ON project_audit_log(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_project_audit_log_created_at ON project_audit_log(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_project_attachments_type ON project_attachments(type);`,
  
  // Enable RLS
  `ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE project_audit_log ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;`
]

async function applySettingsMigration() {
  console.log('🚀 Applying settings migration...')
  
  try {
    console.log('Testing database connection...')
    const { data: projects, error: testError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Cannot connect to database:', testError)
      return
    }
    
    console.log('✅ Database connection successful')
    console.log('')
    console.log('❌ Cannot create tables through Supabase client API')
    console.log('')
    console.log('SOLUTION: You need to run the migration in Supabase Dashboard')
    console.log('')
    console.log('Steps:')
    console.log('1. Go to https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Go to SQL Editor')
    console.log('4. Create a new query')
    console.log('5. Copy and paste the SQL below')
    console.log('6. Click "Run"')
    console.log('')
    console.log('--- COPY THIS SQL ---')
    console.log('')
    
    const migrationPath = path.join(__dirname, '..', 'migrations', '030_create_project_settings_and_audit_tables.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    console.log(sql)
    
    console.log('')
    console.log('--- END SQL ---')
    console.log('')
    console.log('After running this, your settings tab will work!')
    
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

applySettingsMigration()