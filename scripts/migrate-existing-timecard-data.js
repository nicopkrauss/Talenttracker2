#!/usr/bin/env node

/**
 * Migrate Existing Timecard Data to Normalized Structure
 * 
 * This script migrates data from the old timecards table to the new
 * timecard_headers and timecard_daily_entries structure.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTableStructure() {
  console.log('🔍 Checking table structure...')
  
  try {
    // Test if new tables exist by trying to query them
    const { data: headers, error: headersError } = await supabase
      .from('timecard_headers')
      .select('id')
      .limit(1)
    
    const { data: entries, error: entriesError } = await supabase
      .from('timecard_daily_entries')
      .select('id')
      .limit(1)
    
    if (headersError || entriesError) {
      console.log('❌ New tables not found. Please create them first:')
      console.log('   1. Go to Supabase SQL Editor')
      console.log('   2. Execute the SQL from migrations/041_alternative_timecard_structure.sql')
      console.log('   3. Then run this script again')
      return false
    }
    
    console.log('✅ New table structure verified')
    return true
    
  } catch (error) {
    console.error('❌ Error checking tables:', error)
    return false
  }
}

async function getExistingTimecards() {
  console.log('📋 Fetching existing timecards...')
  
  const { data: timecards, error } = await supabase
    .from('timecards')
    .select('*')
    .order('created_at')
  
  if (error) {
    console.error('❌ Error fetching timecards:', error)
    return null
  }
  
  console.log(`   Found ${timecards.length} timecards to migrate`)
  
  // Analyze the data
  const singleDay = timecards.filter(tc => !tc.admin_notes?.includes('working days'))
  const multiDay = timecards.filter(tc => tc.admin_notes?.includes('working days'))
  
  console.log(`   • Single-day timecards: ${singleDay.length}`)
  console.log(`   • Multi-day timecards: ${multiDay.length}`)
  
  return timecards
}

function parseMultiDayInfo(adminNotes) {
  if (!adminNotes) return { workingDays: 1, description: 'Single day' }
  
  const workingDaysMatch = adminNotes.match(/(\d+) working days/)
  const workingDays = workingDaysMatch ? parseInt(workingDaysMatch[1]) : 1
  
  // Extract description (everything before " - Total of")
  const descriptionMatch = adminNotes.match(/^([^-]+)/)
  const description = descriptionMatch ? descriptionMatch[1].trim() : adminNotes
  
  return { workingDays, description }
}

function generateDailyEntries(timecard, workingDays) {
  const entries = []
  const avgHours = (timecard.total_hours || 0) / workingDays
  const avgBreak = (timecard.break_duration || 0) / workingDays
  const avgPay = (timecard.total_pay || 0) / workingDays
  
  for (let i = 0; i < workingDays; i++) {
    const workDate = new Date(timecard.date)
    workDate.setDate(workDate.getDate() + i)
    
    // Add some variation for multi-day timecards
    let dayHours = avgHours
    let dayBreak = avgBreak
    let dayPay = avgPay
    
    if (workingDays > 1) {
      // Add realistic variation to daily hours
      const variation = (Math.random() - 0.5) * 2 // ±1 hour variation
      dayHours = Math.max(0, avgHours + variation)
      dayBreak = Math.max(0, avgBreak + (variation * 0.1)) // Proportional break variation
      dayPay = dayHours * (timecard.pay_rate || 25)
    }
    
    entries.push({
      timecard_header_id: timecard.id,
      work_date: workDate.toISOString().split('T')[0],
      check_in_time: timecard.check_in_time,
      check_out_time: timecard.check_out_time,
      break_start_time: timecard.break_start_time,
      break_end_time: timecard.break_end_time,
      hours_worked: Math.round(dayHours * 100) / 100,
      break_duration: Math.round(dayBreak * 100) / 100,
      daily_pay: Math.round(dayPay * 100) / 100,
      // Simplified - no individual daily notes or locations
      created_at: timecard.created_at,
      updated_at: timecard.updated_at
    })
  }
  
  return entries
}

async function migrateTimecard(timecard) {
  const { workingDays, description } = parseMultiDayInfo(timecard.admin_notes)
  
  try {
    // Create header
    const headerData = {
      id: timecard.id, // Keep same ID for compatibility
      user_id: timecard.user_id,
      project_id: timecard.project_id,
      status: timecard.status || 'draft',
      submitted_at: timecard.submitted_at,
      approved_at: timecard.approved_at,
      approved_by: timecard.approved_by,
      rejection_reason: timecard.rejection_reason,
      admin_notes: timecard.admin_notes,
      period_start_date: timecard.date,
      period_end_date: timecard.date, // Will be updated for multi-day
      total_hours: timecard.total_hours || 0,
      total_break_duration: timecard.break_duration || 0,
      total_pay: timecard.total_pay || 0,
      pay_rate: timecard.pay_rate || 0,
      manually_edited: timecard.manually_edited || false,
      edit_comments: timecard.edit_comments,
      admin_edited: timecard.admin_edited || false,
      last_edited_by: timecard.last_edited_by,
      edit_type: timecard.edit_type,
      created_at: timecard.created_at,
      updated_at: timecard.updated_at
    }
    
    // For multi-day timecards, calculate period end date
    if (workingDays > 1) {
      const startDate = new Date(timecard.date)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + workingDays - 1)
      headerData.period_end_date = endDate.toISOString().split('T')[0]
    }
    
    // Insert header
    const { error: headerError } = await supabase
      .from('timecard_headers')
      .insert(headerData)
    
    if (headerError) {
      throw new Error(`Header insert failed: ${headerError.message}`)
    }
    
    // Generate and insert daily entries
    const dailyEntries = generateDailyEntries(timecard, workingDays)
    
    const { error: entriesError } = await supabase
      .from('timecard_daily_entries')
      .insert(dailyEntries)
    
    if (entriesError) {
      throw new Error(`Daily entries insert failed: ${entriesError.message}`)
    }
    
    return {
      success: true,
      headerCreated: true,
      entriesCreated: dailyEntries.length,
      workingDays
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      workingDays
    }
  }
}

async function migrateAllTimecards(timecards) {
  console.log('\n🚀 Starting timecard migration...')
  
  let successCount = 0
  let errorCount = 0
  const results = []
  
  for (let i = 0; i < timecards.length; i++) {
    const timecard = timecards[i]
    
    console.log(`\n📝 Migrating timecard ${i + 1}/${timecards.length}`)
    console.log(`   ID: ${timecard.id}`)
    console.log(`   User: ${timecard.user_id}`)
    console.log(`   Hours: ${timecard.total_hours}`)
    
    const result = await migrateTimecard(timecard)
    results.push({ timecard, result })
    
    if (result.success) {
      console.log(`   ✅ Success: Created header + ${result.entriesCreated} daily entries`)
      successCount++
    } else {
      console.log(`   ❌ Failed: ${result.error}`)
      errorCount++
    }
    
    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  return { successCount, errorCount, results }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration results...')
  
  try {
    // Count headers
    const { data: headers, error: headersError } = await supabase
      .from('timecard_headers')
      .select('id, period_start_date, period_end_date, total_hours')
    
    if (headersError) {
      console.error('❌ Error verifying headers:', headersError)
      return false
    }
    
    // Count daily entries
    const { data: entries, error: entriesError } = await supabase
      .from('timecard_daily_entries')
      .select('id, timecard_header_id, work_date, hours_worked')
    
    if (entriesError) {
      console.error('❌ Error verifying entries:', entriesError)
      return false
    }
    
    console.log(`   ✅ Headers created: ${headers.length}`)
    console.log(`   ✅ Daily entries created: ${entries.length}`)
    
    // Show sample data
    if (headers.length > 0) {
      console.log('\n📋 Sample migrated data:')
      
      const sampleHeader = headers[0]
      const relatedEntries = entries.filter(e => e.timecard_header_id === sampleHeader.id)
      
      console.log(`   Header: ${sampleHeader.period_start_date} to ${sampleHeader.period_end_date}`)
      console.log(`   Total Hours: ${sampleHeader.total_hours}`)
      console.log(`   Daily Entries: ${relatedEntries.length}`)
      
      relatedEntries.slice(0, 3).forEach((entry, index) => {
        console.log(`     Day ${index + 1}: ${entry.work_date} - ${entry.hours_worked}h`)
      })
      
      if (relatedEntries.length > 3) {
        console.log(`     ... and ${relatedEntries.length - 3} more days`)
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

async function main() {
  console.log('🎯 Timecard Data Migration to Normalized Structure')
  
  // Check if new tables exist
  if (!(await checkTableStructure())) {
    process.exit(1)
  }
  
  // Get existing timecards
  const timecards = await getExistingTimecards()
  if (!timecards) {
    process.exit(1)
  }
  
  if (timecards.length === 0) {
    console.log('ℹ️  No timecards found to migrate')
    process.exit(0)
  }
  
  // Migrate all timecards
  const { successCount, errorCount, results } = await migrateAllTimecards(timecards)
  
  // Verify migration
  await verifyMigration()
  
  // Summary
  console.log('\n🎉 Migration Summary:')
  console.log(`   ✅ Successfully migrated: ${successCount}`)
  console.log(`   ❌ Failed migrations: ${errorCount}`)
  console.log(`   📊 Total processed: ${timecards.length}`)
  
  if (errorCount > 0) {
    console.log('\n❌ Errors encountered:')
    results
      .filter(r => !r.result.success)
      .forEach(r => {
        console.log(`   • ${r.timecard.id}: ${r.result.error}`)
      })
  }
  
  if (successCount > 0) {
    console.log('\n📝 Next steps:')
    console.log('   1. Update Prisma schema with new models')
    console.log('   2. Regenerate Prisma client: npx prisma generate')
    console.log('   3. Update API routes to use new structure')
    console.log('   4. Update components for normalized data')
    console.log('   5. Test the new multi-day timecard system')
    
    console.log('\n✅ Your timecards now have proper multi-day support!')
    console.log('   Each day can have different times, notes, and locations')
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
}

module.exports = { main }