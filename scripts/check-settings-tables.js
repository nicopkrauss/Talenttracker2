#!/usr/bin/env node

/**
 * Check Settings Tables
 * This script checks if the settings tables exist
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

async function checkTables() {
  console.log('🔍 Checking settings tables...')
  
  try {
    // Check project_settings table
    console.log('Checking project_settings table...')
    const { data: settingsData, error: settingsError } = await supabase
      .from('project_settings')
      .select('project_id')
      .limit(1)

    if (settingsError) {
      console.log('❌ project_settings table does not exist:', settingsError.message)
    } else {
      console.log('✅ project_settings table exists')
    }

    // Check project_audit_log table
    console.log('Checking project_audit_log table...')
    const { data: auditData, error: auditError } = await supabase
      .from('project_audit_log')
      .select('id')
      .limit(1)

    if (auditError) {
      console.log('❌ project_audit_log table does not exist:', auditError.message)
    } else {
      console.log('✅ project_audit_log table exists')
    }

    // Check project_attachments table
    console.log('Checking project_attachments table...')
    const { data: attachmentsData, error: attachmentsError } = await supabase
      .from('project_attachments')
      .select('id')
      .limit(1)

    if (attachmentsError) {
      console.log('❌ project_attachments table does not exist:', attachmentsError.message)
    } else {
      console.log('✅ project_attachments table exists')
    }

    console.log('🏁 Table check completed')
    
  } catch (error) {
    console.error('❌ Check failed:', error)
    process.exit(1)
  }
}

checkTables()