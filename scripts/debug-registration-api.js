#!/usr/bin/env node

/**
 * Debug Registration API
 * This script tests the registration API directly to see what's happening
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

async function debugRegistration() {
  console.log('🔍 Debug Registration System')
  console.log('============================\n')

  // Step 1: Check if trigger exists
  console.log('1. Checking if registration trigger exists...')
  try {
    const { data: functions, error: funcError } = await supabase.rpc('exec', {
      sql: `
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE proname = 'handle_new_user';
      `
    })
    
    if (funcError) {
      console.log('   ⚠️  Cannot check functions via RPC (expected)')
    } else if (functions && functions.length > 0) {
      console.log('   ✅ handle_new_user function exists')
    } else {
      console.log('   ❌ handle_new_user function NOT found')
    }
  } catch (error) {
    console.log('   ⚠️  Cannot check functions:', error.message)
  }

  // Step 2: Test profile creation directly
  console.log('\n2. Testing direct profile creation...')
  const testUserId = 'test-user-' + Date.now()
  
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        full_name: 'Test User',
        email: 'test@example.com',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.log('   ❌ Profile creation failed:', profileError.message)
      console.log('   Error details:', JSON.stringify(profileError, null, 2))
    } else {
      console.log('   ✅ Profile creation successful')
      
      // Clean up test profile
      await supabase.from('profiles').delete().eq('id', testUserId)
      console.log('   🧹 Test profile cleaned up')
    }
  } catch (error) {
    console.log('   ❌ Profile creation error:', error.message)
  }

  // Step 3: Check profiles table structure
  console.log('\n3. Checking profiles table structure...')
  try {
    const { data: columns, error: colError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (colError) {
      console.log('   ❌ Cannot access profiles table:', colError.message)
    } else {
      console.log('   ✅ Profiles table accessible')
      if (columns && columns.length > 0) {
        console.log('   📋 Sample profile structure:', Object.keys(columns[0]))
      }
    }
  } catch (error) {
    console.log('   ❌ Table access error:', error.message)
  }

  // Step 4: Test the actual registration API
  console.log('\n4. Testing registration API endpoint...')
  const testEmail = `test-${Date.now()}@example.com`
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'talent_escort',
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        password: 'TestPassword123!',
        phone: '(555) 123-4567',
        nearestMajorCity: 'New York, NY',
        willingToFly: false,
        agreeToTerms: true
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.log('   ❌ Registration API failed:', response.status)
      console.log('   Error:', result.error)
      console.log('   Details:', result.details)
    } else {
      console.log('   ✅ Registration API successful')
      console.log('   Result:', result.message)
      
      // Clean up test user
      try {
        const { data: users } = await supabase.auth.admin.listUsers()
        const testUser = users.users.find(u => u.email === testEmail)
        if (testUser) {
          await supabase.auth.admin.deleteUser(testUser.id)
          await supabase.from('profiles').delete().eq('id', testUser.id)
          console.log('   🧹 Test user cleaned up')
        }
      } catch (cleanupError) {
        console.log('   ⚠️  Cleanup error:', cleanupError.message)
      }
    }
  } catch (error) {
    console.log('   ❌ API test error:', error.message)
  }

  console.log('\n🏁 Debug complete')
}

debugRegistration().catch(console.error)