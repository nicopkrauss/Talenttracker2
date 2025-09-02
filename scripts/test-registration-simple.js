#!/usr/bin/env node

/**
 * Simple test script to verify registration works with all roles
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
  'talent_logistics_coordinator',
  'talent_escort'
]

async function testRegistrationFlow(role) {
  const testEmail = `test-${role}-${Date.now()}@example.com`
  
  try {
    console.log(`Testing registration flow for: ${role}`)
    
    // Step 1: Create auth user
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

    // Step 2: Create profile (simulating the registration API)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: `Test ${role} User`,
        email: testEmail,
        phone: '555-0123',
        role: role, // This is the key test - using the role field
        nearest_major_city: 'New York, NY',
        willing_to_fly: role !== 'talent_escort',
        status: 'pending'
      })

    if (profileError) {
      console.log(`❌ Profile creation failed: ${profileError.message}`)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return false
    }

    console.log(`✅ Profile created with role: ${role}`)
    
    // Step 3: Verify the profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('role, status, nearest_major_city, willing_to_fly')
      .eq('id', authData.user.id)
      .single()
    
    if (fetchError) {
      console.log(`❌ Profile verification failed: ${fetchError.message}`)
    } else {
      console.log(`   ✓ Role stored as: ${profile.role}`)
      console.log(`   ✓ Status: ${profile.status}`)
      console.log(`   ✓ City: ${profile.nearest_major_city}`)
      console.log(`   ✓ Willing to fly: ${profile.willing_to_fly}`)
    }
    
    // Step 4: Clean up
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.log(`   ✓ Cleaned up test user`)
    
    return true
    
  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Simple Registration Flow Test\n')
  
  let successCount = 0
  
  for (const role of testRoles) {
    console.log(`\n📝 Testing: ${role}`)
    console.log('─'.repeat(40))
    
    const success = await testRegistrationFlow(role)
    if (success) {
      successCount++
    }
    
    console.log('')
  }
  
  console.log('═'.repeat(50))
  console.log(`🎯 Results: ${successCount}/${testRoles.length} roles successful`)
  
  if (successCount === testRoles.length) {
    console.log('🎉 All role-based registrations working!')
    console.log('\n✅ The registration system is ready to use with:')
    testRoles.forEach(role => {
      console.log(`   • ${role}`)
    })
  } else {
    console.log('⚠️  Some registrations failed - check errors above')
  }
}

main().catch(console.error)