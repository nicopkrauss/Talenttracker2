#!/usr/bin/env node

/**
 * Direct Settings Tables Creator
 * This script creates the settings tables using direct SQL execution
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

async function createSettingsTables() {
  console.log('🚀 Creating project settings tables...')
  
  try {
    // Test database connection
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
    
    // Check if tables already exist
    console.log('Checking existing tables...')
    
    // Try to query each table to see if it exists
    const tableChecks = await Promise.allSettled([
      supabase.from('project_settings').select('project_id').limit(1),
      supabase.from('project_audit_log').select('id').limit(1),
      supabase.from('project_attachments').select('id').limit(1)
    ])
    
    const tablesExist = {
      project_settings: tableChecks[0].status === 'fulfilled',
      project_audit_log: tableChecks[1].status === 'fulfilled',
      project_attachments: tableChecks[2].status === 'fulfilled'
    }
    
    console.log('Table status:')
    console.log('- project_settings:', tablesExist.project_settings ? '✅ exists' : '❌ missing')
    console.log('- project_audit_log:', tablesExist.project_audit_log ? '✅ exists' : '❌ missing')
    console.log('- project_attachments:', tablesExist.project_attachments ? '✅ exists' : '❌ missing')
    
    const allTablesExist = Object.values(tablesExist).every(exists => exists)
    
    if (allTablesExist) {
      console.log('')
      console.log('🎉 All settings tables already exist! Settings tab should work now.')
      return
    }
    
    console.log('')
    console.log('❌ Some tables are missing. You need to create them in Supabase.')
    console.log('')
    console.log('SOLUTION:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Create a new query')
    console.log('4. Copy and paste the SQL below')
    console.log('5. Click "Run"')
    console.log('')
    console.log('--- SQL TO RUN ---')
    
    const migrationPath = path.join(__dirname, '..', 'migrations', '030_create_project_settings_and_audit_tables.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    console.log(sql)
    
    console.log('')
    console.log('--- END SQL ---')
    console.log('')
    console.log('After running this SQL, the settings tab will work properly!')
    
  } catch (err) {
    console.error('❌ Error:', err.message)
    console.log('')
    console.log('Please run the migration SQL manually in your Supabase dashboard.')
  }
}

createSettingsTables()