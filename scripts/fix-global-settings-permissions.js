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

async function fixGlobalSettingsPermissions() {
  try {
    console.log('🔧 Fixing global_settings table permissions...')
    
    // Grant permissions to authenticated role
    console.log('\n1️⃣ Granting permissions to authenticated role...')
    const { error: authError } = await supabase.rpc('exec', {
      sql: 'GRANT SELECT, UPDATE ON global_settings TO authenticated;'
    })
    
    if (authError) {
      console.log('   ⚠️  Authenticated grant failed (may already exist):', authError.message)
    } else {
      console.log('   ✅ Authenticated permissions granted')
    }
    
    // Grant permissions to anon role
    console.log('2️⃣ Granting permissions to anon role...')
    const { error: anonError } = await supabase.rpc('exec', {
      sql: 'GRANT SELECT, UPDATE ON global_settings TO anon;'
    })
    
    if (anonError) {
      console.log('   ⚠️  Anon grant failed (may already exist):', anonError.message)
    } else {
      console.log('   ✅ Anon permissions granted')
    }
    
    // Test access with anon key
    console.log('\n3️⃣ Testing access with anon key...')
    const anonSupabase = createClient(
      supabaseUrl, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: testData, error: testError } = await anonSupabase
      .from('global_settings')
      .select('id, default_escort_break_minutes, default_staff_break_minutes')
      .single()
    
    if (testError) {
      console.error('❌ Test access failed:', testError)
      
      // Try alternative approach - make table publicly readable
      console.log('\n4️⃣ Trying alternative approach - public access...')
      const { error: publicError } = await supabase.rpc('exec', {
        sql: 'GRANT SELECT, UPDATE ON global_settings TO public;'
      })
      
      if (publicError) {
        console.error('   ❌ Public grant failed:', publicError)
      } else {
        console.log('   ✅ Public permissions granted')
        
        // Test again
        const { data: retestData, error: retestError } = await anonSupabase
          .from('global_settings')
          .select('id, default_escort_break_minutes')
          .single()
        
        if (retestError) {
          console.error('   ❌ Retest failed:', retestError)
        } else {
          console.log('   ✅ Public access working!')
        }
      }
    } else {
      console.log('✅ Test access successful')
      console.log('   Settings found:', {
        id: testData.id,
        escort_break: testData.default_escort_break_minutes,
        staff_break: testData.default_staff_break_minutes
      })
    }
    
    console.log('\n🎉 Permission fix completed!')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

fixGlobalSettingsPermissions()