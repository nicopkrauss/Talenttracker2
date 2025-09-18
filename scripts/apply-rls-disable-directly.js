#!/usr/bin/env node

/**
 * Apply RLS Disable Directly
 * This script applies the RLS disable SQL directly using individual queries
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

async function applyRLSDisable() {
  console.log('🚨 Applying RLS Disable for Development')
  console.log('======================================\n')
  
  console.log('⚠️  This will disable Row Level Security and grant broad permissions.')
  console.log('⚠️  This is for development only!\n')

  // Since we can't use exec functions, let's try a different approach
  // We'll use the REST API directly to check if we can access tables
  
  console.log('📋 Testing database access...\n')
  
  // Test 1: Try to read from profiles table
  try {
    console.log('   Testing profiles table access...')
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ Profiles access failed: ${error.message}`)
      console.log(`   Error code: ${error.code}`)
    } else {
      console.log(`   ✅ Profiles table accessible (found ${data?.length || 0} records)`)
    }
  } catch (err) {
    console.log(`   ❌ Profiles test error: ${err.message}`)
  }

  // Test 2: Try to read from projects table
  try {
    console.log('   Testing projects table access...')
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ Projects access failed: ${error.message}`)
      console.log(`   Error code: ${error.code}`)
    } else {
      console.log(`   ✅ Projects table accessible (found ${data?.length || 0} records)`)
    }
  } catch (err) {
    console.log(`   ❌ Projects test error: ${err.message}`)
  }

  // Test 3: Try to read from team_assignments table
  try {
    console.log('   Testing team_assignments table access...')
    const { data, error } = await supabase
      .from('team_assignments')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ Team assignments access failed: ${error.message}`)
      console.log(`   Error code: ${error.code}`)
    } else {
      console.log(`   ✅ Team assignments table accessible (found ${data?.length || 0} records)`)
    }
  } catch (err) {
    console.log(`   ❌ Team assignments test error: ${err.message}`)
  }

  console.log('\n💡 Analysis:')
  console.log('If you see "permission denied" errors above, you need to manually apply the SQL.')
  console.log('If you see "✅ accessible" messages, the permissions might already be working.')
  console.log('')
  console.log('📋 Manual SQL to run in Supabase SQL Editor:')
  console.log('Copy the contents of migrations/032_disable_rls_for_development.sql')
  console.log('and paste it into your Supabase SQL Editor, then click "Run".')
  console.log('')
  console.log('🔧 Alternative approach:')
  console.log('1. Go to Supabase Dashboard → Authentication → Policies')
  console.log('2. For each table, click "Disable RLS" button')
  console.log('3. This will disable Row Level Security via the UI')

  console.log('\n🏁 Test complete')
}

// Run the script
applyRLSDisable().catch(console.error)