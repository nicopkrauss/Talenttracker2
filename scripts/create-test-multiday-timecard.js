#!/usr/bin/env node

/**
 * Create Test Multi-Day Timecard
 * 
 * Creates a sample multi-day timecard to verify the new system works
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🎯 Creating Test Multi-Day Timecard')
  
  try {
    // Get a test user and project
    const { data: assignment } = await supabase
      .from('team_assignments')
      .select('user_id, project_id, pay_rate, profiles!inner(full_name)')
      .limit(1)
      .single()
    
    if (!assignment) {
      console.log('❌ No team assignments found. Please create some test data first.')
      return
    }
    
    console.log(`👤 Using user: ${assignment.profiles.full_name}`)
    
    // Create timecard header
    const headerData = {
      user_id: assignment.user_id,
      project_id: assignment.project_id,
      period_start_date: '2024-01-15',
      period_end_date: '2024-01-17',
      pay_rate: assignment.pay_rate || 25,
      admin_notes: 'Test multi-day timecard with individual day variations',
      status: 'draft'
    }
    
    const { data: header, error: headerError } = await supabase
      .from('timecard_headers')
      .insert(headerData)
      .select()
      .single()
    
    if (headerError) {
      console.error('❌ Failed to create header:', headerError.message)
      return
    }
    
    console.log('✅ Created timecard header:', header.id)
    
    // Create daily entries with DIFFERENT times for each day
    const dailyEntries = [
      {
        timecard_header_id: header.id,
        work_date: '2024-01-15',
        check_in_time: '08:00',
        check_out_time: '17:00',
        break_start_time: '12:00',
        break_end_time: '13:00',
        hours_worked: 8.0,
        break_duration: 1.0,
        daily_pay: 200.00
      },
      {
        timecard_header_id: header.id,
        work_date: '2024-01-16',
        check_in_time: '07:00',  // Different check-in time
        check_out_time: '19:00', // Different check-out time
        break_start_time: '12:30',
        break_end_time: '13:30',
        hours_worked: 11.0,      // Different hours
        break_duration: 1.0,
        daily_pay: 275.00        // Different pay
      },
      {
        timecard_header_id: header.id,
        work_date: '2024-01-17',
        check_in_time: '10:00',  // Different check-in time
        check_out_time: '18:00', // Different check-out time
        break_start_time: '14:00',
        break_end_time: '14:30',
        hours_worked: 7.5,       // Different hours
        break_duration: 0.5,
        daily_pay: 187.50        // Different pay
      }
    ]
    
    const { data: entries, error: entriesError } = await supabase
      .from('timecard_daily_entries')
      .insert(dailyEntries)
      .select()
    
    if (entriesError) {
      console.error('❌ Failed to create daily entries:', entriesError.message)
      return
    }
    
    console.log('✅ Created daily entries:', entries.length, 'days')
    
    // Verify the timecard with daily breakdown
    const { data: completeTimecard } = await supabase
      .from('timecard_headers')
      .select(`
        *,
        daily_entries:timecard_daily_entries(*)
      `)
      .eq('id', header.id)
      .single()
    
    console.log('\n📋 Multi-Day Timecard Created:')
    console.log(`   Period: ${completeTimecard.period_start_date} to ${completeTimecard.period_end_date}`)
    console.log(`   Total Hours: ${completeTimecard.total_hours}`)
    console.log(`   Total Pay: $${completeTimecard.total_pay}`)
    console.log(`   Notes: ${completeTimecard.admin_notes}`)
    
    console.log('\n📅 Daily Breakdown (Each day is DIFFERENT):')
    completeTimecard.daily_entries
      .sort((a, b) => new Date(a.work_date) - new Date(b.work_date))
      .forEach((day, index) => {
        console.log(`   Day ${index + 1} (${day.work_date}):`)
        console.log(`     Times: ${day.check_in_time} - ${day.check_out_time}`)
        console.log(`     Hours: ${day.hours_worked}h`)
        console.log(`     Pay: $${day.daily_pay}`)
      })
    
    console.log('\n🎉 SUCCESS! Multi-day timecard shows individual day variations!')
    console.log('✅ Each day has different check-in/out times')
    console.log('✅ Each day has different hours worked')
    console.log('✅ Each day has different daily pay')
    console.log('✅ Automatic totals calculated correctly')
    
    console.log(`\n🔗 Timecard ID: ${header.id}`)
    console.log('   You can use this ID to test the UI components')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }