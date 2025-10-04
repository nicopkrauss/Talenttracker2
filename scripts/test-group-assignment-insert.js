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

async function testInsert() {
  try {
    console.log('🧪 Testing group_daily_assignments insert with null escort_id...\n');
    
    // Try to insert a test record with null escort_id
    const testRecord = {
      group_id: '00000000-0000-0000-0000-000000000000', // Fake UUID for testing
      project_id: '00000000-0000-0000-0000-000000000000', // Fake UUID for testing
      assignment_date: '2025-01-01',
      escort_id: null
    };
    
    const { data, error } = await supabase
      .from('group_daily_assignments')
      .insert(testRecord)
      .select();
    
    if (error) {
      console.error('❌ Insert failed:', error);
      
      if (error.code === '23502') {
        console.log('\n🔧 The NOT NULL constraint is still active. Need to run the migration.');
        return false;
      } else if (error.code === '23503') {
        console.log('\n✅ NULL escort_id is allowed! (Foreign key error is expected with fake UUIDs)');
        return true;
      } else {
        console.log('\n❓ Unexpected error:', error.code);
        return false;
      }
    } else {
      console.log('✅ Insert successful:', data);
      
      // Clean up the test record
      await supabase
        .from('group_daily_assignments')
        .delete()
        .eq('group_id', testRecord.group_id)
        .eq('project_id', testRecord.project_id)
        .eq('assignment_date', testRecord.assignment_date);
      
      console.log('🧹 Test record cleaned up');
      return true;
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

testInsert().then(success => {
  if (success) {
    console.log('\n🎉 The constraint has been fixed! escort_id can be null.');
  } else {
    console.log('\n⚠️  The constraint still needs to be fixed.');
  }
});