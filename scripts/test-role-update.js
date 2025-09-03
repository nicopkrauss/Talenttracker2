#!/usr/bin/env node

/**
 * Test script to verify we can update existing profiles with new roles
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
  'coordinator',
  'talent_escort'
]

async function testRoleUpdate() {
  console.log('🧪 Testing role updates on existing profiles...\n')

  // Get a profile with null role
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .is('role', null)
    .limit(1)
  
  if (fetchError || !profiles || profiles.length === 0) {
    console.log('❌ No profiles with null role found to test with')
    return
  }
  
  const testProfile = profiles[0]
  console.log(`Using test profile: ${testProfile.full_name} (${testProfile.email})`)
  console.log(`Current role: ${testProfile.role}\n`)

  for (const role of testRoles) {
    try {
      console.log(`Testing role update to: ${role}`)
      
      // Try to update the profile with this role
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', testProfile.id)
        .select('role')
      
      if (error) {
        console.log(`❌ ${role}: Failed to update - ${error.message}`)
      } else {
        console.log(`✅ ${role}: Successfully updated to ${data[0].role}`)
      }
      
    } catch (error) {
      console.log(`❌ ${role}: Test error - ${error.message}`)
    }
  }
  
  // Reset to null
  console.log('\nResetting role to null...')
  await supabase
    .from('profiles')
    .update({ role: null })
    .eq('id', testProfile.id)
  console.log('✅ Reset complete')
}

async function checkRoleConstraints() {
  console.log('\n🔍 Checking role enum constraints...\n')
  
  try {
    // Try to insert an invalid role to see the constraint error
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `test-invalid-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true
    })
    
    if (authError) {
      console.log('❌ Could not create test user for constraint check')
      return
    }
    
    // Try to update with invalid role
    const { error: invalidError } = await supabase
      .from('profiles')
      .update({ role: 'invalid_role' })
      .eq('id', authData.user.id)
    
    if (invalidError) {
      console.log('✅ Role constraint working - invalid role rejected:')
      console.log(`   ${invalidError.message}`)
    } else {
      console.log('❌ Role constraint not working - invalid role accepted')
    }
    
    // Clean up
    await supabase.auth.admin.deleteUser(authData.user.id)
    
  } catch (error) {
    console.log('❌ Constraint check error:', error.message)
  }
}

async function main() {
  console.log('🚀 Role Update Test Suite\n')
  
  await testRoleUpdate()
  await checkRoleConstraints()
  
  console.log('\n✨ Test complete!')
}

main().catch(console.error)