import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixNewTablePermissions() {
  console.log('🔧 Fixing Permissions for New Timecard Tables')
  
  try {
    // Disable RLS and grant permissions for the new tables
    const commands = [
      // Disable RLS on new tables
      'ALTER TABLE timecard_headers DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE timecard_daily_entries DISABLE ROW LEVEL SECURITY;',
      
      // Grant permissions to authenticated users
      'GRANT ALL ON timecard_headers TO authenticated;',
      'GRANT ALL ON timecard_daily_entries TO authenticated;',
      
      // Grant permissions to anon users (for API access)
      'GRANT ALL ON timecard_headers TO anon;',
      'GRANT ALL ON timecard_daily_entries TO anon;',
      
      // Grant permissions to service_role
      'GRANT ALL ON timecard_headers TO service_role;',
      'GRANT ALL ON timecard_daily_entries TO service_role;',
      
      // Grant sequence permissions
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;',
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;',
      'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;'
    ]
    
    console.log('\n📋 Executing permission commands...')
    
    for (const command of commands) {
      try {
        const { error } = await supabase.rpc('exec', { sql: command })
        if (error) {
          console.log(`   ⚠️  ${command}`)
          console.log(`      Error: ${error.message}`)
        } else {
          console.log(`   ✅ ${command}`)
        }
      } catch (err) {
        console.log(`   ⚠️  ${command}`)
        console.log(`      Error: ${err.message}`)
      }
    }
    
    // Test access after permission changes
    console.log('\n🔍 Testing access after permission changes...')
    
    const { data: testData, error: testError } = await supabase
      .from('timecard_headers')
      .select('id, user_id, status')
      .limit(1)
    
    if (testError) {
      console.error('❌ Still cannot access timecard_headers:', testError.message)
      
      console.log('\n📝 Manual SQL to run in Supabase SQL Editor:')
      commands.forEach(cmd => console.log(`   ${cmd}`))
      
    } else {
      console.log('✅ Access successful! Permissions fixed.')
      console.log('   Found data:', testData)
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

fixNewTablePermissions().catch(console.error)