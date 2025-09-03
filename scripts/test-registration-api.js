#!/usr/bin/env node

/**
 * Test script to verify the registration API works with all roles
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

// Import the registration logic (simulate the API)
const { registrationSchema } = require('../lib/types')

const testRoles = [
  'in_house',
  'supervisor', 
  'coordinator',
  'talent_escort'
]

async function simulateRegistration(role) {
  const testData = {
    role: role,
    firstName: 'Test',
    lastName: 'User',
    email: `test-${role}-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phone: '555-0123',
    nearestMajorCity: 'New York, NY',
    willingToFly: role !== 'talent_escort', // Escorts don't get flights
    agreeToTerms: true
  }
  
  try {
    // Validate the data (same as API does)
    const validatedData = registrationSchema.parse(testData)
    console.log(`✅ ${role}: Data validation passed`)
    
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      email_confirm: true,
      user_metadata: {
        full_name: `${validatedData.firstName} ${validatedData.lastName}`,
        registration_role: validatedData.role
      }
    })

    if (authError) {
      console.log(`❌ ${role}: Auth user creation failed - ${authError.message}`)
      return false
    }

    console.log(`✅ ${role}: Auth user created`)

    // Create the user profile with registration data
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: `${validatedData.firstName} ${validatedData.lastName}`,
        email: validatedData.email,
        phone: validatedData.phone,
        role: validatedData.role, // Use the existing role field
        nearest_major_city: validatedData.nearestMajorCity,
        willing_to_fly: validatedData.willingToFly || false,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.log(`❌ ${role}: Profile creation failed - ${profileError.message}`)
      
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return false
    }

    console.log(`✅ ${role}: Profile created successfully`)
    
    // Verify the profile was created correctly
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('role, status, nearest_major_city, willing_to_fly')
      .eq('id', authData.user.id)
      .single()
    
    if (fetchError) {
      console.log(`❌ ${role}: Could not verify profile - ${fetchError.message}`)
    } else {
      console.log(`   Profile role: ${profile.role}`)
      console.log(`   Status: ${profile.status}`)
      console.log(`   City: ${profile.nearest_major_city}`)
      console.log(`   Willing to fly: ${profile.willing_to_fly}`)
    }
    
    // Clean up test user
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.log(`   Cleaned up test user`)
    
    return true
    
  } catch (error) {
    console.log(`❌ ${role}: Registration simulation failed - ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Registration API Simulation Test\n')
  
  let successCount = 0
  
  for (const role of testRoles) {
    console.log(`\n📝 Testing registration for role: ${role}`)
    console.log('─'.repeat(50))
    
    const success = await simulateRegistration(role)
    if (success) {
      successCount++
    }
  }
  
  console.log('\n' + '═'.repeat(50))
  console.log(`✨ Test Results: ${successCount}/${testRoles.length} roles passed`)
  
  if (successCount === testRoles.length) {
    console.log('🎉 All role registrations working correctly!')
  } else {
    console.log('⚠️  Some role registrations failed - check errors above')
  }
}

main().catch(console.error)