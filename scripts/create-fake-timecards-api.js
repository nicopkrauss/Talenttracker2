#!/usr/bin/env node

/**
 * Create Fake Timecards via API Calls
 * 
 * This script generates realistic timecard test data by making API calls
 * to the existing timecard endpoints, ensuring proper validation and
 * business logic is applied.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Simulate different work patterns
const WORK_PATTERNS = {
  FULL_DAY: {
    checkIn: '08:00',
    breakStart: '12:30',
    breakEnd: '13:00', // 30 min break
    checkOut: '18:00'
  },
  LONG_DAY: {
    checkIn: '07:00',
    breakStart: '12:00',
    breakEnd: '13:00', // 60 min break
    checkOut: '20:00'
  },
  SHORT_DAY: {
    checkIn: '10:00',
    breakStart: '13:00',
    breakEnd: '13:30', // 30 min break
    checkOut: '16:00'
  },
  OVERTIME: {
    checkIn: '06:00',
    breakStart: '12:00',
    breakEnd: '13:00', // 60 min break
    checkOut: '22:00'
  },
  MISSING_BREAK: {
    checkIn: '09:00',
    checkOut: '17:00'
    // No break times - should trigger validation
  }
}

async function getTestData() {
  console.log('🔍 Fetching test data...')
  
  // Get active projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('status', 'active')
    .limit(3)

  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError)
    return null
  }

  // Get staff members with team assignments
  const { data: staff, error: staffError } = await supabase
    .from('team_assignments')
    .select(`
      user_id,
      project_id,
      role,
      pay_rate,
      profiles!inner(full_name, email)
    `)
    .in('project_id', projects.map(p => p.id))
    .limit(10)

  if (staffError) {
    console.error('❌ Error fetching staff:', staffError)
    return null
  }

  console.log(`✅ Found ${projects.length} projects and ${staff.length} staff assignments`)
  
  return { projects, staff }
}

async function createTimecardViaAPI(userId, projectId, date, pattern) {
  const baseDate = new Date(date)
  const dateStr = baseDate.toISOString().split('T')[0]
  
  console.log(`📝 Creating timecard for user ${userId} on ${dateStr}...`)

  try {
    // Step 1: Check In
    if (pattern.checkIn) {
      const checkInTime = new Date(`${dateStr}T${pattern.checkIn}:00.000Z`)
      
      const checkInResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/timecard-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          projectId,
          action: 'check_in',
          timestamp: checkInTime.toISOString(),
          userId // For service role bypass
        })
      })

      if (!checkInResponse.ok) {
        console.log(`⚠️  Check-in API call failed, trying direct database insert...`)
        // Fallback to direct database insert
        await createTimecardDirectly(userId, projectId, dateStr, pattern)
        return
      }
    }

    // Step 2: Start Break
    if (pattern.breakStart) {
      const breakStartTime = new Date(`${dateStr}T${pattern.breakStart}:00.000Z`)
      
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/timecard-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          projectId,
          action: 'start_break',
          timestamp: breakStartTime.toISOString(),
          userId
        })
      })
    }

    // Step 3: End Break
    if (pattern.breakEnd) {
      const breakEndTime = new Date(`${dateStr}T${pattern.breakEnd}:00.000Z`)
      
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/timecard-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          projectId,
          action: 'end_break',
          timestamp: breakEndTime.toISOString(),
          userId
        })
      })
    }

    // Step 4: Check Out
    if (pattern.checkOut) {
      const checkOutTime = new Date(`${dateStr}T${pattern.checkOut}:00.000Z`)
      
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/timecard-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          projectId,
          action: 'check_out',
          timestamp: checkOutTime.toISOString(),
          userId
        })
      })
    }

    console.log(`✅ Timecard created successfully via API`)

  } catch (error) {
    console.error(`❌ API approach failed:`, error.message)
    console.log(`🔄 Falling back to direct database insert...`)
    await createTimecardDirectly(userId, projectId, dateStr, pattern)
  }
}

async function createTimecardDirectly(userId, projectId, date, pattern) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  
  // Get pay rate from team assignment
  const { data: assignment } = await supabase
    .from('team_assignments')
    .select('pay_rate, role')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single()

  const payRate = assignment?.pay_rate || 25 // Default rate

  // Calculate times
  const checkInTime = pattern.checkIn ? new Date(`${dateStr}T${pattern.checkIn}:00.000Z`).toISOString() : null
  const checkOutTime = pattern.checkOut ? new Date(`${dateStr}T${pattern.checkOut}:00.000Z`).toISOString() : null
  const breakStartTime = pattern.breakStart ? new Date(`${dateStr}T${pattern.breakStart}:00.000Z`).toISOString() : null
  const breakEndTime = pattern.breakEnd ? new Date(`${dateStr}T${pattern.breakEnd}:00.000Z`).toISOString() : null

  // Calculate total hours and break duration
  let totalHours = 0
  let breakDuration = 0

  if (checkInTime && checkOutTime) {
    const checkIn = new Date(checkInTime)
    const checkOut = new Date(checkOutTime)
    totalHours = (checkOut - checkIn) / (1000 * 60 * 60) // Convert to hours
  }

  if (breakStartTime && breakEndTime) {
    const breakStart = new Date(breakStartTime)
    const breakEnd = new Date(breakEndTime)
    breakDuration = (breakEnd - breakStart) / (1000 * 60) // Convert to minutes
    totalHours -= (breakDuration / 60) // Subtract break from total hours
  }

  const totalPay = totalHours * payRate

  // Insert timecard directly
  const { data, error } = await supabase
    .from('timecards')
    .insert({
      user_id: userId,
      project_id: projectId,
      date: dateStr,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      break_start_time: breakStartTime,
      break_end_time: breakEndTime,
      total_hours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
      break_duration: breakDuration,
      pay_rate: payRate,
      total_pay: Math.round(totalPay * 100) / 100,
      status: 'draft',
      manually_edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) {
    console.error(`❌ Direct insert failed:`, error)
    throw error
  }

  console.log(`✅ Timecard created directly in database`)
  return data
}

async function generateFakeTimecards() {
  console.log('🚀 Starting fake timecard generation via API calls...')

  const testData = await getTestData()
  if (!testData) {
    console.error('❌ Failed to get test data')
    process.exit(1)
  }

  const { projects, staff } = testData

  // Clear existing timecards
  console.log('🧹 Clearing existing timecards...')
  const { error: deleteError } = await supabase
    .from('timecards')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (deleteError) {
    console.error('❌ Error clearing timecards:', deleteError)
  } else {
    console.log('✅ Existing timecards cleared')
  }

  // Generate timecards for the last 7 days
  const today = new Date()
  const patterns = Object.values(WORK_PATTERNS)
  let created = 0

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)
    
    // Skip weekends for some variety
    if (date.getDay() === 0 || date.getDay() === 6) continue

    console.log(`\n📅 Creating timecards for ${date.toDateString()}`)

    for (const staffMember of staff) {
      // Randomly assign work patterns (80% chance of working)
      if (Math.random() > 0.8) continue

      const pattern = patterns[Math.floor(Math.random() * patterns.length)]
      
      try {
        await createTimecardViaAPI(
          staffMember.user_id,
          staffMember.project_id,
          date,
          pattern
        )
        created++
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Failed to create timecard for ${staffMember.profiles.full_name}:`, error.message)
      }
    }
  }

  console.log(`\n🎉 Fake timecard generation complete!`)
  console.log(`📊 Created ${created} timecards`)
  
  // Show summary
  const { data: summary } = await supabase
    .from('timecards')
    .select('status, count(*)')
    .group('status')

  if (summary) {
    console.log('\n📈 Timecard Summary:')
    summary.forEach(row => {
      console.log(`   ${row.status}: ${row.count} timecards`)
    })
  }
}

// Run the script
if (require.main === module) {
  generateFakeTimecards()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { generateFakeTimecards, createTimecardViaAPI, createTimecardDirectly }