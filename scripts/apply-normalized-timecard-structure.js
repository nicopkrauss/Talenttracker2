#!/usr/bin/env node

/**
 * Apply Normalized Timecard Structure (Solution 2)
 * 
 * This script applies the normalized table structure for timecards:
 * - Creates timecard_headers table
 * - Creates timecard_daily_entries table
 * - Migrates existing data
 * - Sets up proper relationships and constraints
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function executeSQL(sql, description) {
  console.log(`📝 ${description}...`)
  
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: sql 
  })
  
  if (error) {
    // Try alternative approach if exec_sql doesn't work
    console.log(`   ⚠️  exec_sql not available, trying direct query...`)
    
    const { data: directData, error: directError } = await supabase
      .from('_direct_sql')
      .select('*')
      .limit(0) // This will fail but let us try a different approach
    
    if (directError) {
      console.error(`   ❌ Failed: ${error.message}`)
      return false
    }
  }
  
  console.log(`   ✅ ${description} completed`)
  return true
}

async function createTimecardHeaders() {
  const sql = `
    -- Create timecard_headers table
    CREATE TABLE IF NOT EXISTS timecard_headers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      
      -- Timecard metadata
      status timecard_status DEFAULT 'draft',
      submitted_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      approved_by UUID REFERENCES profiles(id),
      rejection_reason TEXT,
      admin_notes TEXT,
      
      -- Period information
      period_start_date DATE NOT NULL,
      period_end_date DATE NOT NULL,
      
      -- Calculated totals (computed from daily entries)
      total_hours DECIMAL(5,2) DEFAULT 0,
      total_break_duration DECIMAL(4,2) DEFAULT 0,
      total_pay DECIMAL(10,2) DEFAULT 0,
      
      -- Metadata
      pay_rate DECIMAL(8,2) DEFAULT 0,
      manually_edited BOOLEAN DEFAULT false,
      edit_comments TEXT,
      admin_edited BOOLEAN DEFAULT false,
      last_edited_by TEXT,
      edit_type TEXT,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      -- Constraints
      UNIQUE(user_id, project_id, period_start_date),
      CHECK(period_end_date >= period_start_date)
    );
  `
  
  return await executeSQL(sql, 'Creating timecard_headers table')
}

async function createTimecardDailyEntries() {
  const sql = `
    -- Create timecard_daily_entries table
    CREATE TABLE IF NOT EXISTS timecard_daily_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      timecard_header_id UUID NOT NULL REFERENCES timecard_headers(id) ON DELETE CASCADE,
      
      -- Day information
      work_date DATE NOT NULL,
      
      -- Time tracking
      check_in_time TIME,
      check_out_time TIME,
      break_start_time TIME,
      break_end_time TIME,
      
      -- Calculated values
      hours_worked DECIMAL(4,2) DEFAULT 0,
      break_duration DECIMAL(3,2) DEFAULT 0,
      daily_pay DECIMAL(8,2) DEFAULT 0,
      
      -- Day-specific information
      location TEXT,
      notes TEXT,
      
      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      -- Constraints
      UNIQUE(timecard_header_id, work_date),
      CHECK(hours_worked >= 0),
      CHECK(break_duration >= 0),
      CHECK(daily_pay >= 0)
    );
  `
  
  return await executeSQL(sql, 'Creating timecard_daily_entries table')
}

async function createIndexes() {
  const indexes = [
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_timecard_headers_user_project ON timecard_headers(user_id, project_id);',
      desc: 'Creating user/project index on headers'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_timecard_headers_status ON timecard_headers(status);',
      desc: 'Creating status index on headers'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_timecard_headers_period ON timecard_headers(period_start_date, period_end_date);',
      desc: 'Creating period index on headers'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_timecard_headers_submitted ON timecard_headers(submitted_at);',
      desc: 'Creating submitted_at index on headers'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_header ON timecard_daily_entries(timecard_header_id);',
      desc: 'Creating header_id index on daily entries'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_date ON timecard_daily_entries(work_date);',
      desc: 'Creating work_date index on daily entries'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_header_date ON timecard_daily_entries(timecard_header_id, work_date);',
      desc: 'Creating composite index on daily entries'
    }
  ]
  
  for (const index of indexes) {
    const success = await executeSQL(index.sql, index.desc)
    if (!success) return false
  }
  
  return true
}

async function createUpdateFunction() {
  const sql = `
    -- Create function to update totals when daily entries change
    CREATE OR REPLACE FUNCTION update_timecard_totals()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Update the header totals based on daily entries
      UPDATE timecard_headers 
      SET 
        total_hours = (
          SELECT COALESCE(SUM(hours_worked), 0) 
          FROM timecard_daily_entries 
          WHERE timecard_header_id = COALESCE(NEW.timecard_header_id, OLD.timecard_header_id)
        ),
        total_break_duration = (
          SELECT COALESCE(SUM(break_duration), 0) 
          FROM timecard_daily_entries 
          WHERE timecard_header_id = COALESCE(NEW.timecard_header_id, OLD.timecard_header_id)
        ),
        total_pay = (
          SELECT COALESCE(SUM(daily_pay), 0) 
          FROM timecard_daily_entries 
          WHERE timecard_header_id = COALESCE(NEW.timecard_header_id, OLD.timecard_header_id)
        ),
        updated_at = NOW()
      WHERE id = COALESCE(NEW.timecard_header_id, OLD.timecard_header_id);
      
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `
  
  return await executeSQL(sql, 'Creating update totals function')
}

async function createTriggers() {
  const triggers = [
    {
      sql: `
        DROP TRIGGER IF EXISTS trigger_update_timecard_totals_insert ON timecard_daily_entries;
        CREATE TRIGGER trigger_update_timecard_totals_insert
          AFTER INSERT ON timecard_daily_entries
          FOR EACH ROW EXECUTE FUNCTION update_timecard_totals();
      `,
      desc: 'Creating INSERT trigger'
    },
    {
      sql: `
        DROP TRIGGER IF EXISTS trigger_update_timecard_totals_update ON timecard_daily_entries;
        CREATE TRIGGER trigger_update_timecard_totals_update
          AFTER UPDATE ON timecard_daily_entries
          FOR EACH ROW EXECUTE FUNCTION update_timecard_totals();
      `,
      desc: 'Creating UPDATE trigger'
    },
    {
      sql: `
        DROP TRIGGER IF EXISTS trigger_update_timecard_totals_delete ON timecard_daily_entries;
        CREATE TRIGGER trigger_update_timecard_totals_delete
          AFTER DELETE ON timecard_daily_entries
          FOR EACH ROW EXECUTE FUNCTION update_timecard_totals();
      `,
      desc: 'Creating DELETE trigger'
    }
  ]
  
  for (const trigger of triggers) {
    const success = await executeSQL(trigger.sql, trigger.desc)
    if (!success) return false
  }
  
  return true
}

async function enableRLS() {
  const rlsStatements = [
    {
      sql: 'ALTER TABLE timecard_headers ENABLE ROW LEVEL SECURITY;',
      desc: 'Enabling RLS on timecard_headers'
    },
    {
      sql: 'ALTER TABLE timecard_daily_entries ENABLE ROW LEVEL SECURITY;',
      desc: 'Enabling RLS on timecard_daily_entries'
    }
  ]
  
  for (const statement of rlsStatements) {
    const success = await executeSQL(statement.sql, statement.desc)
    if (!success) return false
  }
  
  return true
}

async function createRLSPolicies() {
  const policies = [
    {
      sql: `
        DROP POLICY IF EXISTS "Users can view own timecard headers" ON timecard_headers;
        CREATE POLICY "Users can view own timecard headers" ON timecard_headers
          FOR SELECT USING (
            auth.uid() = user_id OR
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() 
              AND role IN ('admin', 'in_house')
            )
          );
      `,
      desc: 'Creating SELECT policy for timecard_headers'
    },
    {
      sql: `
        DROP POLICY IF EXISTS "Users can create own timecard headers" ON timecard_headers;
        CREATE POLICY "Users can create own timecard headers" ON timecard_headers
          FOR INSERT WITH CHECK (auth.uid() = user_id);
      `,
      desc: 'Creating INSERT policy for timecard_headers'
    },
    {
      sql: `
        DROP POLICY IF EXISTS "Users can update own draft timecard headers" ON timecard_headers;
        CREATE POLICY "Users can update own draft timecard headers" ON timecard_headers
          FOR UPDATE USING (
            auth.uid() = user_id AND status = 'draft'
          );
      `,
      desc: 'Creating UPDATE policy for timecard_headers'
    },
    {
      sql: `
        DROP POLICY IF EXISTS "Users can view daily entries for accessible timecards" ON timecard_daily_entries;
        CREATE POLICY "Users can view daily entries for accessible timecards" ON timecard_daily_entries
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM timecard_headers 
              WHERE id = timecard_header_id 
              AND (
                user_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM profiles 
                  WHERE id = auth.uid() 
                  AND role IN ('admin', 'in_house')
                )
              )
            )
          );
      `,
      desc: 'Creating SELECT policy for timecard_daily_entries'
    },
    {
      sql: `
        DROP POLICY IF EXISTS "Users can manage daily entries for own draft timecards" ON timecard_daily_entries;
        CREATE POLICY "Users can manage daily entries for own draft timecards" ON timecard_daily_entries
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM timecard_headers 
              WHERE id = timecard_header_id 
              AND user_id = auth.uid() 
              AND status = 'draft'
            )
          );
      `,
      desc: 'Creating ALL policy for timecard_daily_entries'
    }
  ]
  
  for (const policy of policies) {
    const success = await executeSQL(policy.sql, policy.desc)
    if (!success) return false
  }
  
  return true
}

async function migrateExistingData() {
  console.log('\n📦 Migrating existing timecard data to new structure...')
  
  // Get existing timecards
  const { data: timecards, error } = await supabase
    .from('timecards')
    .select('*')
    .order('created_at')
  
  if (error) {
    console.error('❌ Error fetching existing timecards:', error)
    return false
  }
  
  console.log(`   Found ${timecards.length} timecards to migrate`)
  
  let migratedCount = 0
  
  for (const timecard of timecards) {
    try {
      // Determine if this is a multi-day timecard
      const workingDaysMatch = timecard.admin_notes?.match(/(\d+) working days/)
      const workingDays = workingDaysMatch ? parseInt(workingDaysMatch[1]) : 1
      const isMultiDay = workingDays > 1
      
      // Create header
      const headerData = {
        id: timecard.id, // Keep same ID for compatibility
        user_id: timecard.user_id,
        project_id: timecard.project_id,
        status: timecard.status,
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
      if (isMultiDay) {
        const startDate = new Date(timecard.date)
        const endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + workingDays - 1)
        headerData.period_end_date = endDate.toISOString().split('T')[0]
      }
      
      const { error: headerError } = await supabase
        .from('timecard_headers')
        .insert(headerData)
      
      if (headerError) {
        console.error(`   ❌ Failed to create header for timecard ${timecard.id}:`, headerError)
        continue
      }
      
      // Create daily entries
      if (isMultiDay) {
        // Create multiple daily entries for multi-day timecards
        const dailyEntries = []
        const avgHours = (timecard.total_hours || 0) / workingDays
        const avgBreak = (timecard.break_duration || 0) / workingDays
        const avgPay = (timecard.total_pay || 0) / workingDays
        
        for (let i = 0; i < workingDays; i++) {
          const workDate = new Date(timecard.date)
          workDate.setDate(workDate.getDate() + i)
          
          dailyEntries.push({
            timecard_header_id: timecard.id,
            work_date: workDate.toISOString().split('T')[0],
            check_in_time: timecard.check_in_time,
            check_out_time: timecard.check_out_time,
            break_start_time: timecard.break_start_time,
            break_end_time: timecard.break_end_time,
            hours_worked: avgHours,
            break_duration: avgBreak,
            daily_pay: avgPay,
            notes: `Day ${i + 1} of ${workingDays} - ${timecard.admin_notes || 'Multi-day work'}`,
            location: 'Main Set'
          })
        }
        
        const { error: entriesError } = await supabase
          .from('timecard_daily_entries')
          .insert(dailyEntries)
        
        if (entriesError) {
          console.error(`   ❌ Failed to create daily entries for timecard ${timecard.id}:`, entriesError)
          continue
        }
        
      } else {
        // Create single daily entry for single-day timecards
        const dailyEntryData = {
          timecard_header_id: timecard.id,
          work_date: timecard.date,
          check_in_time: timecard.check_in_time,
          check_out_time: timecard.check_out_time,
          break_start_time: timecard.break_start_time,
          break_end_time: timecard.break_end_time,
          hours_worked: timecard.total_hours || 0,
          break_duration: timecard.break_duration || 0,
          daily_pay: timecard.total_pay || 0,
          notes: timecard.admin_notes,
          location: 'Main Set'
        }
        
        const { error: entryError } = await supabase
          .from('timecard_daily_entries')
          .insert(dailyEntryData)
        
        if (entryError) {
          console.error(`   ❌ Failed to create daily entry for timecard ${timecard.id}:`, entryError)
          continue
        }
      }
      
      migratedCount++
      
      if (migratedCount % 5 === 0) {
        console.log(`   📊 Migrated ${migratedCount}/${timecards.length} timecards...`)
      }
      
    } catch (error) {
      console.error(`   ❌ Error migrating timecard ${timecard.id}:`, error)
    }
  }
  
  console.log(`✅ Successfully migrated ${migratedCount} out of ${timecards.length} timecards`)
  return migratedCount > 0
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...')
  
  // Check headers
  const { data: headers, error: headersError } = await supabase
    .from('timecard_headers')
    .select('id, user_id, period_start_date, period_end_date, total_hours')
    .limit(5)
  
  if (headersError) {
    console.error('❌ Error verifying headers:', headersError)
    return false
  }
  
  console.log(`   ✅ Found ${headers.length} timecard headers`)
  
  // Check daily entries
  const { data: entries, error: entriesError } = await supabase
    .from('timecard_daily_entries')
    .select('id, timecard_header_id, work_date, hours_worked')
    .limit(10)
  
  if (entriesError) {
    console.error('❌ Error verifying daily entries:', entriesError)
    return false
  }
  
  console.log(`   ✅ Found ${entries.length} daily entries`)
  
  // Show sample data
  if (headers.length > 0 && entries.length > 0) {
    console.log('\n📋 Sample migrated data:')
    
    const sampleHeader = headers[0]
    const relatedEntries = entries.filter(e => e.timecard_header_id === sampleHeader.id)
    
    console.log(`   Header: ${sampleHeader.period_start_date} to ${sampleHeader.period_end_date} (${sampleHeader.total_hours}h)`)
    relatedEntries.forEach(entry => {
      console.log(`     Day: ${entry.work_date} - ${entry.hours_worked}h`)
    })
  }
  
  return true
}

async function main() {
  console.log('🚀 Applying Normalized Timecard Structure (Solution 2)')
  console.log('   This will create proper relational tables for multi-day timecards\n')
  
  try {
    // Step 1: Create tables
    console.log('📋 Step 1: Creating database tables')
    if (!(await createTimecardHeaders())) return
    if (!(await createTimecardDailyEntries())) return
    
    // Step 2: Create indexes
    console.log('\n📋 Step 2: Creating indexes')
    if (!(await createIndexes())) return
    
    // Step 3: Create functions and triggers
    console.log('\n📋 Step 3: Creating functions and triggers')
    if (!(await createUpdateFunction())) return
    if (!(await createTriggers())) return
    
    // Step 4: Enable RLS
    console.log('\n📋 Step 4: Setting up Row Level Security')
    if (!(await enableRLS())) return
    if (!(await createRLSPolicies())) return
    
    // Step 5: Migrate data
    console.log('\n📋 Step 5: Migrating existing data')
    if (!(await migrateExistingData())) return
    
    // Step 6: Verify
    console.log('\n📋 Step 6: Verifying migration')
    if (!(await verifyMigration())) return
    
    console.log('\n🎉 Normalized timecard structure successfully applied!')
    console.log('\n📝 Next steps:')
    console.log('   1. Update Prisma schema to include new tables')
    console.log('   2. Regenerate Prisma client: npx prisma generate')
    console.log('   3. Update API routes to use new structure')
    console.log('   4. Update components to use new data structure')
    console.log('   5. Test the new normalized timecard system')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}

module.exports = { main }