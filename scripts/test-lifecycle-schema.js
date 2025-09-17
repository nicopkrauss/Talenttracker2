#!/usr/bin/env node

/**
 * Test Project Lifecycle Schema
 * This script tests the current schema and applies changes step by step
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

async function testCurrentSchema() {
  console.log('🔍 Testing current project schema...')
  
  try {
    // Test current projects table structure
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status, created_at, updated_at')
      .limit(1)
    
    if (projectError) {
      console.error('❌ Error querying projects:', projectError.message)
      return
    }
    
    console.log('✅ Projects table accessible')
    if (projects && projects.length > 0) {
      console.log('📊 Sample project:', projects[0])
    }
    
    // Test project_settings table
    const { data: settings, error: settingsError } = await supabase
      .from('project_settings')
      .select('*')
      .limit(1)
    
    if (settingsError) {
      console.error('❌ Error querying project_settings:', settingsError.message)
    } else {
      console.log('✅ Project_settings table accessible')
      if (settings && settings.length > 0) {
        console.log('📊 Sample settings:', settings[0])
      }
    }
    
    // Test project_audit_log table
    const { data: auditLog, error: auditError } = await supabase
      .from('project_audit_log')
      .select('*')
      .limit(1)
    
    if (auditError) {
      console.error('❌ Error querying project_audit_log:', auditError.message)
    } else {
      console.log('✅ Project_audit_log table accessible')
      if (auditLog && auditLog.length > 0) {
        console.log('📊 Sample audit log:', auditLog[0])
      }
    }
    
    // Check if new columns already exist
    console.log('🔍 Checking for existing lifecycle columns...')
    
    const { data: projectsWithNewCols, error: newColsError } = await supabase
      .from('projects')
      .select('id, phase_updated_at, auto_transitions_enabled, timezone, rehearsal_start_date, show_end_date')
      .limit(1)
    
    if (newColsError) {
      console.log('ℹ️  New columns not yet added to projects table')
    } else {
      console.log('✅ New lifecycle columns already exist in projects table')
      if (projectsWithNewCols && projectsWithNewCols.length > 0) {
        console.log('📊 Sample with new columns:', projectsWithNewCols[0])
      }
    }
    
    console.log('🎉 Schema test completed!')
    
  } catch (err) {
    console.error('❌ Schema test failed:', err.message)
  }
}

testCurrentSchema()