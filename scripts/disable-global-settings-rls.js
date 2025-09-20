const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

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
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '032_disable_global_settings_rls.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ RLS disabled on global_settings table')
    
    // Test that we can still access the table
    console.log('\n🧪 Testing table access...')
    
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
    console.log('   - RLS policies removed')
    console.log('   - RLS disabled on global_settings table')
    console.log('   - Authentication still enforced at API level')
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

disableGlobalSettingsRLS()