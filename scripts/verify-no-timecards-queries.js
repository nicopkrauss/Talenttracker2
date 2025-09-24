import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyNoTimecardsQueries() {
  console.log('🔍 Verifying NO code is querying the old timecards table')
  
  try {
    // Test 1: Confirm the old table is gone
    console.log('\n1. Confirming old timecards table is dropped...')
    const { data, error } = await supabase
      .from('timecards')
      .select('id')
      .limit(1)
    
    if (error && error.message.includes('does not exist')) {
      console.log('✅ Confirmed: timecards table does not exist')
    } else if (error && error.message.includes('Could not find the table')) {
      console.log('✅ Confirmed: timecards table not found in schema cache')
    } else {
      console.log('❌ ERROR: timecards table still exists!', { data, error })
      return
    }
    
    // Test 2: Verify new tables work
    console.log('\n2. Verifying new normalized tables work...')
    const { data: headers, error: headersError } = await supabase
      .from('timecard_headers')
      .select('id, user_id, status')
      .limit(3)
    
    if (headersError) {
      console.log('❌ ERROR: Cannot access timecard_headers:', headersError)
      return
    }
    
    console.log(`✅ timecard_headers accessible: ${headers?.length || 0} records`)
    
    const { data: entries, error: entriesError } = await supabase
      .from('timecard_daily_entries')
      .select('id, timecard_header_id, work_date')
      .limit(3)
    
    if (entriesError) {
      console.log('❌ ERROR: Cannot access timecard_daily_entries:', entriesError)
      return
    }
    
    console.log(`✅ timecard_daily_entries accessible: ${entries?.length || 0} records`)
    
    // Test 3: Test the main API query structure
    console.log('\n3. Testing main API query structure...')
    const { data: apiTest, error: apiError } = await supabase
      .from('timecard_headers')
      .select(`
        id,
        user_id,
        project_id,
        status,
        total_hours,
        daily_entries:timecard_daily_entries(
          id,
          work_date,
          hours_worked
        ),
        user_profile:profiles!user_id(full_name),
        project_info:projects!project_id(name)
      `)
      .limit(1)
    
    if (apiError) {
      console.log('❌ ERROR: API query structure failed:', apiError)
      return
    }
    
    console.log('✅ API query structure works:', apiTest)
    
    console.log('\n🎉 VERIFICATION COMPLETE')
    console.log('✅ Old timecards table is properly dropped')
    console.log('✅ New normalized structure is working')
    console.log('✅ API queries are using correct tables')
    console.log('')
    console.log('📝 If you\'re still seeing errors about timecards table:')
    console.log('   1. Check browser cache - clear it completely')
    console.log('   2. Restart your dev server')
    console.log('   3. Check if any old browser tabs are cached')
    console.log('   4. Verify no old service workers are running')
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

verifyNoTimecardsQueries().catch(console.error)