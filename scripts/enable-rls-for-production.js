#!/usr/bin/env node

/**
 * Enable RLS for Production
 * This script re-enables Row Level Security and sets up proper policies for production
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

// Core tables that need RLS enabled
const coreTables = [
  'profiles',
  'projects', 
  'team_assignments'
]

// Supporting tables (can be left without RLS for easier development)
const supportingTables = [
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
  'group_daily_assignments'
]

async function enableRLSForProduction() {
  console.log('🔒 Enabling RLS for Production')
  console.log('==============================\n')
  
  console.log('🛡️  This will re-enable Row Level Security and set up proper policies.')
  console.log('🛡️  This is required for production security.\n')

  let successCount = 0
  let errorCount = 0
  const errors = []

  // Step 1: Enable RLS on core tables
  console.log('📋 Step 1: Enabling RLS on core tables...\n')
  
  for (const table of coreTables) {
    try {
      console.log(`   Enabling RLS on ${table}...`)
      
      const { error } = await supabase.rpc('exec', {
        sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
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

  // Step 2: Create essential RLS policies
  console.log('\n📋 Step 2: Creating essential RLS policies...\n')
  
  const policies = [
    // Profiles policies
    `DROP POLICY IF EXISTS "Users can read own profile" ON profiles;`,
    `CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);`,
    `DROP POLICY IF EXISTS "Users can update own profile" ON profiles;`,
    `CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);`,
    `DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;`,
    `CREATE POLICY "Service role can manage all profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');`,
    
    // Projects policies
    `DROP POLICY IF EXISTS "Users can read assigned projects" ON projects;`,
    `CREATE POLICY "Users can read assigned projects" ON projects FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'in_house'))
      OR id IN (SELECT project_id FROM team_assignments WHERE user_id = auth.uid())
    );`,
    `DROP POLICY IF EXISTS "Service role can manage all projects" ON projects;`,
    `CREATE POLICY "Service role can manage all projects" ON projects FOR ALL USING (auth.role() = 'service_role');`,
    
    // Team assignments policies
    `DROP POLICY IF EXISTS "Users can read relevant assignments" ON team_assignments;`,
    `CREATE POLICY "Users can read relevant assignments" ON team_assignments FOR SELECT USING (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'in_house'))
      OR project_id IN (SELECT project_id FROM team_assignments WHERE user_id = auth.uid())
    );`,
    `DROP POLICY IF EXISTS "Service role can manage all assignments" ON team_assignments;`,
    `CREATE POLICY "Service role can manage all assignments" ON team_assignments FOR ALL USING (auth.role() = 'service_role');`
  ]

  for (const policy of policies) {
    try {
      console.log(`   Executing: ${policy.substring(0, 60)}...`)
      
      const { error } = await supabase.rpc('exec', {
        sql: policy
      })
      
      if (error) {
        console.log(`   ❌ Failed: ${error.message}`)
        errors.push({ policy, error: error.message })
        errorCount++
      } else {
        console.log(`   ✅ Success`)
        successCount++
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`)
      errors.push({ policy, error: err.message })
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
      console.log(`   ${index + 1}. ${err.table || 'Policy'}: ${err.error}`)
    })
  }

  if (successCount > 0) {
    console.log('\n🎉 RLS has been enabled for production!')
    console.log('🛡️  Your database now has proper security policies in place.')
    console.log('')
    console.log('📋 Supporting tables still have open access for easier development.')
    console.log('📋 You can enable RLS on them individually as needed.')
    console.log('')
    console.log('🔧 To disable RLS again for development:')
    console.log('   Run: node scripts/disable-rls-for-development.js')
  } else {
    console.log('\n⚠️  No operations succeeded. You may need to run the SQL manually.')
  }

  console.log('\n🏁 Operation complete')
}

// Run the script
enableRLSForProduction().catch(console.error)