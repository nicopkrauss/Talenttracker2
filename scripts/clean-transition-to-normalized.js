#!/usr/bin/env node

/**
 * Clean Transition to Normalized Timecard Structure
 * 
 * Since only test data exists, we can safely:
 * 1. Drop the old timecards table
 * 2. Update all API routes to use new structure
 * 3. Remove old Prisma model
 * 4. Update all components
 */

const fs = require('fs')
const path = require('path')

const API_ROUTES_TO_UPDATE = [
  'app/api/timecards/route.ts',
  'app/api/timecards/[id]/route.ts',
  'app/api/timecards/approve/route.ts', 
  'app/api/timecards/reject/route.ts',
  'app/api/timecards/edit/route.ts'
]

const PAGES_TO_UPDATE = [
  'app/(app)/timecards/page.tsx',
  'app/(app)/timecards/[id]/page.tsx',
  'app/(app)/timecards/[id]/edit/page.tsx'
]

function generateDropTableSQL() {
  return `
-- Clean Transition: Drop Old Timecards Table
-- Since only test data exists, we can safely remove the old structure

-- Drop the old timecards table
DROP TABLE IF EXISTS timecards CASCADE;

-- Remove any remaining references or constraints
-- (This will automatically handle foreign key constraints)

-- Verify new tables exist
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('timecard_headers', 'timecard_daily_entries')
ORDER BY table_name, ordinal_position;
`
}

function generateUpdatedPrismaSchema() {
  return `
// Remove the old timecards model from prisma/schema.prisma
// Keep only the new normalized models:

model timecard_headers {
  id                   String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id              String?   @db.Uuid
  project_id           String?   @db.Uuid
  
  // Timecard metadata
  status               timecard_status? @default(draft)
  submitted_at         DateTime? @db.Timestamptz(6)
  approved_at          DateTime? @db.Timestamptz(6)
  approved_by          String?   @db.Uuid
  rejection_reason     String?
  admin_notes          String?
  
  // Period information
  period_start_date    DateTime  @db.Date
  period_end_date      DateTime  @db.Date
  
  // Calculated totals (computed from daily entries)
  total_hours          Decimal?  @default(0) @db.Decimal(5, 2)
  total_break_duration Decimal?  @default(0) @db.Decimal(4, 2)
  total_pay            Decimal?  @default(0) @db.Decimal(10, 2)
  
  // Metadata
  pay_rate             Decimal?  @default(0) @db.Decimal(8, 2)
  manually_edited      Boolean?  @default(false)
  edit_comments        String?
  admin_edited         Boolean?  @default(false)
  last_edited_by       String?
  edit_type            String?
  
  created_at           DateTime? @default(now()) @db.Timestamptz(6)
  updated_at           DateTime? @default(now()) @db.Timestamptz(6)
  
  // Relations
  daily_entries        timecard_daily_entries[]
  user                 profiles? @relation("timecard_headers_user", fields: [user_id], references: [id], onDelete: Cascade)
  project              projects? @relation("timecard_headers_project", fields: [project_id], references: [id], onDelete: Cascade)
  approved_by_profile  profiles? @relation("timecard_headers_approved_by", fields: [approved_by], references: [id])
  
  @@unique([user_id, project_id, period_start_date])
  @@index([user_id, project_id])
  @@index([status])
  @@index([period_start_date, period_end_date])
  @@index([submitted_at])
  @@schema("public")
}

model timecard_daily_entries {
  id                   String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  timecard_header_id   String    @db.Uuid
  
  // Day information
  work_date            DateTime  @db.Date
  
  // Time tracking
  check_in_time        DateTime? @db.Time(6)
  check_out_time       DateTime? @db.Time(6)
  break_start_time     DateTime? @db.Time(6)
  break_end_time       DateTime? @db.Time(6)
  
  // Calculated values
  hours_worked         Decimal?  @default(0) @db.Decimal(4, 2)
  break_duration       Decimal?  @default(0) @db.Decimal(3, 2)
  daily_pay            Decimal?  @default(0) @db.Decimal(8, 2)
  
  created_at           DateTime? @default(now()) @db.Timestamptz(6)
  updated_at           DateTime? @default(now()) @db.Timestamptz(6)
  
  // Relations
  timecard_header      timecard_headers @relation(fields: [timecard_header_id], references: [id], onDelete: Cascade)
  
  @@unique([timecard_header_id, work_date])
  @@index([timecard_header_id])
  @@index([work_date])
  @@schema("public")
}
`
}

function analyzeCurrentFiles() {
  console.log('🔍 Analyzing files that need updates...')
  
  const analysis = {
    apiRoutes: [],
    pages: [],
    prismaSchema: null
  }
  
  // Check API routes
  API_ROUTES_TO_UPDATE.forEach(route => {
    const filePath = path.join(process.cwd(), route)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      analysis.apiRoutes.push({
        file: route,
        exists: true,
        usesOldTable: content.includes("from('timecards')"),
        content: content
      })
    } else {
      analysis.apiRoutes.push({
        file: route,
        exists: false
      })
    }
  })
  
  // Check pages
  PAGES_TO_UPDATE.forEach(page => {
    const filePath = path.join(process.cwd(), page)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      analysis.pages.push({
        file: page,
        exists: true,
        usesOldAPI: content.includes('/api/timecards') && !content.includes('/api/timecards-v2'),
        content: content
      })
    } else {
      analysis.pages.push({
        file: page,
        exists: false
      })
    }
  })
  
  // Check Prisma schema
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma')
  if (fs.existsSync(schemaPath)) {
    const content = fs.readFileSync(schemaPath, 'utf8')
    analysis.prismaSchema = {
      exists: true,
      hasOldModel: content.includes('model timecards {'),
      hasNewModels: content.includes('model timecard_headers') && content.includes('model timecard_daily_entries')
    }
  }
  
  return analysis
}

