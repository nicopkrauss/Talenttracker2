#!/usr/bin/env node

/**
 * Create a test timecard with daily entries to test the display
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phksmrvgqqjfxgxztvgc.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoa3NtcnZncXFqZnhneHp0dmdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQyNjA0NiwiZXhwIjoyMDcyMDAyMDQ2fQ.oNTcoB4HfFPEMEl0KdfiuC-09NQnATKPZIn3xP4U1mY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestTimecard() {
  try {
    console.log('🔧 Creating test timecard with daily entries...\n')

    // First, get a user and project
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1)

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (!users || users.length === 0) {
      console.error('❌ No users found')
      return
    }

    if (!projects || projects.length === 0) {
      console.error('❌ No projects found')
      return
    }

    const user = users[0]
    const project = projects[0]

    console.log(`👤 Using user: ${user.full_name} (${user.id})`)
    console.log(`📋 Using project: ${project.name} (${project.id})`)

    // Create timecard header
    const timecardData = {
      user_id: user.id,
      project_id: project.id,
      period_start_date: '2024-01-15',
      period_end_date: '2024-01-17',
      status: 'submitted',
      total_hours: 24.0,
      total_break_duration: 90,
      total_pay: 600.00,
      pay_rate: 25.00,
      admin_notes: 'Multi-day shoot - 3 consecutive days (Multi-Day Schedule)\nTotal of 3 working days - January 15-17, 2024 production schedule'
    }

    const { data: timecard, error: timecardError } = await supabase
      .from('timecard_headers')
      .insert(timecardData)
      .select()
      .single()

    if (timecardError) {
      console.error('❌ Error creating timecard:', timecardError)
      return
    }

    console.log(`✅ Created timecard: ${timecard.id}`)

    // Create daily entries
    const dailyEntries = [
      {
        timecard_header_id: timecard.id,
        work_date: '2024-01-15',
        check_in_time: '08:00:00',
        check_out_time: '16:00:00',
        break_start_time: '12:00:00',
        break_end_time: '12:30:00',
        hours_worked: 7.5,
        break_duration: 0.5, // 30 minutes as decimal hours
        daily_pay: 187.50
      },
      {
        timecard_header_id: timecard.id,
        work_date: '2024-01-16',
        check_in_time: '09:00:00',
        check_out_time: '18:00:00',
        break_start_time: '13:00:00',
        break_end_time: '14:00:00',
        hours_worked: 8.0,
        break_duration: 1.0, // 60 minutes as decimal hours
        daily_pay: 200.00
      },
      {
        timecard_header_id: timecard.id,
        work_date: '2024-01-17',
        check_in_time: '07:30:00',
        check_out_time: '16:00:00',
        break_start_time: '12:30:00',
        break_end_time: '12:30:00', // No break this day
        hours_worked: 8.5,
        break_duration: 0,
        daily_pay: 212.50
      }
    ]

    const { data: entries, error: entriesError } = await supabase
      .from('timecard_daily_entries')
      .insert(dailyEntries)
      .select()

    if (entriesError) {
      console.error('❌ Error creating daily entries:', entriesError)
      return
    }

    console.log(`✅ Created ${entries.length} daily entries`)

    console.log('\n📊 Test Timecard Created:')
    console.log('='.repeat(50))
    console.log(`Timecard ID: ${timecard.id}`)
    console.log(`User: ${user.full_name}`)
    console.log(`Project: ${project.name}`)
    console.log(`Period: ${timecardData.period_start_date} to ${timecardData.period_end_date}`)
    console.log(`Total Hours: ${timecardData.total_hours}`)
    console.log(`Total Pay: $${timecardData.total_pay}`)
    console.log(`Daily Entries: ${entries.length}`)

    console.log('\n🌐 Test URLs:')
    console.log(`Timecard Detail: http://localhost:3001/timecards/${timecard.id}`)
    console.log(`API Endpoint: http://localhost:3001/api/timecards/${timecard.id}`)

    console.log('\n✅ Test timecard created successfully!')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createTestTimecard()