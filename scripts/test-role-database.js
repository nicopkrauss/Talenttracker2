#!/usr/bin/env node

/**
 * Test script to verify the database supports all system roles
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const testRoles = [
  'admin',
  'in_house',
  'supervisor', 
  'talent_logistics_coordinator',
  'talent_escort'
]

async function testRoleInsertion() {
  console.log('🧪 Testing role insertion into profiles table...\n')

  for (const role of testRoles) {
    try {
      console.log(`Testing role: ${role}`)
      
      // Create a test auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: `test-${role}-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        email_confirm: true
      })
      
      if (authError) {
        console.log(`❌ ${role}: Failed to create auth user - ${authError.message}`)
        continue
      }
      
      // Try to insert a test profile with this role
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: `Test ${role} User`,
          email: authData.user.email,
          role: role,
          status: 'pending'
        })
        .select()
      
      if (error) {
        console.log(`❌ ${role}: Failed to insert profile - ${error.message}`)
      } else {
        console.log(`✅ ${role}: Successfully inserted profile`)
      }
      
      // Clean up test user (this will cascade delete the profile)
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.log(`   Cleaned up test user`)
      
    } catch (error) {
      console.log(`❌ ${role}: Test error - ${error.message}`)
    }
    
    console.log('')
  }
}

async function checkExistingProfiles() {
  console.log('📊 Checking existing profiles and their roles...\n')
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.log('❌ Could not fetch profiles:', error.message)
    } else {
      console.log(`Found ${profiles.length} profiles:`)
      profiles.forEach(profile => {
        console.log(`  - ${profile.full_name} (${profile.email}): ${profile.role} [${profile.status}]`)
      })
    }
  } catch (error) {
    console.log('❌ Profile check error:', error.message)
  }
  
  console.log('')
}

async function main() {
  console.log('🚀 Database Role Test Suite\n')
  
  await checkExistingProfiles()
  await testRoleInsertion()
  
  console.log('✨ Test complete!')
}

main().catch(console.error)