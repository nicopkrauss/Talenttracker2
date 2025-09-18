#!/usr/bin/env node

/**
 * Debug Login Issue
 * This script checks the user profile status and helps debug login issues
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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugLogin() {
  console.log('🔍 Debug Login Issue')
  console.log('====================\n')

  // Step 1: Check recent user registrations
  console.log('1. Checking recent user registrations...')
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (profilesError) {
      console.log('   ❌ Cannot access profiles:', profilesError.message)
    } else {
      console.log(`   ✅ Found ${profiles.length} recent profiles:`)
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.full_name} (${profile.email})`)
        console.log(`      Status: ${profile.status}`)
        console.log(`      Role: ${profile.role}`)
        console.log(`      Created: ${new Date(profile.created_at).toLocaleString()}`)
        console.log('')
      })
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message)
  }

  // Step 2: Check auth users
  console.log('2. Checking auth users...')
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('   ❌ Cannot access auth users:', authError.message)
    } else {
      console.log(`   ✅ Found ${authData.users.length} auth users`)
      
      // Show recent users
      const recentUsers = authData.users
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
      
      recentUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`)
        console.log(`      ID: ${user.id}`)
        console.log(`      Created: ${new Date(user.created_at).toLocaleString()}`)
        console.log(`      Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
        console.log('')
      })
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message)
  }

  // Step 3: Check for pending users that need approval
  console.log('3. Checking pending users...')
  try {
    const { data: pendingUsers, error: pendingError } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (pendingError) {
      console.log('   ❌ Cannot check pending users:', pendingError.message)
    } else {
      console.log(`   📋 Found ${pendingUsers.length} pending users:`)
      
      if (pendingUsers.length === 0) {
        console.log('   ✅ No users waiting for approval')
      } else {
        pendingUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.full_name} (${user.email})`)
          console.log(`      Role: ${user.role}`)
          console.log(`      Registered: ${new Date(user.created_at).toLocaleString()}`)
          console.log('')
        })
        
        console.log('   💡 These users need admin approval before they can log in.')
        console.log('   💡 You can approve them using the admin interface or manually update their status.')
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message)
  }

  // Step 4: Provide solution
  console.log('4. Solution for login issues...')
  console.log('')
  console.log('🔧 If you want to approve a user manually, run this SQL in Supabase:')
  console.log('')
  console.log('```sql')
  console.log('-- Replace \'user@example.com\' with the actual email address')
  console.log('UPDATE profiles ')
  console.log('SET status = \'active\', updated_at = NOW() ')
  console.log('WHERE email = \'user@example.com\';')
  console.log('```')
  console.log('')
  console.log('🔧 Or approve all pending users:')
  console.log('')
  console.log('```sql')
  console.log('UPDATE profiles ')
  console.log('SET status = \'active\', updated_at = NOW() ')
  console.log('WHERE status = \'pending\';')
  console.log('```')
  console.log('')
  console.log('✅ After approval, users should be able to log in successfully.')

  console.log('\n🏁 Debug complete')
}

debugLogin().catch(console.error)