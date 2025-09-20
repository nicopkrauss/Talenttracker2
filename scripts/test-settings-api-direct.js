const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSettingsAPI() {
  try {
    console.log('🧪 Testing Global Settings API directly...')
    
    // Test 1: Direct table access with service role
    console.log('\n1️⃣ Testing direct table access with service role...')
    const { data: directData, error: directError } = await supabase
      .from('global_settings')
      .select('*')
      .single()
    
    if (directError) {
      console.error('❌ Direct access failed:', directError)
    } else {
      console.log('✅ Direct access successful')
      console.log('   Settings ID:', directData.id)
      console.log('   Escort break:', directData.default_escort_break_minutes)
      console.log('   Staff break:', directData.default_staff_break_minutes)
    }
    
    // Test 2: Test with anon key (what the API uses)
    console.log('\n2️⃣ Testing with anon key (API simulation)...')
    const anonSupabase = createClient(
      supabaseUrl, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: anonData, error: anonError } = await anonSupabase
      .from('global_settings')
      .select('*')
      .single()
    
    if (anonError) {
      console.error('❌ Anon access failed:', anonError)
      console.log('   This might be the issue - anon role needs permissions')
    } else {
      console.log('✅ Anon access successful')
      console.log('   Settings found with anon key')
    }
    
    // Test 3: Check table permissions
    console.log('\n3️⃣ Checking table permissions...')
    const { data: permissions, error: permError } = await supabase
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_name', 'global_settings')
    
    if (permError) {
      console.error('❌ Permission check failed:', permError)
    } else {
      console.log('✅ Current permissions:')
      permissions.forEach(perm => {
        console.log(`   ${perm.grantee}: ${perm.privilege_type}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testSettingsAPI()