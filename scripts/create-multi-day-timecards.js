#!/usr/bin/env node

/**
 * Create 5 Timecards with Multiple Days Logged
 * 
 * This script creates 5 different timecards, each representing multiple days of work
 * within a single timecard entry per user per project. This matches the system design
 * where workers submit one timecard per project covering all their work days.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Different multi-day work patterns for variety
const WORK_PATTERNS = {
  CONSISTENT_FULL_TIME: {
    name: 'Consistent Full-Time Worker (5 days)',
    description: 'Regular 8-hour days with 1-hour lunch breaks',
    totalDays: 5,
    totalHours: 40.0, // 8 hours × 5 days
    averageBreakMinutes: 60,
    representativeDay: { checkIn: '08:00', breakStart: '12:00', breakEnd: '13:00', checkOut: '17:00' }
  },
  VARIABLE_HOURS: {
    name: 'Variable Hours Worker (4 days)',
    description: 'Different hours each day, some long days, some short',
    totalDays: 4,
    totalHours: 32.5, // 11 + 6.5 + 13 + 7.5 hours
    averageBreakMinutes: 45,
    representativeDay: { checkIn: '07:00', breakStart: '12:30', breakEnd: '13:15', checkOut: '18:00' }
  },
  OVERTIME_WORKER: {
    name: 'Overtime Worker (6 days)',
    description: 'Long days with significant overtime across the week',
    totalDays: 6,
    totalHours: 60.0, // 10 hours per day average
    averageBreakMinutes: 60,
    representativeDay: { checkIn: '06:00', breakStart: '12:00', breakEnd: '13:00', checkOut: '17:00' }
  },
  PART_TIME_WORKER: {
    name: 'Part-Time Worker (3 days)',
    description: 'Short shifts, minimal hours',
    totalDays: 3,
    totalHours: 18.0, // 6 + 5 + 7 hours
    averageBreakMinutes: 30,
    representativeDay: { checkIn: '10:00', breakStart: '13:00', breakEnd: '13:30', checkOut: '16:00' }
  },
  WEEKEND_INTENSIVE: {
    name: 'Weekend Intensive Worker (2 days)',
    description: 'Long weekend shifts only',
    totalDays: 2,
    totalHours: 20.0, // 10 hours per day
    averageBreakMinutes: 60,
    representativeDay: { checkIn: '08:00', breakStart: '13:00', breakEnd: '14:00', checkOut: '19:00' }
  }
}

async function getTestData() {
  console.log('🔍 Fetching test data...')
  
  // Get any projects (not just active ones)
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status')
    .limit(5)

  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError)
    return null
  }

  if (!projects || projects.length === 0) {
    console.error('❌ No projects found')
    return null
  }

  console.log(`Found ${projects.length} projects:`, projects.map(p => `${p.name} (${p.status})`))

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
    console.error('Staff error details:', staffError)
    return null
  }

  if (!staff || staff.length === 0) {
    console.error('❌ No staff assignments found for these projects')
    
    // Try to get any staff assignments
    const { data: anyStaff, error: anyStaffError } = await supabase
      .from('team_assignments')
      .select(`
        user_id,
        project_id,
        role,
        pay_rate,
        profiles!inner(full_name, email)
      `)
      .limit(10)
    
    if (anyStaffError) {
      console.error('❌ Error fetching any staff:', anyStaffError)
      return null
    }
    
    if (!anyStaff || anyStaff.length === 0) {
      console.error('❌ No staff assignments found at all')
      return null
    }
    
    console.log(`Found ${anyStaff.length} staff assignments (any project)`)
    return { projects, staff: anyStaff }
  }

  console.log(`✅ Found ${projects.length} projects and ${staff.length} staff assignments`)
  
  return { projects, staff }
}

async function createMultiDayTimecard(staffMember, pattern, userIndex) {
  const { user_id: userId, project_id: projectId, profiles } = staffMember
  const staffName = profiles.full_name

  console.log(`\n👤 Creating multi-day timecard for ${staffName}`)
  console.log(`   Pattern: ${pattern.name}`)
  console.log(`   Description: ${pattern.description}`)
  console.log(`   Project: ${projectId}`)

  // Use a recent date for the timecard (different for each user to avoid any potential conflicts)
  const today = new Date()
  const workDate = new Date(today)
  workDate.setDate(workDate.getDate() - userIndex - 1) // Different date for each user
  
  try {
    await createComprehensiveTimecard(userId, projectId, workDate, pattern, staffName)
    console.log(`✅ Multi-day timecard completed for ${staffName}`)
  } catch (error) {
    console.error(`  ❌ Failed to create timecard for ${staffName}:`, error.message)
  }
}

async function createComprehensiveTimecard(userId, projectId, date, pattern, staffName) {
  const dateStr = date.toISOString().split('T')[0]
  
  console.log(`  📝 Creating timecard for ${dateStr} representing ${pattern.totalDays} days of work...`)

  try {
    // Get pay rate from team assignment
    const { data: assignment } = await supabase
      .from('team_assignments')
      .select('pay_rate, role')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single()

    const payRate = assignment?.pay_rate || 25 // Default rate

    // Build the timecard data representing multiple days of work
    const timecardData = {
      user_id: userId,
      project_id: projectId,
      date: dateStr,
      status: 'draft',
      pay_rate: payRate,
      manually_edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_hours: Math.min(pattern.totalHours, 999.99),
      break_duration: Math.min((pattern.averageBreakMinutes * pattern.totalDays) / 60, 99), // Total break time in hours (capped at 99 hours)
      total_pay: Math.round((pattern.totalHours * payRate) * 100) / 100,
      admin_notes: `${pattern.description} - Total of ${pattern.totalDays} working days`
    }

    // Add representative times from the pattern (these represent a typical day)
    const repDay = pattern.representativeDay
    if (repDay.checkIn) {
      timecardData.check_in_time = new Date(`${dateStr}T${repDay.checkIn}:00.000Z`).toISOString()
    }

    if (repDay.checkOut) {
      let checkOutTime
      if (repDay.checkOut === '02:00' || repDay.checkOut === '00:00') {
        // Handle next-day checkout
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextDateStr = nextDay.toISOString().split('T')[0]
        checkOutTime = new Date(`${nextDateStr}T${repDay.checkOut}:00.000Z`).toISOString()
      } else {
        checkOutTime = new Date(`${dateStr}T${repDay.checkOut}:00.000Z`).toISOString()
      }
      timecardData.check_out_time = checkOutTime
    }

    if (repDay.breakStart) {
      timecardData.break_start_time = new Date(`${dateStr}T${repDay.breakStart}:00.000Z`).toISOString()
    }

    if (repDay.breakEnd) {
      timecardData.break_end_time = new Date(`${dateStr}T${repDay.breakEnd}:00.000Z`).toISOString()
    }

    // Insert the timecard
    const { data, error } = await supabase
      .from('timecards')
      .insert(timecardData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create timecard: ${error.message}`)
    }

    console.log(`    ✅ Created timecard: ${pattern.totalHours} hours across ${pattern.totalDays} days = $${timecardData.total_pay}`)
    return data

  } catch (error) {
    console.error(`    ❌ Failed to create timecard for ${dateStr}:`, error.message)
    throw error
  }
}

async function generateMultiDayTimecards() {
  console.log('🚀 Starting multi-day timecard generation...')

  const testData = await getTestData()
  if (!testData) {
    console.error('❌ Failed to get test data')
    process.exit(1)
  }

  const { projects, staff } = testData

  // Select 5 staff members and assign different patterns
  const patterns = Object.values(WORK_PATTERNS)
  const selectedStaff = staff.slice(0, 5)

  if (selectedStaff.length < 5) {
    console.error(`❌ Need at least 5 staff members, found ${selectedStaff.length}`)
    process.exit(1)
  }

  // Clear existing timecards for our test users to avoid unique constraint issues
  console.log('🧹 Clearing existing timecards for test users...')
  const testUserIds = selectedStaff.map(s => s.user_id)
  const { error: clearError } = await supabase
    .from('timecards')
    .delete()
    .in('user_id', testUserIds)

  if (clearError) {
    console.error('❌ Error clearing test user timecards:', clearError)
  } else {
    console.log('✅ Existing test user timecards cleared')
  }

  console.log(`\n📋 Creating 5 multi-day timecards with different work patterns`)

  let successCount = 0

  for (let i = 0; i < selectedStaff.length; i++) {
    const staffMember = selectedStaff[i]
    const pattern = patterns[i]
    
    try {
      await createMultiDayTimecard(staffMember, pattern, i)
      successCount++
      
      // Delay between staff members
      await new Promise(resolve => setTimeout(resolve, 300))
      
    } catch (error) {
      console.error(`❌ Failed to create timecard for ${staffMember.profiles.full_name}:`, error.message)
    }
  }

  console.log(`\n🎉 Multi-day timecard generation complete!`)
  console.log(`📊 Successfully created ${successCount} out of ${selectedStaff.length} multi-day timecards`)
  
  // Show summary
  const { data: summary } = await supabase
    .from('timecards')
    .select(`
      user_id,
      date,
      total_hours,
      total_pay,
      status,
      admin_notes,
      profiles!timecards_user_id_fkey(full_name)
    `)
    .in('user_id', testUserIds)
    .order('total_hours', { ascending: false })

  if (summary && summary.length > 0) {
    console.log('\n📈 Created Multi-Day Timecards Summary:')
    
    summary.forEach((timecard, index) => {
      const userName = timecard.profiles?.full_name || 'Unknown User'
      console.log(`\n   ${index + 1}. 👤 ${userName}:`)
      console.log(`      Date: ${timecard.date}`)
      console.log(`      Total Hours: ${timecard.total_hours} hours`)
      console.log(`      Total Pay: $${timecard.total_pay}`)
      console.log(`      Notes: ${timecard.admin_notes || 'No notes'}`)
      console.log(`      Status: ${timecard.status}`)
    })

    const totalHours = summary.reduce((sum, tc) => sum + (parseFloat(tc.total_hours) || 0), 0)
    const totalPay = summary.reduce((sum, tc) => sum + (parseFloat(tc.total_pay) || 0), 0)
    
    console.log(`\n   📊 Grand Total: ${totalHours.toFixed(2)} hours, $${totalPay.toFixed(2)}`)
  }
}

// Run the script
if (require.main === module) {
  generateMultiDayTimecards()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { generateMultiDayTimecards }