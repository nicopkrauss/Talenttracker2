#!/usr/bin/env node

/**
 * Apply Project Lifecycle Schema Changes
 * This script applies the database schema changes for project lifecycle management
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

async function applySchemaChanges() {
  console.log('🚀 Applying project lifecycle schema changes...')
  
  try {
    // Step 1: Extend project_status enum
    console.log('📝 Step 1: Extending project_status enum...')
    
    const enumUpdates = [
      "ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'staffing'",
      "ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'pre_show'", 
      "ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'post_show'",
      "ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'complete'"
    ]
    
    for (const sql of enumUpdates) {
      const { error } = await supabase.rpc('exec', { sql })
      if (error && !error.message.includes('already exists')) {
        console.error('❌ Error updating enum:', error.message)
        throw error
      }
    }
    
    // Step 2: Add columns to projects table
    console.log('📝 Step 2: Adding columns to projects table...')
    
    const projectColumns = `
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS phase_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS auto_transitions_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS rehearsal_start_date DATE,
      ADD COLUMN IF NOT EXISTS show_end_date DATE
    `
    
    const { error: projectError } = await supabase.rpc('exec', { sql: projectColumns })
    if (projectError) {
      console.error('❌ Error adding project columns:', projectError.message)
      throw projectError
    }
    
    // Step 3: Add columns to project_settings table
    console.log('📝 Step 3: Adding columns to project_settings table...')
    
    const settingsColumns = `
      ALTER TABLE project_settings 
      ADD COLUMN IF NOT EXISTS auto_transitions_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS archive_month INTEGER DEFAULT 4 CHECK (archive_month >= 1 AND archive_month <= 12),
      ADD COLUMN IF NOT EXISTS archive_day INTEGER DEFAULT 1 CHECK (archive_day >= 1 AND archive_day <= 31),
      ADD COLUMN IF NOT EXISTS post_show_transition_hour INTEGER DEFAULT 6 CHECK (post_show_transition_hour >= 0 AND post_show_transition_hour <= 23)
    `
    
    const { error: settingsError } = await supabase.rpc('exec', { sql: settingsColumns })
    if (settingsError) {
      console.error('❌ Error adding settings columns:', settingsError.message)
      throw settingsError
    }
    
    // Step 4: Create indexes
    console.log('📝 Step 4: Creating performance indexes...')
    
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_projects_phase_updated_at ON projects(phase_updated_at)",
      "CREATE INDEX IF NOT EXISTS idx_projects_auto_transitions ON projects(auto_transitions_enabled)",
      "CREATE INDEX IF NOT EXISTS idx_projects_timezone ON projects(timezone)",
      "CREATE INDEX IF NOT EXISTS idx_projects_rehearsal_start_date ON projects(rehearsal_start_date)",
      "CREATE INDEX IF NOT EXISTS idx_projects_show_end_date ON projects(show_end_date)",
      "CREATE INDEX IF NOT EXISTS idx_projects_status_dates ON projects(status, rehearsal_start_date, show_end_date)",
      "CREATE INDEX IF NOT EXISTS idx_projects_lifecycle_tracking ON projects(status, auto_transitions_enabled, rehearsal_start_date, show_end_date)",
      "CREATE INDEX IF NOT EXISTS idx_projects_archive_candidates ON projects(status, created_at) WHERE status IN ('complete', 'completed')"
    ]
    
    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec', { sql: indexSql })
      if (error) {
        console.error('❌ Error creating index:', error.message)
        throw error
      }
    }
    
    // Step 5: Update existing projects
    console.log('📝 Step 5: Updating existing projects...')
    
    const updateSql = `
      UPDATE projects 
      SET phase_updated_at = COALESCE(updated_at, created_at, NOW())
      WHERE phase_updated_at IS NULL
    `
    
    const { error: updateError } = await supabase.rpc('exec', { sql: updateSql })
    if (updateError) {
      console.error('❌ Error updating projects:', updateError.message)
      throw updateError
    }
    
    console.log('✅ Project lifecycle schema changes applied successfully!')
    console.log('🎉 Database is ready for project lifecycle management!')
    
    // Verify the changes
    console.log('🔍 Verifying schema changes...')
    
    const { data: projects, error: verifyError } = await supabase
      .from('projects')
      .select('id, name, status, phase_updated_at, auto_transitions_enabled')
      .limit(1)
    
    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError.message)
    } else {
      console.log('✅ Schema verification successful')
      if (projects && projects.length > 0) {
        console.log('📊 Sample project data:', projects[0])
      }
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  }
}

applySchemaChanges()