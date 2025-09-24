#!/usr/bin/env node

/**
 * Timecard Structure Migration Helper
 * 
 * This script helps you choose between two approaches for fixing multi-day timecards:
 * 
 * Option 1: Enhance existing structure with daily_breakdown JSONB field
 * Option 2: Restructure with normalized timecard_headers and timecard_daily_entries tables
 * 
 * Run with --option=1 or --option=2 to apply the chosen approach
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeCurrentTimecards() {
  console.log('🔍 Analyzing current timecard structure...')
  
  const { data: timecards, error } = await supabase
    .from('timecards')
    .select(`
      id,
      user_id,
      date,
      total_hours,
      admin_notes,
      profiles!timecards_user_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error fetching timecards:', error)
    return
  }

  console.log(`\n📊 Found ${timecards.length} recent timecards`)
  
  // Analyze patterns
  const singleDay = timecards.filter(tc => !tc.admin_notes?.includes('working days'))
  const multiDay = timecards.filter(tc => tc.admin_notes?.includes('working days'))
  
  console.log(`   • Single-day timecards: ${singleDay.length}`)
  console.log(`   • Multi-day timecards: ${multiDay.length}`)
  
  if (multiDay.length > 0) {
    console.log('\n📋 Multi-day timecard examples:')
    multiDay.slice(0, 3).forEach((tc, i) => {
      const workingDaysMatch = tc.admin_notes?.match(/(\d+) working days/)
      const days = workingDaysMatch ? workingDaysMatch[1] : '?'
      console.log(`   ${i + 1}. ${tc.profiles?.full_name}: ${tc.total_hours}h across ${days} days`)
    })
  }
  
  return { singleDay: singleDay.length, multiDay: multiDay.length }
}

async function applyOption1() {
  console.log('\n🚀 Applying Option 1: Enhanced JSONB Structure')
  console.log('   • Adding daily_breakdown JSONB field to existing timecards table')
  console.log('   • Maintains backward compatibility')
  console.log('   • Allows detailed daily breakdown while keeping aggregated totals')
  
  try {
    // Read and execute the migration
    const migrationPath = path.join(__dirname, '..', 'migrations', '040_add_daily_breakdown_to_timecards.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error(`❌ Error executing statement: ${statement.substring(0, 50)}...`)
          console.error(error)
          return false
        }
      }
    }
    
    console.log('✅ Migration applied successfully')
    
    // Run the enhancement script
    console.log('\n📝 Running timecard enhancement script...')
    const { enhanceExistingTimecards } = require('./enhance-multi-day-timecards.js')
    await enhanceExistingTimecards()
    
    return true
    
  } catch (error) {
    console.error('❌ Failed to apply Option 1:', error)
    return false
  }
}

async function applyOption2() {
  console.log('\n🚀 Applying Option 2: Normalized Table Structure')
  console.log('   • Creating timecard_headers and timecard_daily_entries tables')
  console.log('   • Migrating existing data to new structure')
  console.log('   • More complex but provides better data integrity')
  
  try {
    // Read and execute the migration
    const migrationPath = path.join(__dirname, '..', 'migrations', '041_alternative_timecard_structure.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error(`❌ Error executing statement: ${statement.substring(0, 50)}...`)
          console.error(error)
          return false
        }
      }
    }
    
    console.log('✅ New table structure created')
    
    // Migrate existing data
    await migrateExistingData()
    
    return true
    
  } catch (error) {
    console.error('❌ Failed to apply Option 2:', error)
    return false
  }
}

async function migrateExistingData() {
  console.log('\n📦 Migrating existing timecard data to new structure...')
  
  const { data: timecards, error } = await supabase
    .from('timecards')
    .select('*')
    .order('created_at')
  
  if (error) {
    console.error('❌ Error fetching existing timecards:', error)
    return
  }
  
  console.log(`   Found ${timecards.length} timecards to migrate`)
  
  let migratedCount = 0
  
  for (const timecard of timecards) {
    try {
      // Create header
      const headerData = {
        id: timecard.id, // Keep same ID
        user_id: timecard.user_id,
        project_id: timecard.project_id,
        status: timecard.status,
        submitted_at: timecard.submitted_at,
        approved_at: timecard.approved_at,
        approved_by: timecard.approved_by,
        rejection_reason: timecard.rejection_reason,
        admin_notes: timecard.admin_notes,
        period_start_date: timecard.date,
        period_end_date: timecard.date, // Single day by default
        total_hours: timecard.total_hours,
        total_break_duration: timecard.break_duration,
        total_pay: timecard.total_pay,
        pay_rate: timecard.pay_rate,
        manually_edited: timecard.manually_edited,
        edit_comments: timecard.edit_comments,
        admin_edited: timecard.admin_edited,
        last_edited_by: timecard.last_edited_by,
        edit_type: timecard.edit_type,
        created_at: timecard.created_at,
        updated_at: timecard.updated_at
      }
      
      const { error: headerError } = await supabase
        .from('timecard_headers')
        .insert(headerData)
      
      if (headerError) {
        console.error(`   ❌ Failed to create header for timecard ${timecard.id}:`, headerError)
        continue
      }
      
      // Create daily entry
      const dailyEntryData = {
        timecard_header_id: timecard.id,
        work_date: timecard.date,
        check_in_time: timecard.check_in_time,
        check_out_time: timecard.check_out_time,
        break_start_time: timecard.break_start_time,
        break_end_time: timecard.break_end_time,
        hours_worked: timecard.total_hours,
        break_duration: timecard.break_duration,
        daily_pay: timecard.total_pay,
        notes: timecard.admin_notes ? `Migrated: ${timecard.admin_notes}` : null
      }
      
      const { error: entryError } = await supabase
        .from('timecard_daily_entries')
        .insert(dailyEntryData)
      
      if (entryError) {
        console.error(`   ❌ Failed to create daily entry for timecard ${timecard.id}:`, entryError)
        continue
      }
      
      migratedCount++
      
      if (migratedCount % 10 === 0) {
        console.log(`   📊 Migrated ${migratedCount}/${timecards.length} timecards...`)
      }
      
    } catch (error) {
      console.error(`   ❌ Error migrating timecard ${timecard.id}:`, error)
    }
  }
  
  console.log(`✅ Successfully migrated ${migratedCount} out of ${timecards.length} timecards`)
}

function showOptions() {
  console.log('\n📋 Multi-Day Timecard Structure Options:')
  console.log('\n🔧 Option 1: Enhanced JSONB Structure (Recommended)')
  console.log('   Pros:')
  console.log('   • ✅ Maintains existing database structure')
  console.log('   • ✅ Full backward compatibility')
  console.log('   • ✅ Quick to implement')
  console.log('   • ✅ Flexible daily breakdown storage')
  console.log('   • ✅ No breaking changes to existing code')
  console.log('   ')
  console.log('   Cons:')
  console.log('   • ⚠️  JSONB queries are less efficient than normalized tables')
  console.log('   • ⚠️  Requires application-level validation of daily data')
  console.log('')
  
  console.log('🔧 Option 2: Normalized Table Structure')
  console.log('   Pros:')
  console.log('   • ✅ Proper relational database design')
  console.log('   • ✅ Better data integrity and validation')
  console.log('   • ✅ More efficient queries for daily data')
  console.log('   • ✅ Easier to add daily-specific features')
  console.log('   ')
  console.log('   Cons:')
  console.log('   • ⚠️  Requires updating all timecard-related code')
  console.log('   • ⚠️  More complex migration process')
  console.log('   • ⚠️  Breaking changes to existing APIs')
  console.log('   • ⚠️  Need to update Prisma schema and types')
  console.log('')
  
  console.log('💡 Recommendation: Start with Option 1 for quick implementation,')
  console.log('   then consider Option 2 for long-term scalability if needed.')
}

async function main() {
  const args = process.argv.slice(2)
  const optionArg = args.find(arg => arg.startsWith('--option='))
  const option = optionArg ? optionArg.split('=')[1] : null
  
  console.log('🎯 Multi-Day Timecard Structure Migration Tool')
  
  // Analyze current state
  const analysis = await analyzeCurrentTimecards()
  
  if (!analysis) {
    console.error('❌ Failed to analyze current timecards')
    process.exit(1)
  }
  
  if (analysis.multiDay === 0) {
    console.log('\nℹ️  No multi-day timecards found. You may want to create some test data first.')
    console.log('   Run: node scripts/create-multi-day-timecards.js')
    process.exit(0)
  }
  
  if (!option) {
    showOptions()
    console.log('\n🚀 To apply an option, run:')
    console.log('   node scripts/migrate-timecard-structure.js --option=1')
    console.log('   node scripts/migrate-timecard-structure.js --option=2')
    process.exit(0)
  }
  
  let success = false
  
  if (option === '1') {
    success = await applyOption1()
  } else if (option === '2') {
    success = await applyOption2()
  } else {
    console.error('❌ Invalid option. Use --option=1 or --option=2')
    process.exit(1)
  }
  
  if (success) {
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📝 Next steps:')
    
    if (option === '1') {
      console.log('   1. Update your components to use the new EnhancedMultiDayDisplay')
      console.log('   2. Test the daily breakdown functionality')
      console.log('   3. Consider creating more detailed multi-day timecards')
    } else {
      console.log('   1. Update Prisma schema to include new tables')
      console.log('   2. Regenerate Prisma client: npx prisma generate')
      console.log('   3. Update all timecard-related API routes and components')
      console.log('   4. Test the new normalized structure')
    }
    
    console.log('\n✅ Your multi-day timecard system is now ready!')
  } else {
    console.log('\n❌ Migration failed. Please check the errors above.')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}

module.exports = { analyzeCurrentTimecards, applyOption1, applyOption2 }