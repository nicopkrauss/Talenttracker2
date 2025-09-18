#!/usr/bin/env node

/**
 * Test Full Database Access
 * This script tests access to all major tables to verify permissions are working
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

// Tables to test
const tablesToTest = [
  'profiles',
  'projects',
  'team_assignments',
  'talent',
  'talent_project_assignments',
  'talent_status',
  'project_locations',
  'project_role_templates',
  'project_setup_checklist',
  'talent_groups'
]

async function testFullDatabaseAccess() {
  console.log('🔍 Testing Full Database Access')
  console.log('===============================\n')
  
  console.log('Testing access to all major tables...\n')

  let successCount = 0
  let errorCount = 0
  const results = []

  for (const table of tablesToTest) {
    try {
      console.log(`   Testing ${table}...`)
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`   ❌ Failed: ${error.message}`)
        results.push({ table, status: 'error', message: error.message, code: error.code })
        errorCount++
      } else {
        console.log(`   ✅ Success (${data?.length || 0} records)`)
        results.push({ table, status: 'success', records: data?.length || 0 })
        successCount++
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`)
      results.push({ table, status: 'error', message: err.message })
      errorCount++
    }
  }

  // Summary
  console.log('\n📊 Summary:')
  console.log(`   ✅ Accessible tables: ${successCount}`)
  console.log(`   ❌ Failed tables: ${errorCount}`)
  console.log(`   📈 Success rate: ${Math.round((successCount / tablesToTest.length) * 100)}%`)

  if (errorCount > 0) {
    console.log('\n❌ Tables with errors:')
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        console.log(`   • ${r.table}: ${r.message}`)
      })
  }

  if (successCount === tablesToTest.length) {
    console.log('\n🎉 ALL TABLES ACCESSIBLE!')
    console.log('✅ Database permissions are working correctly.')
    console.log('✅ You should be able to use the application without permission errors.')
    console.log('')
    console.log('🚀 Ready for development!')
  } else if (successCount > 0) {
    console.log('\n⚠️  PARTIAL ACCESS')
    console.log('Some tables are accessible, but others have permission issues.')
    console.log('You may need to apply additional permission fixes.')
  } else {
    console.log('\n❌ NO ACCESS')
    console.log('All tables failed. You need to apply the permission fixes.')
    console.log('')
    console.log('🔧 Next steps:')
    console.log('1. Copy the SQL from migrations/032_disable_rls_for_development.sql')
    console.log('2. Paste it into your Supabase SQL Editor')
    console.log('3. Click "Run" to execute')
    console.log('4. Run this test again')
  }

  console.log('\n🏁 Test complete')
}

// Run the script
testFullDatabaseAccess().catch(console.error)