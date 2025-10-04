#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  try {
    console.log('🔍 Checking group_daily_assignments schema...\n');
    
    // Check column info
    const { data: columnData, error: columnError } = await supabase.rpc('exec', { 
      sql: `
        SELECT 
          column_name, 
          is_nullable, 
          data_type 
        FROM information_schema.columns 
        WHERE table_name = 'group_daily_assignments' 
        ORDER BY ordinal_position
      `
    });
    
    if (columnError) {
      console.error('❌ Error checking columns:', columnError);
      return;
    }
    
    console.log('📋 Column information:');
    console.table(columnData);
    
    // Check constraints
    const { data: constraintData, error: constraintError } = await supabase.rpc('exec', { 
      sql: `
        SELECT 
          conname as constraint_name,
          contype as constraint_type
        FROM pg_constraint 
        WHERE conrelid = 'group_daily_assignments'::regclass
      `
    });
    
    if (constraintError) {
      console.error('❌ Error checking constraints:', constraintError);
      return;
    }
    
    console.log('\n🔒 Constraints:');
    console.table(constraintData);
    
    // Check indexes
    const { data: indexData, error: indexError } = await supabase.rpc('exec', { 
      sql: `
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'group_daily_assignments'
      `
    });
    
    if (indexError) {
      console.error('❌ Error checking indexes:', indexError);
      return;
    }
    
    console.log('\n📊 Indexes:');
    console.table(indexData);
    
  } catch (err) {
    console.error('❌ Failed to check schema:', err);
  }
}

checkSchema();