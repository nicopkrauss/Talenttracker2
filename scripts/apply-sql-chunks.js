#!/usr/bin/env node

/**
 * Apply SQL Migration in Chunks
 * 
 * This script applies the normalized timecard structure SQL in smaller chunks
 * to avoid execution issues.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// SQL chunks to execute one by one
const sqlChunks = [
  {
    name: 'Create timecard_headers table',
    sql: `
      CREATE TABLE IF NOT EXISTS timecard_headers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'draft',
        submitted_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        approved_by UUID REFERENCES profiles(id),
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
  },
  {
    name: 'Add constraints to timecard_headers',
    sql: `
      ALTER TABLE timecard_headers 
      ADD CONSTRAINT IF NOT EXISTS timecard_headers_user_project_date_unique 
      UNIQUE(user_id, project_id, period_start_date);
      
      ALTER TABLE timecard_headers 
      ADD CONSTRAINT IF NOT EXISTS timecard_headers_period_check 
      CHECK(period_end_date >= period_start_date);
    `
  },
  {
    name: 'Create timecard_daily_entries table',
    sql: `
      CREATE TABLE IF NOT EXISTS timecard_daily_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timecard_header_id UUID NOT NULL,
        work_date DATE NOT NULL,
        check_in_time TIME,
        check_out_time TIME,
        break_start_time TIME,
        break_end_time TIME,
        hours_worked DECIMAL(4,2) DEFAULT 0,
        break_duration DECIMAL(3,2) DEFAULT 0,
        daily_pay DECIMAL(8,2) DEFAULT 0,
        location TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'Add foreign key to timecard_daily_entries',
    sql: `
      ALTER TABLE timecard_daily_entries 
      ADD CONSTRAINT IF NOT EXISTS timecard_daily_entries_header_fk 
      FOREIGN KEY (timecard_header_id) REFERENCES timecard_headers(id) ON DELETE CASCADE;
    `
  },
  {
    name: 'Add constraints to timecard_daily_entries',
    sql: `
      ALTER TABLE timecard_daily_entries 
      ADD CONSTRAINT IF NOT EXISTS timecard_daily_entries_header_date_unique 
      UNIQUE(timecard_header_id, work_date);
      
      ALTER TABLE timecard_daily_entries 
      ADD CONSTRAINT IF NOT EXISTS timecard_daily_entries_hours_check 
      CHECK(hours_worked >= 0);
      
      ALTER TABLE timecard_daily_entries 
      ADD CONSTRAINT IF NOT EXISTS timecard_daily_entries_break_check 
      CHECK(break_duration >= 0);
      
      ALTER TABLE timecard_daily_entries 
      ADD CONSTRAINT IF NOT EXISTS timecard_daily_entries_pay_check 
      CHECK(daily_pay >= 0);
    `
  },
  {
    name: 'Create indexes for timecard_headers',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_timecard_headers_user_project 
      ON timecard_headers(user_id, project_id);
      
      CREATE INDEX IF NOT EXISTS idx_timecard_headers_status 
      ON timecard_headers(status);
      
      CREATE INDEX IF NOT EXISTS idx_timecard_headers_period 
      ON timecard_headers(period_start_date, period_end_date);
      
      CREATE INDEX IF NOT EXISTS idx_timecard_headers_submitted 
      ON timecard_headers(submitted_at);
    `
  },
  {
    name: 'Create indexes for timecard_daily_entries',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_header 
      ON timecard_daily_entries(timecard_header_id);
      
      CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_date 
      ON timecard_daily_entries(work_date);
      
      CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_header_date 
      ON timecard_daily_entries(timecard_header_id, work_date);
    `
  }
]

async function executeChunk(chunk) {
  console.log(`📝 ${chunk.name}...`)
  
  try {
    // Try to execute using a simple query approach
    // We'll use the SQL editor approach by creating a temporary function
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: chunk.sql 
    })
    
    if (error) {
      // If exec_sql doesn't work, we'll need to use a different approach
      console.log(`   ⚠️  Direct execution not available: ${error.message}`)
      console.log(`   📋 Please execute this SQL manually in Supabase SQL Editor:`)
      console.log(`   ${chunk.sql}`)
      return false
    }
    
    console.log(`   ✅ ${chunk.name} completed`)
    return true
    
  } catch (error) {
    console.error(`   ❌ Error in ${chunk.name}:`, error.message)
    return false
  }
}

async function testTableCreation() {
  console.log('🧪 Testing table creation with direct insert...')
  
  try {
    // Try to insert a test record to see if tables exist
    const testHeader = {
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      project_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      period_start_date: '2024-01-01',
      period_end_date: '2024-01-01',
      status: 'draft'
    }
    
    const { data, error } = await supabase
      .from('timecard_headers')
      .insert(testHeader)
      .select()
    
    if (error) {
      if (error.message.includes('relation "timecard_headers" does not exist')) {
        console.log('   ❌ Tables do not exist yet - need to create them')
        return false
      } else {
        console.log('   ⚠️  Tables exist but insert failed (expected):', error.message)
        return true
      }
    }
    
    // Clean up test record if it was created
    if (data && data.length > 0) {
      await supabase
        .from('timecard_headers')
        .delete()
        .eq('id', data[0].id)
      console.log('   🧹 Cleaned up test record')
    }
    
    console.log('   ✅ Tables exist and are accessible')
    return true
    
  } catch (error) {
    console.log('   ❌ Table test failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Applying Normalized Timecard Structure SQL')
  
  // First test if tables already exist
  const tablesExist = await testTableCreation()
  
  if (tablesExist) {
    console.log('✅ Tables already exist! Skipping creation.')
    console.log('\n📝 Next step: Run data migration')
    console.log('   node scripts/migrate-existing-timecard-data.js')
    return
  }
  
  console.log('\n📋 Applying SQL chunks...')
  
  let successCount = 0
  
  for (const chunk of sqlChunks) {
    const success = await executeChunk(chunk)
    if (success) {
      successCount++
    }
    
    // Small delay between chunks
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`\n📊 Applied ${successCount}/${sqlChunks.length} SQL chunks`)
  
  if (successCount === 0) {
    console.log('\n💡 Manual SQL execution required:')
    console.log('   1. Go to your Supabase project dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the SQL from migrations/041_alternative_timecard_structure.sql')
    console.log('   4. Execute the SQL')
    console.log('   5. Then run: node scripts/migrate-existing-timecard-data.js')
  } else if (successCount < sqlChunks.length) {
    console.log('\n⚠️  Partial success - some chunks may need manual execution')
    console.log('   Check the SQL Editor for any remaining statements')
  } else {
    console.log('\n🎉 All SQL chunks applied successfully!')
    console.log('\n📝 Next step: Migrate existing data')
    console.log('   node scripts/migrate-existing-timecard-data.js')
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}

module.exports = { main }