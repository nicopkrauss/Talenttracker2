#!/usr/bin/env node

/**
 * Test script to check admin notes display in approve tab
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAdminNotesDisplay() {
  console.log('🧪 Testing Admin Notes Display in Approve Tab...\n')

  try {
    // Find a timecard with admin notes
    const { data: timecardsWithNotes, error } = await supabase
      .from('timecard_headers')
      .select(`
        id,
        user_id,
        project_id,
        status,
        admin_notes,
        user:profiles!timecard_headers_user_id_fkey(full_name),
        project:projects!timecard_headers_project_id_fkey(name)
      `)
      .not('admin_notes', 'is', null)
      .neq('admin_notes', '')
      .eq('status', 'submitted')
      .limit(3)

    if (error) {
      console.error('❌ Error fetching timecards with admin notes:', error)
      return
    }

    console.log(`✅ Found ${timecardsWithNotes.length} submitted timecards with admin notes`)

    timecardsWithNotes.forEach((timecard, index) => {
      console.log(`\n📋 Timecard ${index + 1}:`)
      console.log(`   User: ${timecard.user?.full_name}`)
      console.log(`   Project: ${timecard.project?.name}`)
      console.log(`   Status: ${timecard.status}`)
      console.log(`   Admin Notes:`)
      console.log(`   "${timecard.admin_notes}"`)
      console.log(`   Notes Length: ${timecard.admin_notes?.length || 0} characters`)
      
      // Check for line breaks
      const hasLineBreaks = timecard.admin_notes?.includes('\n')
      console.log(`   Has Line Breaks: ${hasLineBreaks ? 'Yes' : 'No'}`)
    })

    if (timecardsWithNotes.length === 0) {
      console.log('\n📝 Creating a test timecard with admin notes...')
      await createTestTimecardWithNotes()
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function createTestTimecardWithNotes() {
  try {
    // Get first available user and project
    const { data: users } = await supabase.from('profiles').select('id, full_name').limit(1)
    const { data: projects } = await supabase.from('projects').select('id, name').limit(1)
    
    if (!users?.length || !projects?.length) {
      console.log('❌ No users or projects found')
      return
    }

    const user = users[0]
    const project = projects[0]
    
    const adminNotes = `Review Required: Extended Hours
    
Employee worked overtime on Day 2 due to production delays.
Please verify overtime approval before processing payment.

Additional Notes:
- Client requested extended coverage
- Supervisor approved additional hours
- Documentation attached to project files`

    // Create timecard header with detailed admin notes
    const headerData = {
      user_id: user.id,
      project_id: project.id,
      period_start_date: '2025-01-20',
      period_end_date: '2025-01-22',
      total_hours: 25.5,
      total_break_duration: 1.5,
      total_pay: 637.50,
      pay_rate: 25.00,
      admin_notes: adminNotes,
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

    // Create daily entries
    const dailyEntries = [
      {
        timecard_header_id: header.id,
        work_date: '2025-01-20',
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
        work_date: '2025-01-21',
        check_in_time: '07:30:00',
        check_out_time: '19:00:00',
        break_start_time: '12:00:00',
        break_end_time: '13:00:00',
        hours_worked: 10.5, // Overtime day
        break_duration: 1.0,
        daily_pay: 262.50
      },
      {
        timecard_header_id: header.id,
        work_date: '2025-01-22',
        check_in_time: '08:15:00',
        check_out_time: '15:15:00',
        break_start_time: null,
        break_end_time: null,
        hours_worked: 7.0,
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

    console.log(`✅ Created test timecard with detailed admin notes for ${user.full_name}`)
    console.log('   - 3 working days with overtime scenario')
    console.log('   - Multi-line admin notes with formatting')
    console.log('   - Ready for approve tab testing')
    
    // Run the test again
    await testAdminNotesDisplay()

  } catch (error) {
    console.error('❌ Error creating test data:', error)
  }
}

// Run the test
testAdminNotesDisplay()