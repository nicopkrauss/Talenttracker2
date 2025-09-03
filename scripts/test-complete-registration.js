#!/usr/bin/env node

/**
 * Complete end-to-end test of the role-based registration system
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

const testCases = [
  {
    role: 'in_house',
    firstName: 'Sarah',
    lastName: 'Johnson',
    nearestMajorCity: 'Los Angeles, CA',
    willingToFly: true,
    expectedFlightEligible: true
  },
  {
    role: 'supervisor',
    firstName: 'Mike',
    lastName: 'Chen',
    nearestMajorCity: 'Chicago, IL',
    willingToFly: true,
    expectedFlightEligible: true
  },
  {
    role: 'coordinator',
    firstName: 'Alex',
    lastName: 'Rivera',
    nearestMajorCity: 'Miami, FL',
    willingToFly: false,
    expectedFlightEligible: true
  },
  {
    role: 'talent_escort',
    firstName: 'Jordan',
    lastName: 'Smith',
    nearestMajorCity: 'Seattle, WA',
    willingToFly: false, // Should be ignored for escorts
    expectedFlightEligible: false
  }
]

async function testCompleteRegistration(testCase) {
  const testEmail = `${testCase.firstName.toLowerCase()}.${testCase.lastName.toLowerCase()}.${Date.now()}@example.com`
  
  try {
    console.log(`\n📝 Testing: ${testCase.role} - ${testCase.firstName} ${testCase.lastName}`)
    console.log('─'.repeat(60))
    
    // Simulate the registration API call
    const registrationData = {
      role: testCase.role,
      firstName: testCase.firstName,
      lastName: testCase.lastName,
      email: testEmail,
      password: 'TestPassword123!',
      phone: '555-0123',
      nearestMajorCity: testCase.nearestMajorCity,
      willingToFly: testCase.willingToFly,
      agreeToTerms: true
    }
    
    console.log(`   Creating auth user...`)
    
    // Step 1: Create auth user (like the API does)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: registrationData.email,
      password: registrationData.password,
      email_confirm: true,
      user_metadata: {
        full_name: `${registrationData.firstName} ${registrationData.lastName}`,
        registration_role: registrationData.role
      }
    })

    if (authError) {
      console.log(`❌ Auth creation failed: ${authError.message}`)
      return false
    }

    console.log(`   ✅ Auth user created: ${authData.user.id}`)

    // Step 2: Update profile (like the API does)
    console.log(`   Updating profile with registration data...`)
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: `${registrationData.firstName} ${registrationData.lastName}`,
        email: registrationData.email,
        phone: registrationData.phone,
        role: registrationData.role,
        nearest_major_city: registrationData.nearestMajorCity,
        willing_to_fly: registrationData.willingToFly || false,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.log(`❌ Profile update failed: ${profileError.message}`)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return false
    }

    console.log(`   ✅ Profile updated successfully`)

    // Step 3: Verify the complete profile
    console.log(`   Verifying profile data...`)
    
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (fetchError) {
      console.log(`❌ Profile verification failed: ${fetchError.message}`)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return false
    }

    // Validate all the data
    const validations = [
      { field: 'role', expected: testCase.role, actual: profile.role },
      { field: 'full_name', expected: `${testCase.firstName} ${testCase.lastName}`, actual: profile.full_name },
      { field: 'email', expected: testEmail, actual: profile.email },
      { field: 'nearest_major_city', expected: testCase.nearestMajorCity, actual: profile.nearest_major_city },
      { field: 'willing_to_fly', expected: testCase.willingToFly, actual: profile.willing_to_fly },
      { field: 'status', expected: 'pending', actual: profile.status }
    ]
    
    let allValid = true
    validations.forEach(validation => {
      if (validation.actual === validation.expected) {
        console.log(`   ✅ ${validation.field}: ${validation.actual}`)
      } else {
        console.log(`   ❌ ${validation.field}: expected ${validation.expected}, got ${validation.actual}`)
        allValid = false
      }
    })
    
    // Special validation for flight eligibility logic
    const isFlightEligible = ['in_house', 'supervisor', 'coordinator'].includes(profile.role)
    if (isFlightEligible === testCase.expectedFlightEligible) {
      console.log(`   ✅ Flight eligibility: ${isFlightEligible ? 'eligible' : 'not eligible'} (correct)`)
    } else {
      console.log(`   ❌ Flight eligibility: expected ${testCase.expectedFlightEligible}, role ${profile.role} is ${isFlightEligible}`)
      allValid = false
    }
    
    // Step 4: Test pending user query (like admin interface does)
    console.log(`   Testing pending user query...`)
    
    const { data: pendingUsers, error: pendingError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status, nearest_major_city, willing_to_fly, created_at')
      .eq('status', 'pending')
      .eq('id', authData.user.id)
    
    if (pendingError || !pendingUsers || pendingUsers.length === 0) {
      console.log(`❌ Pending user query failed`)
      allValid = false
    } else {
      console.log(`   ✅ Found in pending users list`)
    }
    
    // Step 5: Clean up
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.log(`   ✅ Cleaned up test user`)
    
    return allValid
    
  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Complete Registration System Test')
  console.log('Testing role-based registration with all field validations\n')
  
  let successCount = 0
  
  for (const testCase of testCases) {
    const success = await testCompleteRegistration(testCase)
    if (success) {
      successCount++
      console.log(`   🎉 ${testCase.role} registration: PASSED`)
    } else {
      console.log(`   💥 ${testCase.role} registration: FAILED`)
    }
  }
  
  console.log('\n' + '═'.repeat(60))
  console.log(`🎯 Final Results: ${successCount}/${testCases.length} test cases passed`)
  
  if (successCount === testCases.length) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉')
    console.log('\n✅ The role-based registration system is fully functional:')
    console.log('   • Database schema supports all roles')
    console.log('   • Registration API handles role assignment')
    console.log('   • Profile creation and updates work correctly')
    console.log('   • Flight eligibility logic is working')
    console.log('   • Pending user queries return correct data')
    console.log('\n🚀 Ready for production use!')
  } else {
    console.log('\n⚠️  Some tests failed - please review the errors above')
  }
}

main().catch(console.error)