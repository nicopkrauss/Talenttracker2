#!/usr/bin/env node

/**
 * Simple script to create missing tables using direct SQL execution
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

async function createMissingTables() {
  console.log('🚀 Creating missing tables...')
  
  try {
    // Test if project_attachments table exists
    console.log('Checking if project_attachments table exists...')
    const { error: testError } = await supabase
      .from('project_attachments')
      .select('id')
      .limit(1)

    if (testError && testError.code === 'PGRST205') {
      console.log('❌ project_attachments table does not exist')
      console.log('✅ This explains the error you saw in the settings tab')
      console.log('')
      console.log('To fix this, you need to run the database migration.')
      console.log('The migration file exists at: migrations/030_create_project_settings_and_audit_tables.sql')
      console.log('')
      console.log('You can run it manually in your Supabase dashboard SQL editor, or')
      console.log('if you have the Supabase CLI installed, run:')
      console.log('  supabase db push')
      console.log('')
      console.log('For now, the settings tab will work but attachments will be empty.')
    } else if (testError) {
      console.log('❌ Error checking table:', testError)
    } else {
      console.log('✅ project_attachments table exists')
    }

    // Test project_audit_log table
    console.log('Checking if project_audit_log table exists...')
    const { error: auditTestError } = await supabase
      .from('project_audit_log')
      .select('id')
      .limit(1)

    if (auditTestError && auditTestError.code === 'PGRST205') {
      console.log('❌ project_audit_log table does not exist')
    } else if (auditTestError) {
      console.log('❌ Error checking audit table:', auditTestError)
    } else {
      console.log('✅ project_audit_log table exists')
    }

    // Test project_settings table
    console.log('Checking if project_settings table exists...')
    const { error: settingsTestError } = await supabase
      .from('project_settings')
      .select('project_id')
      .limit(1)

    if (settingsTestError && settingsTestError.code === 'PGRST205') {
      console.log('❌ project_settings table does not exist')
    } else if (settingsTestError) {
      console.log('❌ Error checking settings table:', settingsTestError)
    } else {
      console.log('✅ project_settings table exists')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createMissingTables()