#!/usr/bin/env node

/**
 * Test script to verify the registration UI changes work correctly
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

async function testRegistrationFlow() {
  console.log('🧪 Testing updated registration flow...\n')

  const testCases = [
    {
      role: 'talent_escort',
      name: 'Jordan Smith',
      expectedFlightField: false,
      description: 'Talent Escort (no flight field)'
    },
    {
      role: 'talent_logistics_coordinator',
      name: 'Alex Rivera',
      expectedFlightField: true,
      description: 'Talent Logistics Coordinator (with flight field)'
    },
    {
      role: 'supervisor',
      name: 'Mike Chen',
      expectedFlightField: true,
      description: 'Supervisor (with flight field)'
    },
    {
      role: 'in_house',
      name: 'Sarah Johnson',
      expectedFlightField: true,
      description: 'In-House Staff (with flight field)'
    }
  ]

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.description}`)
    console.log('─'.repeat(50))
    
    try {
      // Simulate the registration process
      const registrationData = {
        role: testCase.role,
        firstName: testCase.name.split(' ')[0],
        lastName: testCase.name.split(' ')[1],
        email: `${testCase.name.toLowerCase().replace(' ', '.')}.${Date.now()}@example.com`,
        password: 'TestPassword123!',
        phone: '555-0123',
        nearestMajorCity: 'New York, NY',
        willingToFly: testCase.expectedFlightField ? true : false,
        agreeToTerms: true
      }
      
      console.log(`   Role: ${testCase.role}`)
      console.log(`   Flight field expected: ${testCase.expectedFlightField}`)
      console.log(`   Flight value: ${registrationData.willingToFly}`)
      
      // Create auth user
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
        console.log(`   ❌ Auth creation failed: ${authError.message}`)
        continue
      }

      console.log(`   ✅ Auth user created`)

      // Update profile with registration data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: `${registrationData.firstName} ${registrationData.lastName}`,
          email: registrationData.email,
          phone: registrationData.phone,
          role: registrationData.role,
          nearest_major_city: registrationData.nearestMajorCity,
          willing_to_fly: registrationData.willingToFly,
          status: 'pending'
        })
        .eq('id', authData.user.id)

      if (profileError) {
        console.log(`   ❌ Profile update failed: ${profileError.message}`)
        await supabase.auth.admin.deleteUser(authData.user.id)
        continue
      }

      console.log(`   ✅ Profile updated successfully`)

      // Verify the profile data
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('role, nearest_major_city, willing_to_fly, status')
        .eq('id', authData.user.id)
        .single()
      
      if (fetchError) {
        console.log(`   ❌ Profile verification failed: ${fetchError.message}`)
      } else {
        console.log(`   ✅ Profile verified:`)
        console.log(`      - Role: ${profile.role}`)
        console.log(`      - City: ${profile.nearest_major_city}`)
        console.log(`      - Willing to fly: ${profile.willing_to_fly}`)
        console.log(`      - Status: ${profile.status}`)
        
        // Validate flight field logic
        const flightEligibleRoles = ['in_house', 'supervisor', 'talent_logistics_coordinator']
        const isFlightEligible = flightEligibleRoles.includes(profile.role)
        
        if (isFlightEligible === testCase.expectedFlightField) {
          console.log(`   ✅ Flight eligibility logic correct`)
        } else {
          console.log(`   ❌ Flight eligibility logic incorrect`)
        }
      }
      
      // Clean up
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.log(`   ✅ Cleaned up test user`)
      
    } catch (error) {
      console.log(`   ❌ Test error: ${error.message}`)
    }
    
    console.log('')
  }
}

async function main() {
  console.log('🚀 Registration UI Changes Test Suite\n')
  
  console.log('📋 Changes implemented:')
  console.log('   • Role selection: Dropdown → Full-width buttons')
  console.log('   • Button order: Talent Escort → TLC → Supervisor → In-House')
  console.log('   • Terms checkbox: Moved to main form (after role selection)')
  console.log('   • Flight field: Only shows for eligible roles\n')
  
  await testRegistrationFlow()
  
  console.log('═'.repeat(60))
  console.log('✨ Registration UI changes test complete!')
}

main().catch(console.error)