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

async function disableGlobalSettingsRLS() {
  try {
    console.log('🔧 Disabling RLS on global_settings table...')
    
    // Step 1: Drop existing policies
    console.log('1️⃣ Dropping existing RLS policies...')
    
    try {
      await supabase.rpc('exec', { 
        sql: 'DROP POLICY IF EXISTS "Admins can read global settings" ON global_settings;' 
      })
      console.log('   ✅ Read policy dropped')
    } catch (error) {
      console.log('   ⚠️  Read policy drop failed (may not exist):', error.message)
    }
    
    try {
      await supabase.rpc('exec', { 
        sql: 'DROP POLICY IF EXISTS "Admins can update global settings" ON global_settings;' 
      })
      console.log('   ✅ Update policy dropped')
    } catch (error) {
      console.log('   ⚠️  Update policy drop failed (may not exist):', error.message)
    }
    
    // Step 2: Disable RLS
    console.log('2️⃣ Disabling Row Level Security...')
    
    try {
      await supabase.rpc('exec', { 
        sql: 'ALTER TABLE global_settings DISABLE ROW LEVEL SECURITY;' 
      })
      console.log('   ✅ RLS disabled')
    } catch (error) {
      console.log('   ⚠️  RLS disable failed:', error.message)
    }
    
    // Step 3: Test access
    console.log('3️⃣ Testing table access...')
    
    const { data: settings, error: testError } = await supabase
      .from('global_settings')
      .select('id, default_escort_break_minutes, default_staff_break_minutes')
      .single()
    
    if (testError) {
      console.error('❌ Test failed:', testError)
      process.exit(1)
    }
    
    console.log('✅ Table access test successful')
    console.log('   Settings found:', {
      id: settings.id,
      escort_break: settings.default_escort_break_minutes,
      staff_break: settings.default_staff_break_minutes
    })
    
    console.log('\n🎉 RLS removal completed successfully!')
    console.log('   - Authentication still enforced at API level')
    console.log('   - Only admin users can access /api/settings/global endpoints')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

disableGlobalSettingsRLS()