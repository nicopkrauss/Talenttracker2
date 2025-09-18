#!/usr/bin/env node

/**
 * Disable RLS for Development
 * This script programmatically disables Row Level Security for development using Supabase client
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

// List of all tables to disable RLS on
const tables = [
  'profiles',
  'projects', 
  'team_assignments',
  'talent',
  'talent_project_assignments',
  'talent_status',
  'project_locations',
  'shifts',
  'timecards',
  'notifications',
  'user_favorites',
  'project_role_templates',
  'project_setup_checklist',
  'talent_groups',
  'talent_daily_assignments',
  'group_daily_assignments',
  'project_settings',
  'project_audit_log',
  'project_attachments'
]

async function disableRLSForDevelopment() {
  console.log('🚨 Disabling RLS for Development')
  console.log('=================================\n')
  
  console.log('⚠️  WARNING: This will disable Row Level Security on all tables.')
  console.log('⚠️  This is intended for development only - DO NOT use in production!\n')

  let successCount = 0
  let errorCount = 0
  const errors = []

  // Step 1: Disable RLS on all tables
  console.log('📋 Step 1: Disabling RLS on all tables...\n')
  
  for (const table of tables) {
    try {
      console.log(`   Disabling RLS on ${table}...`)
      
      const { error } = await supabase.rpc('exec', {
        sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
      })
      
      if (error) {
        console.log(`   ❌ Failed: ${error.message}`)
        errors.push({ table, error: error.message })
        errorCount++
      } else {
        console.log(`   ✅ Success`)
        successCount++
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`)
      errors.push({ table, error: err.message })
      errorCount++
    }
  }

  // Step 2: Grant broad permissions
  console.log('\n📋 Step 2: Granting permissions...\n')
  
  const permissionQueries = [
    'GRANT USAGE ON SCHEMA public TO authenticated;',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;',
    'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;',
    'GRANT ALL ON SCHEMA public TO service_role;',
    'GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;',
    'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;',
    'GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;'
  ]

  for (const query of permissionQueries) {
    try {
      console.log(`   Executing: ${query.substring(0, 50)}...`)
      
      const { error } = await supabase.rpc('exec', {
        sql: query
      })
      
      if (error) {
        console.log(`   ❌ Failed: ${error.message}`)
        errors.push({ query, error: error.message })
        errorCount++
      } else {
        console.log(`   ✅ Success`)
        successCount++
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`)
      errors.push({ query, error: err.message })
      errorCount++
    }
  }

  // Summary
  console.log('\n📊 Summary:')
  console.log(`   ✅ Successful operations: ${successCount}`)
  console.log(`   ❌ Failed operations: ${errorCount}`)

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    errors.forEach((err, index) => {
      console.log(`   ${index + 1}. ${err.table || 'Permission'}: ${err.error}`)
    })
    
    console.log('\n💡 Some errors are expected if tables don\'t exist or RLS is already disabled.')
    console.log('💡 If you see "function exec does not exist", the operations may still work via direct SQL.')
  }

  if (successCount > 0) {
    console.log('\n🎉 RLS has been disabled for development!')
    console.log('✅ You should now be able to access all database tables without permission errors.')
    console.log('')
    console.log('🔧 To re-enable RLS later for production:')
    console.log('   Run: node scripts/enable-rls-for-production.js')
    console.log('   Or manually: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;')
  } else {
    console.log('\n⚠️  No operations succeeded. You may need to run the SQL manually.')
    console.log('   Copy the SQL from emergency-disable-rls.sql and run it in Supabase SQL Editor.')
  }

  console.log('\n🏁 Operation complete')
}

// Run the script
disableRLSForDevelopment().catch(console.error)