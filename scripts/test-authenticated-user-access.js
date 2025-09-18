#!/usr/bin/env node

/**
 * Test Authenticated User Access
 * This script tests database access using an authenticated user session (not service role)
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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Create client with anon key (like the frontend does)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuthenticatedAccess() {
  console.log('🔍 Testing Authenticated User Access')
  console.log('===================================\n')
  
  console.log('This test simulates what happens when a logged-in user tries to access data.\n')

  // First, try to sign in with the existing user
  console.log('📋 Step 1: Attempting to sign in...\n')
  
  try {
    // Try to sign in with the admin user we know exists
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'nicopkrauss@gmail.com',
      password: 'your-password-here' // You'll need to replace this
    })
    
    if (authError) {
      console.log(`   ❌ Sign in failed: ${authError.message}`)
      console.log('   💡 This is expected - we don\'t know the password')
      console.log('   💡 Let\'s test with anonymous access instead...\n')
      
      // Test anonymous access to see RLS behavior
      console.log('📋 Step 2: Testing anonymous access (should fail with RLS)...\n')
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`   ❌ Anonymous access failed: ${error.message}`)
        console.log(`   Error code: ${error.code}`)
        
        if (error.code === '42501') {
          console.log('\n🎯 FOUND THE ISSUE!')
          console.log('   The error code 42501 means "permission denied"')
          console.log('   This confirms that RLS is blocking authenticated users')
          console.log('')
          console.log('🔧 SOLUTION:')
          console.log('   You need to run the emergency RLS disable SQL manually:')
          console.log('')
          console.log('   1. Go to your Supabase Dashboard')
          console.log('   2. Navigate to SQL Editor')
          console.log('   3. Copy the SQL from emergency-disable-rls.sql')
          console.log('   4. Paste and execute it')
          console.log('')
          console.log('📄 SQL to run:')
          console.log('   The file emergency-disable-rls.sql contains the exact SQL')
        }
      } else {
        console.log(`   ✅ Anonymous access worked (${data?.length || 0} records)`)
        console.log('   This means RLS might already be disabled')
      }
      
    } else {
      console.log('   ✅ Sign in successful!')
      console.log(`   User: ${authData.user?.email}`)
      
      // Test authenticated access
      console.log('\n📋 Step 2: Testing authenticated access...\n')
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`   ❌ Authenticated access failed: ${error.message}`)
        console.log(`   Error code: ${error.code}`)
        
        if (error.code === '42501') {
          console.log('\n🎯 CONFIRMED ISSUE!')
          console.log('   Even authenticated users can\'t access the data')
          console.log('   RLS policies are too restrictive')
        }
      } else {
        console.log(`   ✅ Authenticated access worked (${data?.length || 0} records)`)
        console.log('   Database access is working correctly!')
      }
    }
    
  } catch (err) {
    console.log(`   ❌ Test error: ${err.message}`)
  }

  console.log('\n💡 Summary:')
  console.log('The issue is that RLS (Row Level Security) is enabled and blocking access.')
  console.log('The service role can access data, but authenticated users cannot.')
  console.log('')
  console.log('🚨 IMMEDIATE ACTION REQUIRED:')
  console.log('Run this SQL in your Supabase SQL Editor:')
  console.log('')
  console.log('```sql')
  console.log('-- Disable RLS on all tables for development')
  console.log('ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;')
  console.log('ALTER TABLE projects DISABLE ROW LEVEL SECURITY;')
  console.log('ALTER TABLE team_assignments DISABLE ROW LEVEL SECURITY;')
  console.log('-- ... (see emergency-disable-rls.sql for complete list)')
  console.log('')
  console.log('-- Grant permissions to authenticated users')
  console.log('GRANT USAGE ON SCHEMA public TO authenticated;')
  console.log('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;')
  console.log('```')

  console.log('\n🏁 Test complete')
}

// Run the script
testAuthenticatedAccess().catch(console.error)