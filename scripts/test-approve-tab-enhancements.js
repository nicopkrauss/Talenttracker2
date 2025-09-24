#!/usr/bin/env node

/**
 * Test script for the enhanced approve tab functionality
 * 
 * This script tests:
 * 1. Multi-day timecard display in approve tab
 * 2. Admin notes display
 * 3. Enhanced time summary with averages
 * 4. Navigation between submitted timecards
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testApproveTabData() {
  console.log('🧪 Testing Approve Tab Enhanced Data...\n')

  try {
    // 1. Fetch submitted timecards (what the approve tab shows)
    console.log('1. Fetching submitted timecards for approve tab...')
    const { data: submittedTimecards, error: submittedError } = await supabase
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
        user:profiles!timecard_headers_user_id_fkey(full_name, email),
        project:projects!timecard_headers_project_id_fkey(name)
      `)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })

    if (submittedError) {
      console.error('❌ Error fetching submitted timecards:', submittedError)
      return
    }

    console.log(`✅ Found ${submittedTimecards.length} submitted timecards`)

    if (submittedTimecards.length === 0) {
      console.log('ℹ️  No submitted timecards found. Creating test data...')
      await createTestSubmittedTimecard()
      return
    }

    // 2. Test data structure for approve tab
    console.log('\n2. Testing timecard data structure for approve tab...')
    
    submittedTimecards.forEach((timecard, index) => {
      console.log(`\n📋 Timecard ${index + 1}:`)
      console.log(`   User: ${timecard.user?.full_name || 'Unknown'}`)
      console.log(`   Project: ${timecard.project?.name || 'Unknown'}`)
      console.log(`   Status: ${timecard.status}`)
      console.log(`   Period: ${timecard.period_start_date} to ${timecard.period_end_date}`)
      console.log(`   Total Hours: ${timecard.total_hours}`)
      console.log(`   Total Pay: $${timecard.total_pay}`)
      console.log(`   Pay Rate: $${timecard.pay_rate}/hr`)
      console.log(`   Working Days: ${timecard.daily_entries?.length || 0}`)
      console.log(`   Admin Notes: ${timecard.admin_notes || 'None'}`)
      console.log(`   Submitted: ${timecard.submitted_at || 'Not set'}`)
      
      // Check if multi-day
      const isMultiDay = timecard.daily_entries && timecard.daily_entries.length > 1
      console.log(`   Multi-day: ${isMultiDay ? 'Yes' : 'No'}`)
      
      if (isMultiDay) {
        console.log(`   Daily breakdown:`)
        timecard.daily_entries.forEach((entry, dayIndex) => {
          console.log(`     Day ${dayIndex + 1} (${entry.work_date}): ${entry.hours_worked}h, $${entry.daily_pay}`)
        })
        
        // Calculate averages (what the UI shows)
        const avgHours = timecard.total_hours / timecard.daily_entries.length
        const avgPay = timecard.total_pay / timecard.daily_entries.length
        const avgBreak = (timecard.total_break_duration * 60) / timecard.daily_entries.length
        
        console.log(`   Averages: ${avgHours.toFixed(1)}h/day, $${avgPay.toFixed(0)}/day, ${avgBreak.toFixed(0)}min break/day`)
      }
    })

    // 3. Test admin notes functionality
    console.log('\n3. Testing admin notes display...')
    const timecardsWithNotes = submittedTimecards.filter(tc => tc.admin_notes)
    console.log(`✅ Found ${timecardsWithNotes.length} timecards with admin notes`)
    
    timecardsWithNotes.forEach((timecard, index) => {
      console.log(`   Note ${index + 1}: "${timecard.admin_notes}"`)
    })

    // 4. Test navigation data
    console.log('\n4. Testing navigation functionality...')
    console.log(`✅ Total submitted timecards for navigation: ${submittedTimecards.length}`)
    console.log(`   First timecard: ${submittedTimecards[0]?.user?.full_name} - ${submittedTimecards[0]?.project?.name}`)
    if (submittedTimecards.length > 1) {
      console.log(`   Last timecard: ${submittedTimecards[submittedTimecards.length - 1]?.user?.full_name} - ${submittedTimecards[submittedTimecards.length - 1]?.project?.name}`)
    }

    console.log('\n✅ Approve tab data structure test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function createTestSubmittedTimecard() {
  console.log('📝 Creating test submitted timecard...')
  
  try {
    // Get first available user and project
    const { data: users } = await supabase.from('profiles').select('id, full_name').limit(1)
    const { data: projects } = await supabase.from('projects').select('id, name').limit(1)
    
    if (!users?.length || !projects?.length) {
      console.log('❌ No users or projects found. Please create test data first.')
      return
    }

    const user = users[0]
    const project = projects[0]
    
    // Create a multi-day timecard with admin notes
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 3) // 3 days ago
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - 1) // yesterday
    
    const headerData = {
      user_id: user.id,
      project_id: project.id,
      period_start_date: startDate.toISOString().split('T')[0],
      period_end_date: endDate.toISOString().split('T')[0],
      total_hours: 24.5,
      total_break_duration: 1.5, // 1.5 hours total breaks
      total_pay: 612.50,
      pay_rate: 25.00,
      admin_notes: 'Please review overtime hours for day 2. Employee worked extended shift due to project deadline.',
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }

    const { data: header, error: headerError } = await supabase
      .from('timecard_headers')
      .insert(headerData)
      .select()
      .single()

    if (headerError) {
      console.error('❌ Error creating timecard header:', headerError)
      return
    }

    // Create daily entries for 3 days
    const dailyEntries = [
      {
        timecard_header_id: header.id,
        work_date: startDate.toISOString().split('T')[0],
        check_in_time: '08:00:00',
        check_out_time: '16:30:00',
        break_start_time: '12:00:00',
        break_end_time: '12:30:00',
        hours_worked: 8.0,
        break_duration: 0.5,
        daily_pay: 200.00
      },
      {
        timecard_header_id: header.id,
        work_date: new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_in_time: '07:30:00',
        check_out_time: '18:00:00',
        break_start_time: '12:00:00',
        break_end_time: '13:00:00',
        hours_worked: 9.5, // Overtime day
        break_duration: 1.0,
        daily_pay: 237.50
      },
      {
        timecard_header_id: header.id,
        work_date: endDate.toISOString().split('T')[0],
        check_in_time: '08:15:00',
        check_out_time: '15:15:00',
        break_start_time: null,
        break_end_time: null,
        hours_worked: 7.0, // Short day, no break
        break_duration: 0,
        daily_pay: 175.00
      }
    ]

    const { error: entriesError } = await supabase
      .from('timecard_daily_entries')
      .insert(dailyEntries)

    if (entriesError) {
      console.error('❌ Error creating daily entries:', entriesError)
      return
    }

    console.log(`✅ Created test submitted timecard for ${user.full_name} on project ${project.name}`)
    console.log('   - 3 working days with admin notes')
    console.log('   - Includes overtime day and no-break day')
    console.log('   - Ready for approve tab testing')
    
    // Run the test again
    await testApproveTabData()

  } catch (error) {
    console.error('❌ Error creating test data:', error)
  }
}

// Run the test
testApproveTabData()