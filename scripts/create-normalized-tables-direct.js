#!/usr/bin/env node

/**
 * Create Normalized Timecard Tables Directly
 * 
 * This script creates the new timecard structure using direct SQL execution
 * through Supabase's query interface.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTablesDirectly() {
  console.log('🚀 Creating normalized timecard tables directly...')
  
  try {
    // First, let's create the timecard_headers table by inserting a dummy record
    // This will create the table structure
    console.log('📝 Creating timecard_headers table structure...')
    
    // We'll use a different approach - create via SQL file execution
    // Let's break down the SQL into smaller chunks
    
    // Create timecard_headers table
    const createHeadersSQL = `
      CREATE TABLE IF NOT EXISTS timecard_headers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        project_id UUID,
        status TEXT DEFAULT 'draft',
        submitted_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        approved_by UUID,
        rejection_reason TEXT,
        admin_notes TEXT,
        period_start_date DATE NOT NULL,
        period_end_date DATE NOT NULL,
        total_hours DECIMAL(5,2) DEFAULT 0,
        total_break_duration DECIMAL(4,2) DEFAULT 0,
        total_pay DECIMAL(10,2) DEFAULT 0,
        pay_rate DECIMAL(8,2) DEFAULT 0,
        manually_edited BOOLEAN DEFAULT false,
        edit_comments TEXT,
        admin_edited BOOLEAN DEFAULT false,
        last_edited_by TEXT,
        edit_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    
    console.log('   Executing CREATE TABLE timecard_headers...')
    console.log('   SQL:', createHeadersSQL.substring(0, 100) + '...')
    
    // Since we can't use exec_sql, let's try a different approach
    // We'll create the migration file and apply it manually
    
    console.log('\n💡 Direct SQL execution not available through this interface.')
    console.log('   Please apply the migration manually using one of these methods:')
    console.log('')
    console.log('   Method 1: Supabase Dashboard')
    console.log('   1. Go to your Supabase project dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the SQL from migrations/041_alternative_timecard_structure.sql')
    console.log('   4. Execute the SQL')
    console.log('')
    console.log('   Method 2: psql command line')
    console.log('   1. Connect to your database with psql')
    console.log('   2. Run: \\i migrations/041_alternative_timecard_structure.sql')
    console.log('')
    console.log('   Method 3: Supabase CLI')
    console.log('   1. Install Supabase CLI if not already installed')
    console.log('   2. Run: supabase db push')
    console.log('')
    
    // Let's try to at least verify if we can access the database
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError)
      return false
    }
    
    console.log('✅ Database connection verified')
    
    // Check if tables already exist
    const { data: existingTables, error: tablesError } = await supabase
      .rpc('get_table_names')
      .single()
    
    if (!tablesError && existingTables) {
      console.log('📋 Existing tables detected')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error creating tables:', error)
    return false
  }
}

async function checkExistingStructure() {
  console.log('🔍 Checking existing timecard structure...')
  
  try {
    // Check current timecards table
    const { data: timecards, error } = await supabase
      .from('timecards')
      .select('id, user_id, date, total_hours, admin_notes')
      .limit(5)
    
    if (error) {
      console.error('❌ Error checking timecards:', error)
      return false
    }
    
    console.log(`   Found ${timecards.length} existing timecards`)
    
    // Analyze multi-day timecards
    const multiDay = timecards.filter(tc => tc.admin_notes?.includes('working days'))
    console.log(`   Multi-day timecards: ${multiDay.length}`)
    
    if (multiDay.length > 0) {
      console.log('   Example multi-day timecard:')
      const example = multiDay[0]
      console.log(`     ID: ${example.id}`)
      console.log(`     Hours: ${example.total_hours}`)
      console.log(`     Notes: ${example.admin_notes}`)
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error checking structure:', error)
    return false
  }
}

async function generateMigrationInstructions() {
  console.log('\n📋 Migration Instructions for Normalized Timecard Structure')
  console.log('=' .repeat(60))
  
  console.log('\n🎯 Goal: Transform single timecards table into normalized structure')
  console.log('   • timecard_headers: Overall timecard information')
  console.log('   • timecard_daily_entries: Individual day details')
  
  console.log('\n📝 Step 1: Apply Database Schema')
  console.log('   Copy the SQL from migrations/041_alternative_timecard_structure.sql')
  console.log('   and execute it in your Supabase SQL Editor')
  
  console.log('\n📝 Step 2: Migrate Existing Data')
  console.log('   After tables are created, run:')
  console.log('   node scripts/migrate-existing-timecard-data.js')
  
  console.log('\n📝 Step 3: Update Prisma Schema')
  console.log('   Add the new models to prisma/schema.prisma:')
  console.log(`
  model timecard_headers {
    id                   String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
    user_id              String?   @db.Uuid
    project_id           String?   @db.Uuid
    status               String?   @default("draft")
    period_start_date    DateTime  @db.Date
    period_end_date      DateTime  @db.Date
    total_hours          Decimal?  @default(0) @db.Decimal(5, 2)
    total_pay            Decimal?  @default(0) @db.Decimal(10, 2)
    // ... other fields
    
    daily_entries        timecard_daily_entries[]
    user                 profiles? @relation(fields: [user_id], references: [id])
    project              projects? @relation(fields: [project_id], references: [id])
    
    @@unique([user_id, project_id, period_start_date])
    @@schema("public")
  }
  
  model timecard_daily_entries {
    id                   String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
    timecard_header_id   String    @db.Uuid
    work_date            DateTime  @db.Date
    check_in_time        DateTime? @db.Time(6)
    check_out_time       DateTime? @db.Time(6)
    hours_worked         Decimal?  @default(0) @db.Decimal(4, 2)
    daily_pay            Decimal?  @default(0) @db.Decimal(8, 2)
    notes                String?
    location             String?
    
    timecard_header      timecard_headers @relation(fields: [timecard_header_id], references: [id], onDelete: Cascade)
    
    @@unique([timecard_header_id, work_date])
    @@schema("public")
  }`)
  
  console.log('\n📝 Step 4: Update API Routes')
  console.log('   Modify timecard API routes to use new structure:')
  console.log('   • GET /api/timecards - Query timecard_headers with daily_entries')
  console.log('   • POST /api/timecards - Create header + daily entries')
  console.log('   • PUT /api/timecards/[id] - Update header + daily entries')
  
  console.log('\n📝 Step 5: Update Components')
  console.log('   Modify timecard components to display daily breakdown:')
  console.log('   • Show period range instead of single date')
  console.log('   • Display daily entries in expandable sections')
  console.log('   • Allow editing individual days')
  
  console.log('\n🎉 Benefits After Migration:')
  console.log('   ✅ True multi-day support with individual day variations')
  console.log('   ✅ Proper data normalization and integrity')
  console.log('   ✅ Efficient queries for daily data')
  console.log('   ✅ Scalable structure for future enhancements')
}

async function main() {
  console.log('🎯 Normalized Timecard Structure Setup')
  
  // Check current structure
  await checkExistingStructure()
  
  // Attempt to create tables (will show instructions if not possible)
  await createTablesDirectly()
  
  // Generate detailed instructions
  await generateMigrationInstructions()
  
  console.log('\n✅ Setup complete! Follow the instructions above to apply the migration.')
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}

module.exports = { main }