function generateTransitionPlan(analysis) {
  console.log('\n📋 Clean Transition Plan')
  console.log('=' .repeat(50))
  
  console.log('\n🗑️  Step 1: Drop Old Table')
  console.log('   Execute SQL to drop old timecards table')
  console.log('   (Safe since only test data exists)')
  
  console.log('\n🔧 Step 2: Update API Routes')
  const apiNeedingUpdate = analysis.apiRoutes.filter(r => r.exists && r.usesOldTable)
  if (apiNeedingUpdate.length > 0) {
    apiNeedingUpdate.forEach(route => {
      console.log(`   📝 ${route.file} - Replace with normalized structure`)
    })
  } else {
    console.log('   ✅ No API routes need updating')
  }
  
  console.log('\n🎨 Step 3: Update Pages')
  const pagesNeedingUpdate = analysis.pages.filter(p => p.exists && p.usesOldAPI)
  if (pagesNeedingUpdate.length > 0) {
    pagesNeedingUpdate.forEach(page => {
      console.log(`   📝 ${page.file} - Update to use new API`)
    })
  } else {
    console.log('   ✅ No pages need updating')
  }
  
  console.log('\n📊 Step 4: Update Prisma Schema')
  if (analysis.prismaSchema?.hasOldModel) {
    console.log('   📝 Remove old timecards model from schema')
    console.log('   📝 Keep only normalized models')
    console.log('   📝 Run: npx prisma generate')
  } else {
    console.log('   ✅ Prisma schema already clean')
  }
  
  console.log('\n🧪 Step 5: Test Everything')
  console.log('   📝 Test timecard creation')
  console.log('   📝 Test timecard listing')
  console.log('   📝 Test approval/rejection')
  console.log('   📝 Test multi-day functionality')
  
  return {
    needsTableDrop: true,
    apiUpdatesNeeded: apiNeedingUpdate.length,
    pageUpdatesNeeded: pagesNeedingUpdate.length,
    needsPrismaUpdate: analysis.prismaSchema?.hasOldModel || false
  }
}

function generateMigrationSQL() {
  console.log('\n📄 SQL Migration for Clean Transition:')
  console.log('=' .repeat(40))
  
  const sql = generateDropTableSQL()
  console.log(sql)
  
  console.log('\n💡 To apply this migration:')
  console.log('   1. Go to Supabase SQL Editor')
  console.log('   2. Copy and paste the SQL above')
  console.log('   3. Execute it')
  console.log('   4. Verify new tables are working')
}

function generateFileUpdates() {
  console.log('\n📝 File Update Instructions:')
  console.log('=' .repeat(30))
  
  console.log('\n🔧 API Route Updates:')
  console.log('   Replace all instances of:')
  console.log('   ❌ .from("timecards")')
  console.log('   ✅ .from("timecard_headers")')
  console.log('')
  console.log('   Add daily entries relation:')
  console.log('   ✅ .select(`')
  console.log('       id, user_id, project_id, status,')
  console.log('       period_start_date, period_end_date,')
  console.log('       total_hours, total_pay,')
  console.log('       daily_entries:timecard_daily_entries(*)')
  console.log('     `)')
  
  console.log('\n🎨 Page Updates:')
  console.log('   Replace all instances of:')
  console.log('   ❌ /api/timecards')
  console.log('   ✅ /api/timecards-v2')
  console.log('')
  console.log('   Update components:')
  console.log('   ❌ <MultiDayTimecardDetail>')
  console.log('   ✅ <NormalizedTimecardDisplay>')
  
  console.log('\n📊 Prisma Schema Updates:')
  console.log('   1. Remove entire "model timecards" block')
  console.log('   2. Keep only timecard_headers and timecard_daily_entries')
  console.log('   3. Update profiles relations to remove old timecard references')
  console.log('   4. Run: npx prisma generate')
}

async function main() {
  console.log('🎯 Clean Transition to Normalized Timecard Structure')
  console.log('   Since only test data exists, we can do a complete migration\n')
  
  // Analyze current state
  const analysis = analyzeCurrentFiles()
  
  // Generate transition plan
  const plan = generateTransitionPlan(analysis)
  
  // Generate SQL migration
  generateMigrationSQL()
  
  // Generate file update instructions
  generateFileUpdates()
  
  console.log('\n🎉 Benefits After Clean Transition:')
  console.log('   ✅ Single source of truth (normalized structure)')
  console.log('   ✅ True multi-day support with individual day variations')
  console.log('   ✅ Cleaner codebase (no legacy code)')
  console.log('   ✅ Better performance (optimized for new structure)')
  console.log('   ✅ Easier maintenance (no dual systems)')
  
  console.log('\n🚀 Ready for Clean Transition!')
  console.log('   This will completely replace the old system with the new one.')
  console.log('   Since only test data exists, this is the perfect time to do it.')
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Analysis failed:', error)
    process.exit(1)
  })
}

module.exports = { analyzeCurrentFiles, generateTransitionPlan }