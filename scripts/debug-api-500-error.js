import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugAPI500Error() {
  console.log('🔍 Debugging API 500 Error')
  
  try {
    // Test the exact query that the API route is trying to execute
    console.log('\n1. Testing the exact API query...')
    
    const { data: timecards, error: fetchError } = await supabase
      .from('timecard_headers')
      .select(`
        id,
        user_id,
        project_id,
        status,
        period_start_date,
        period_end_date,
        total_hours,
        total_break_duration,
        total_pay,
        pay_rate,
        admin_notes,
        submitted_at,
        approved_at,
        approved_by,
        rejection_reason,
        created_at,
        updated_at,
        daily_entries:timecard_daily_entries(
          id,
          work_date,
          check_in_time,
          check_out_time,
          break_start_time,
          break_end_time,
          hours_worked,
          break_duration,
          daily_pay
        ),
        user_profile:profiles!user_id(full_name),
        project_info:projects!project_id(name)
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.log('❌ Query failed:', fetchError)
      console.log('   Message:', fetchError.message)
      console.log('   Code:', fetchError.code)
      console.log('   Details:', fetchError.details)
      console.log('   Hint:', fetchError.hint)
      
      // Try a simpler query to isolate the issue
      console.log('\n2. Testing simpler query...')
      const { data: simple, error: simpleError } = await supabase
        .from('timecard_headers')
        .select('id, user_id, status')
        .limit(1)
      
      if (simpleError) {
        console.log('❌ Even simple query failed:', simpleError)
      } else {
        console.log('✅ Simple query works:', simple)
        
        // Test the foreign key relationships one by one
        console.log('\n3. Testing foreign key relationships...')
        
        // Test profiles relationship
        const { data: withProfiles, error: profilesError } = await supabase
          .from('timecard_headers')
          .select(`
            id,
            user_id,
            user_profile:profiles!user_id(full_name)
          `)
          .limit(1)
        
        if (profilesError) {
          console.log('❌ Profiles relationship failed:', profilesError)
        } else {
          console.log('✅ Profiles relationship works:', withProfiles)
        }
        
        // Test projects relationship
        const { data: withProjects, error: projectsError } = await supabase
          .from('timecard_headers')
          .select(`
            id,
            project_id,
            project_info:projects!project_id(name)
          `)
          .limit(1)
        
        if (projectsError) {
          console.log('❌ Projects relationship failed:', projectsError)
        } else {
          console.log('✅ Projects relationship works:', withProjects)
        }
        
        // Test daily entries relationship
        const { data: withEntries, error: entriesError } = await supabase
          .from('timecard_headers')
          .select(`
            id,
            daily_entries:timecard_daily_entries(
              id,
              work_date,
              hours_worked
            )
          `)
          .limit(1)
        
        if (entriesError) {
          console.log('❌ Daily entries relationship failed:', entriesError)
        } else {
          console.log('✅ Daily entries relationship works:', withEntries)
        }
      }
      
      return
    }
    
    console.log('✅ Full query successful!')
    console.log('   Found', timecards?.length || 0, 'timecards')
    if (timecards && timecards.length > 0) {
      console.log('   Sample:', JSON.stringify(timecards[0], null, 2))
    }
    
    // Test the system_settings query
    console.log('\n4. Testing system_settings query...')
    const { data: globalSettingsArray, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
    
    if (settingsError) {
      console.log('❌ System settings query failed:', settingsError)
    } else {
      console.log('✅ System settings query works:', globalSettingsArray)
    }
    
    // Test profiles query
    console.log('\n5. Testing profiles query...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .limit(1)
    
    if (profileError) {
      console.log('❌ Profiles query failed:', profileError)
    } else {
      console.log('✅ Profiles query works:', profile)
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

debugAPI500Error().catch(console.error)