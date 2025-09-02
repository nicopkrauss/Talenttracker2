#!/usr/bin/env node

/**
 * Test script to verify role-based registration works with all system roles
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

async function testRoleRegistration() {
  console.log('🧪 Testing role-based registration...\n')

  for (const role of testRoles) {
    const testEmail = `test-${role}-${Date.now()}@example.com`
    
    try {
      console.log(`Testing role: ${role}`)
      
      // Test registration API call
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: role,
          firstName: 'Test',
          lastName: 'User',
          email: testEmail,
          password: 'TestPassword123!',
          phone: '555-0123',
          nearestMajorCity: 'New York, NY',
          willingToFly: role !== 'talent_escort', // Escorts don't get flights
          agreeToTerms: true
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        console.log(`✅ ${role}: Registration successful`)
        
        // Verify the profile was created with correct role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, status, nearest_major_city, willing_to_fly')
          .eq('email', testEmail)
          .single()
        
        if (error) {
          console.log(`❌ ${role}: Failed to verify profile - ${error.message}`)
        } else {
          console.log(`   Profile role: ${profile.role}`)
          console.log(`   Status: ${profile.status}`)
          console.log(`   City: ${profile.nearest_major_city}`)
          console.log(`   Willing to fly: ${profile.willing_to_fly}`)
        }
        
        // Clean up test user
        const { data: authUser } = await supabase.auth.admin.listUsers()
        const testUser = authUser.users.find(u => u.email === testEmail)
        if (testUser) {
          await supabase.auth.admin.deleteUser(testUser.id)
          console.log(`   Cleaned up test user`)
        }
        
      } else {
        console.log(`❌ ${role}: Registration failed - ${result.error}`)
      }
      
    } catch (error) {
      console.log(`❌ ${role}: Test error - ${error.message}`)
    }
    
    console.log('')
  }
}

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n')
  
  try {
    // Check if all roles are supported in the enum
    const { data, error } = await supabase.rpc('get_enum_values', {
      enum_name: 'system_role'
    })
    
    if (error) {
      console.log('❌ Could not check enum values:', error.message)
    } else {
      console.log('✅ Available system roles:', data)
    }
  } catch (error) {
    console.log('❌ Schema check error:', error.message)
  }
  
  console.log('')
}

async function main() {
  console.log('🚀 Role Registration Test Suite\n')
  
  await checkDatabaseSchema()
  await testRoleRegistration()
  
  console.log('✨ Test complete!')
}

main().catch(console.error)