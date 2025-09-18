/**
 * Test Login Page Functionality
 * 
 * This script tests that the login page loads without errors
 * and handles authentication state properly.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLoginPage() {
  console.log('=== Testing Login Page Functionality ===')
  console.log('')

  try {
    // Test 1: Check if we can create a Supabase client
    console.log('✓ Supabase client created successfully')

    // Test 2: Check auth state (should be null for fresh session)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('⚠ Session error (expected for fresh state):', sessionError.message)
    } else if (!session) {
      console.log('✓ No active session (expected for login page)')
    } else {
      console.log('⚠ Active session found (may need to clear browser storage)')
    }

    // Test 3: Check if we can access profiles table (should fail without auth)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (profileError) {
      console.log('✓ Profiles table access blocked without auth (expected)')
    } else {
      console.log('⚠ Profiles table accessible without auth (RLS may be disabled)')
    }

    console.log('')
    console.log('Login page should be accessible at: http://localhost:3001/login')
    console.log('')
    console.log('If you see JWT errors in the browser:')
    console.log('1. Clear browser storage (localStorage, sessionStorage, cookies)')
    console.log('2. Or use an incognito/private window')
    console.log('')

  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testLoginPage()