#!/usr/bin/env node

/**
 * Create Fake Timecards - Direct Database Approach
 * 
 * This script generates realistic timecard test data by inserting directly
 * into the database while using the timecard calculation engine for
 * accurate calculations.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Realistic work patterns for different roles
const WORK_PATTERNS = {
  ESCORT_FULL_DAY: {
    name: 'Escort Full Day',
    checkIn: '08:00',
    breakStart: '12:30',
    breakEnd: '13:00', // 30 min break
    checkOut: '18:00',
    roles: ['talent_escort']
  },
  ESCORT_LONG_DAY: {
    name: 'Escort Long Day',
    checkIn: '07:00',
    breakStart: '12:00',
    breakEnd: '13:00', // 60 min break
    checkOut: '20:00',
    roles: ['talent_escort']
  },
  SUPERVISOR_STANDARD: {
    name: 'Supervisor Standard',
    checkIn: '07:30',
    breakStart: '12:00',
    breakEnd: '13:00', // 60 min break
    checkOut: '19:30',
    roles: ['supervisor']
  },
  COORDINATOR_DAY: {
    name: 'Coordinator Day',
    checkIn: '09:00',
    breakStart: '13:00',
    breakEnd: '14:00', // 60 min break
    checkOut: '17:00',
    roles: ['coordinator']
  },
  OVERTIME_SHIFT: {
    name: 'Overtime Shift',
    checkIn: '06:00',
    breakStart: '12:00',
    breakEnd: '13:00', // 60 min break
    checkOut: '22:00',
    roles: ['talent_escort', 'supervisor']
  },
  SHORT_DAY: {
    name: 'Short Day',
    checkIn: '10:00',
    breakStart: '13:00',
    breakEnd: '13:30', // 30 min break
    checkOut: '16:00',
    roles: ['talent_escort', 'coordinator']
  },
  MISSING_BREAK: {
    name: 'Missing Break (Validation Issue)',
    checkIn: '09:00',
    checkOut: '17:00',
    // No break times - should trigger validation warnings
    roles: ['talent_escort']
  }
}

async function getTestData() {
  console.log('🔍 Fetching test data...')
  
  // Get active or prep projects (prep projects can have timecards too)
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status')
    .in('status', ['active', 'prep'])
    .limit(5)

  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError)
    return null
  }

  if (projects.length === 0) {
    console.log('⚠️  No active projects found. Creating a test project...')
    
    // Create a test project
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project for Timecards',
        description: 'Auto-generated project for timecard testing',
        production_company: 'Test Productions',
        hiring_contact: 'Test Manager',
        location: 'Test Location',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        status: 'active',
        created_by: '80fb6ab8-4413-4f68-9a5a-35bcdde80261' // Use existing user ID
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating test project:', createError)
      return null
    }

    projects.push(newProject)
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
    .limit(20)

  if (staffError) {
    console.error('❌ Error fetching staff:', staffError)
    return null
  }

  if (staff.length === 0) {
    console.log('⚠️  No staff assignments found. You may need to create some team assignments first.')
    return null
  }

  console.log(`✅ Found ${projects.length} projects and ${staff.length} staff assignments`)
  
  return { projects, staff }
}

function calculateTimecardData(pattern, date, payRate) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  
  // Build timestamp strings
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

  // Apply minimum break requirement for long shifts
  if (totalHours > 6 && breakDuration === 0) {
    // Flag as needing break resolution
    console.log(`⚠️  Long shift without break detected - will need resolution`)
  }

  const totalPay = Math.max(0, totalHours) * payRate

  return {
    check_in_time: checkInTime,
    check_out_time: checkOutTime,
    break_start_time: breakStartTime,
    break_end_time: breakEndTime,
    total_hours: Math.round(Math.max(0, totalHours) * 100) / 100, // Round to 2 decimal places, no negative
    break_duration: Math.round(breakDuration),
    total_pay: Math.round(totalPay * 100) / 100
  }
}

async function createTimecard(userId, projectId, date, pattern, payRate) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  
  console.log(`📝 Creating ${pattern.name} timecard for ${dateStr}...`)

  const calculatedData = calculateTimecardData(pattern, dateStr, payRate)

  // Determine status - some should be submitted/approved for variety
  const rand = Math.random()
  let status = 'draft'
  let submittedAt = null
  let approvedAt = null
  let approvedBy = null

  if (rand > 0.7) {
    status = 'submitted'
    submittedAt = new Date().toISOString()
    
    if (rand > 0.85) {
      status = 'approved'
      approvedAt = new Date().toISOString()
      // Use first admin/supervisor as approver
      const { data: approver } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single()
      
      approvedBy = approver?.id || null
    }
  }

  // Insert timecard
  const { data, error } = await supabase
    .from('timecards')
    .insert({
      user_id: userId,
      project_id: projectId,
      date: dateStr,
      ...calculatedData,
      pay_rate: payRate,
      status,
      manually_edited: false,
      submitted_at: submittedAt,
      approved_at: approvedAt,
      approved_by: approvedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) {
    // Handle duplicate key error gracefully
    if (error.code === '23505') {
      console.log(`⚠️  Timecard already exists for this user/project/date combination`)
      return null
    }
    console.error(`❌ Error creating timecard:`, error)
    throw error
  }

  console.log(`✅ Created ${status} timecard (${calculatedData.total_hours}h, $${calculatedData.total_pay})`)
  return data
}

async function generateFakeTimecards() {
  console.log('🚀 Starting fake timecard generation...')

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

  // Generate timecards for the last 14 days
  const today = new Date()
  const patterns = Object.values(WORK_PATTERNS)
  let created = 0
  let skipped = 0

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)
    
    // Skip some weekends for variety (but not all)
    if ((date.getDay() === 0 || date.getDay() === 6) && Math.random() > 0.3) {
      continue
    }

    console.log(`\n📅 Creating timecards for ${date.toDateString()}`)

    for (const staffMember of staff) {
      // 85% chance of working each day
      if (Math.random() > 0.85) {
        skipped++
        continue
      }

      // Choose appropriate pattern based on role
      const rolePatterns = patterns.filter(p => 
        p.roles.includes(staffMember.role) || p.roles.length === 0
      )
      const pattern = rolePatterns.length > 0 
        ? rolePatterns[Math.floor(Math.random() * rolePatterns.length)]
        : patterns[Math.floor(Math.random() * patterns.length)]
      
      try {
        const result = await createTimecard(
          staffMember.user_id,
          staffMember.project_id,
          date,
          pattern,
          staffMember.pay_rate || 25
        )
        
        if (result) {
          created++
        } else {
          skipped++
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50))
        
      } catch (error) {
        console.error(`❌ Failed to create timecard for ${staffMember.profiles.full_name}:`, error.message)
        skipped++
      }
    }
  }

  console.log(`\n🎉 Fake timecard generation complete!`)
  console.log(`📊 Created: ${created} timecards`)
  console.log(`⏭️  Skipped: ${skipped} timecards`)
  
  // Show summary
  const { data: summary } = await supabase
    .from('timecards')
    .select('status, total_hours, total_pay')

  if (summary) {
    console.log('\n📈 Timecard Summary:')
    const statusCounts = {}
    summary.forEach(row => {
      if (!statusCounts[row.status]) {
        statusCounts[row.status] = { count: 0, hours: 0, pay: 0 }
      }
      statusCounts[row.status].count++
      statusCounts[row.status].hours += row.total_hours || 0
      statusCounts[row.status].pay += row.total_pay || 0
    })
    
    Object.entries(statusCounts).forEach(([status, data]) => {
      console.log(`   ${status}: ${data.count} timecards, ${data.hours.toFixed(1)}h, $${data.pay.toFixed(2)}`)
    })
  }

  // Show validation issues
  const { data: validationIssues } = await supabase
    .from('timecards')
    .select('*')
    .gt('total_hours', 6)
    .eq('break_duration', 0)

  if (validationIssues && validationIssues.length > 0) {
    console.log(`\n⚠️  Found ${validationIssues.length} timecards with potential break requirement issues`)
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

module.exports = { generateFakeTimecards, createTimecard, calculateTimecardData }