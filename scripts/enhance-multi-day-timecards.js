#!/usr/bin/env node

/**
 * Enhance Multi-Day Timecards with Daily Breakdown
 * 
 * This script updates existing multi-day timecards to include detailed daily breakdown
 * in the new daily_breakdown JSONB field, providing individual day details while
 * maintaining the current aggregated structure.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Enhanced work patterns with daily variations
const ENHANCED_PATTERNS = {
  CONSISTENT_FULL_TIME: {
    name: 'Consistent Full-Time Worker (5 days)',
    generateDailyBreakdown: (baseDate, payRate) => [
      { date: addDays(baseDate, 0), checkIn: '08:00', checkOut: '17:00', breakStart: '12:00', breakEnd: '13:00', hours: 8.0, notes: 'Regular Monday' },
      { date: addDays(baseDate, 1), checkIn: '08:00', checkOut: '17:00', breakStart: '12:00', breakEnd: '13:00', hours: 8.0, notes: 'Regular Tuesday' },
      { date: addDays(baseDate, 2), checkIn: '08:00', checkOut: '17:00', breakStart: '12:00', breakEnd: '13:00', hours: 8.0, notes: 'Regular Wednesday' },
      { date: addDays(baseDate, 3), checkIn: '08:00', checkOut: '17:00', breakStart: '12:00', breakEnd: '13:00', hours: 8.0, notes: 'Regular Thursday' },
      { date: addDays(baseDate, 4), checkIn: '08:00', checkOut: '17:00', breakStart: '12:00', breakEnd: '13:00', hours: 8.0, notes: 'Regular Friday' }
    ]
  },
  VARIABLE_HOURS: {
    name: 'Variable Hours Worker (4 days)',
    generateDailyBreakdown: (baseDate, payRate) => [
      { date: addDays(baseDate, 0), checkIn: '06:00', checkOut: '17:00', breakStart: '12:00', breakEnd: '13:00', hours: 10.0, notes: 'Long Monday - early call' },
      { date: addDays(baseDate, 1), checkIn: '10:00', checkOut: '16:30', breakStart: '13:00', breakEnd: '13:30', hours: 6.0, notes: 'Short Tuesday - half day' },
      { date: addDays(baseDate, 2), checkIn: '05:00', checkOut: '19:00', breakStart: '12:00', breakEnd: '14:00', hours: 12.0, notes: 'Very long Wednesday - overtime' },
      { date: addDays(baseDate, 3), checkIn: '09:00', checkOut: '13:30', breakStart: '11:30', breakEnd: '12:00', hours: 4.0, notes: 'Short Thursday - wrap day' }
    ]
  },
  OVERTIME_WORKER: {
    name: 'Overtime Worker (6 days)',
    generateDailyBreakdown: (baseDate, payRate) => [
      { date: addDays(baseDate, 0), checkIn: '06:00', checkOut: '18:00', breakStart: '12:00', breakEnd: '13:00', hours: 11.0, notes: 'Monday - long prep day' },
      { date: addDays(baseDate, 1), checkIn: '06:00', checkOut: '19:00', breakStart: '12:30', breakEnd: '13:30', hours: 12.0, notes: 'Tuesday - heavy shooting' },
      { date: addDays(baseDate, 2), checkIn: '07:00', checkOut: '18:00', breakStart: '13:00', breakEnd: '14:00', hours: 10.0, notes: 'Wednesday - regular overtime' },
      { date: addDays(baseDate, 3), checkIn: '06:00', checkOut: '17:00', breakStart: '12:00', breakEnd: '13:00', hours: 10.0, notes: 'Thursday - standard long day' },
      { date: addDays(baseDate, 4), checkIn: '05:00', checkOut: '18:00', breakStart: '11:00', breakEnd: '12:00', hours: 12.0, notes: 'Friday - marathon day' },
      { date: addDays(baseDate, 5), checkIn: '08:00', checkOut: '13:00', breakStart: '10:30', breakEnd: '11:00', hours: 4.5, notes: 'Saturday - pickup shots' }
    ]
  },
  PART_TIME_WORKER: {
    name: 'Part-Time Worker (3 days)',
    generateDailyBreakdown: (baseDate, payRate) => [
      { date: addDays(baseDate, 0), checkIn: '10:00', checkOut: '16:00', breakStart: '13:00', breakEnd: '13:30', hours: 5.5, notes: 'Monday - office scenes' },
      { date: addDays(baseDate, 2), checkIn: '09:00', checkOut: '14:00', breakStart: '11:30', breakEnd: '12:00', hours: 4.5, notes: 'Wednesday - dialogue coach' },
      { date: addDays(baseDate, 4), checkIn: '11:00', checkOut: '19:00', breakStart: '15:00', breakEnd: '16:00', hours: 7.0, notes: 'Friday - evening scenes' }
    ]
  },
  WEEKEND_INTENSIVE: {
    name: 'Weekend Intensive Worker (2 days)',
    generateDailyBreakdown: (baseDate, payRate) => [
      { date: addDays(baseDate, 5), checkIn: '07:00', checkOut: '19:00', breakStart: '13:00', breakEnd: '14:00', hours: 11.0, notes: 'Saturday - location shoot' },
      { date: addDays(baseDate, 6), checkIn: '08:00', checkOut: '17:00', breakStart: '12:30', breakEnd: '13:30', hours: 8.0, notes: 'Sunday - studio work' }
    ]
  }
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString().split('T')[0]
}

function calculateBreakDuration(breakStart, breakEnd) {
  const start = new Date(`2024-01-01T${breakStart}:00`)
  const end = new Date(`2024-01-01T${breakEnd}:00`)
  return (end - start) / (1000 * 60 * 60) // Convert to hours
}

function generateDailyBreakdownData(pattern, baseDate, payRate) {
  const dailyBreakdown = pattern.generateDailyBreakdown(baseDate, payRate)
  
  return dailyBreakdown.map(day => ({
    date: day.date,
    check_in_time: day.checkIn,
    check_out_time: day.checkOut,
    break_start_time: day.breakStart,
    break_end_time: day.breakEnd,
    hours_worked: day.hours,
    break_duration: calculateBreakDuration(day.breakStart, day.breakEnd),
    daily_pay: Math.round(day.hours * payRate * 100) / 100,
    notes: day.notes,
    location: 'Main Set' // Default location
  }))
}

async function enhanceExistingTimecards() {
  console.log('🔍 Finding existing multi-day timecards...')
  
  // Find timecards that appear to be multi-day (have admin_notes with "working days")
  const { data: timecards, error } = await supabase
    .from('timecards')
    .select(`
      id,
      user_id,
      project_id,
      date,
      total_hours,
      pay_rate,
      admin_notes,
      profiles!timecards_user_id_fkey(full_name)
    `)
    .ilike('admin_notes', '%working days%')
    .is('daily_breakdown', null) // Only enhance timecards that don't already have breakdown

  if (error) {
    console.error('❌ Error fetching timecards:', error)
    return
  }

  if (!timecards || timecards.length === 0) {
    console.log('ℹ️  No multi-day timecards found to enhance')
    return
  }

  console.log(`📋 Found ${timecards.length} multi-day timecards to enhance`)

  let enhancedCount = 0

  for (const timecard of timecards) {
    try {
      console.log(`\n👤 Enhancing timecard for ${timecard.profiles?.full_name}`)
      console.log(`   Notes: ${timecard.admin_notes}`)
      
      // Determine pattern based on admin_notes
      let pattern
      if (timecard.admin_notes.includes('5 working days')) {
        pattern = ENHANCED_PATTERNS.CONSISTENT_FULL_TIME
      } else if (timecard.admin_notes.includes('4 working days')) {
        pattern = ENHANCED_PATTERNS.VARIABLE_HOURS
      } else if (timecard.admin_notes.includes('6 working days')) {
        pattern = ENHANCED_PATTERNS.OVERTIME_WORKER
      } else if (timecard.admin_notes.includes('3 working days')) {
        pattern = ENHANCED_PATTERNS.PART_TIME_WORKER
      } else if (timecard.admin_notes.includes('2 working days')) {
        pattern = ENHANCED_PATTERNS.WEEKEND_INTENSIVE
      } else {
        console.log('   ⚠️  Unknown pattern, skipping...')
        continue
      }

      // Generate daily breakdown
      const baseDate = new Date(timecard.date)
      const dailyBreakdown = generateDailyBreakdownData(pattern, baseDate, timecard.pay_rate || 25)
      
      console.log(`   📅 Generated ${dailyBreakdown.length} daily entries`)
      
      // Update timecard with daily breakdown
      const { error: updateError } = await supabase
        .from('timecards')
        .update({
          daily_breakdown: dailyBreakdown,
          updated_at: new Date().toISOString()
        })
        .eq('id', timecard.id)

      if (updateError) {
        console.error(`   ❌ Failed to update timecard:`, updateError)
        continue
      }

      console.log(`   ✅ Enhanced timecard with daily breakdown`)
      enhancedCount++

      // Brief delay between updates
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error) {
      console.error(`   ❌ Error enhancing timecard:`, error.message)
    }
  }

  console.log(`\n🎉 Enhancement complete!`)
  console.log(`📊 Successfully enhanced ${enhancedCount} out of ${timecards.length} timecards`)
  
  // Show enhanced timecards summary
  await showEnhancedSummary()
}

async function showEnhancedSummary() {
  console.log('\n📈 Enhanced Multi-Day Timecards Summary:')
  
  const { data: enhanced } = await supabase
    .from('timecards')
    .select(`
      id,
      total_hours,
      total_pay,
      daily_breakdown,
      admin_notes,
      profiles!timecards_user_id_fkey(full_name)
    `)
    .not('daily_breakdown', 'is', null)
    .order('total_hours', { ascending: false })

  if (enhanced && enhanced.length > 0) {
    enhanced.forEach((timecard, index) => {
      const userName = timecard.profiles?.full_name || 'Unknown User'
      const dailyCount = timecard.daily_breakdown?.length || 0
      
      console.log(`\n   ${index + 1}. 👤 ${userName}:`)
      console.log(`      Total Hours: ${timecard.total_hours} hours across ${dailyCount} days`)
      console.log(`      Total Pay: ${timecard.total_pay}`)
      console.log(`      Pattern: ${timecard.admin_notes}`)
      
      if (timecard.daily_breakdown && timecard.daily_breakdown.length > 0) {
        console.log(`      Daily Breakdown:`)
        timecard.daily_breakdown.forEach((day, dayIndex) => {
          console.log(`        ${dayIndex + 1}. ${day.date}: ${day.hours_worked}h (${day.check_in_time}-${day.check_out_time}) - ${day.notes}`)
        })
      }
    })
  }
}

async function createNewEnhancedTimecard() {
  console.log('\n🆕 Creating a new enhanced multi-day timecard as example...')
  
  // Get a test user and project
  const { data: assignment } = await supabase
    .from('team_assignments')
    .select(`
      user_id,
      project_id,
      pay_rate,
      profiles!inner(full_name)
    `)
    .limit(1)
    .single()

  if (!assignment) {
    console.log('   ⚠️  No team assignments found for demo')
    return
  }

  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - 7) // Last week
  const dateStr = baseDate.toISOString().split('T')[0]
  
  const pattern = ENHANCED_PATTERNS.VARIABLE_HOURS
  const dailyBreakdown = generateDailyBreakdownData(pattern, baseDate, assignment.pay_rate || 25)
  
  // Calculate totals from daily breakdown
  const totalHours = dailyBreakdown.reduce((sum, day) => sum + day.hours_worked, 0)
  const totalBreakTime = dailyBreakdown.reduce((sum, day) => sum + day.break_duration, 0)
  const totalPay = dailyBreakdown.reduce((sum, day) => sum + day.daily_pay, 0)

  const timecardData = {
    user_id: assignment.user_id,
    project_id: assignment.project_id,
    date: dateStr,
    status: 'draft',
    pay_rate: assignment.pay_rate || 25,
    total_hours: totalHours,
    break_duration: totalBreakTime,
    total_pay: totalPay,
    admin_notes: `${pattern.name} - Enhanced with daily breakdown`,
    daily_breakdown: dailyBreakdown,
    // Representative times (first day)
    check_in_time: dailyBreakdown[0].check_in_time,
    check_out_time: dailyBreakdown[0].check_out_time,
    break_start_time: dailyBreakdown[0].break_start_time,
    break_end_time: dailyBreakdown[0].break_end_time
  }

  const { data, error } = await supabase
    .from('timecards')
    .insert(timecardData)
    .select()
    .single()

  if (error) {
    console.error('   ❌ Failed to create enhanced timecard:', error)
    return
  }

  console.log(`   ✅ Created enhanced timecard for ${assignment.profiles.full_name}`)
  console.log(`   📊 ${totalHours} hours across ${dailyBreakdown.length} days = $${totalPay}`)
  console.log(`   📅 Daily breakdown with ${dailyBreakdown.length} unique day entries`)
}

// Run the enhancement
if (require.main === module) {
  console.log('🚀 Starting multi-day timecard enhancement...')
  
  enhanceExistingTimecards()
    .then(() => createNewEnhancedTimecard())
    .then(() => {
      console.log('\n✅ Enhancement script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Enhancement script failed:', error)
      process.exit(1)
    })
}

module.exports = { enhanceExistingTimecards }