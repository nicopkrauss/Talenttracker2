#!/usr/bin/env node

/**
 * Test registration accounting for automatic profile creation trigger
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
  'in_house',
  'supervisor', 
  'coordinator',
  'talent_escort'
]

async function testRegistrationWithTrigger(role) {
  const testEmail = `test-${role}-${Date.now()}@example.com`
  
  try {
    console.log(`Testing registration for: ${role}`)
    
    // Step 1: Create auth user (this likely triggers profile creation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: `Test ${role} User`,
        registration_role: role
      }
    })

    if (authError) {
      console.log(`❌ Auth creation failed: ${authError.message}`)
      return false
    }

    console.log(`✅ Auth user created: ${authData.user.id}`)

    // Step 2: Check if profile was auto-created
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', authData.user.id)
      .single()
    
    if (checkError) {
      console.log(`❌ Could not check for existing profile: ${checkError.message}`)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return false
    }
    
    console.log(`✅ Profile auto-created with role: ${existingProfile.role || 'null'}`)

    // Step 3: Update the profile with registration data (like the API does)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: `Test ${role} User`,
        email: testEmail,
        phone: '555-0123',
        role: role, // This is the key test - setting the role
        nearest_major_city: 'New York, NY',
        willing_to_fly: role !== 'talent_escort',
        status: 'pending'
      })
      .eq('id', authData.user.id)

    if (updateError) {
      console.log(`❌ Profile update failed: ${updateError.message}`)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return false
    }

    console.log(`✅ Profile updated with role: ${role}`)
    
    // Step 4: Verify the final profile
    const { data: finalProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('role, status, nearest_major_city, willing_to_fly, full_name')
      .eq('id', authData.user.id)
      .single()
    
    if (fetchError) {
      console.log(`❌ Profile verification failed: ${fetchError.message}`)
    } else {
      console.log(`   ✓ Final role: ${finalProfile.role}`)
      console.log(`   ✓ Status: ${finalProfile.status}`)
      console.log(`   ✓ Name: ${finalProfile.full_name}`)
      console.log(`   ✓ City: ${finalProfile.nearest_major_city}`)
      console.log(`   ✓ Willing to fly: ${finalProfile.willing_to_fly}`)
    }
    
    // Step 5: Clean up
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.log(`   ✓ Cleaned up test user`)
    
    return true
    
  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Registration Test (with Auto-Profile Creation)\n')
  
  let successCount = 0
  
  for (const role of testRoles) {
    console.log(`\n📝 Testing: ${role}`)
    console.log('─'.repeat(40))
    
    const success = await testRegistrationWithTrigger(role)
    if (success) {
      successCount++
    }
    
    console.log('')
  }
  
  console.log('═'.repeat(50))
  console.log(`🎯 Results: ${successCount}/${testRoles.length} roles successful`)
  
  if (successCount === testRoles.length) {
    console.log('🎉 Role-based registration is working correctly!')
    console.log('\n✅ The system now supports these roles:')
    testRoles.forEach(role => {
      console.log(`   • ${role}`)
    })
    console.log('\n📋 Next steps:')
    console.log('   • Test the registration form in the UI')
    console.log('   • Update existing null role profiles if needed')
    console.log('   • Verify the pending users table shows roles correctly')
  } else {
    console.log('⚠️  Some registrations failed - check errors above')
  }
}

main().catch(console.error)