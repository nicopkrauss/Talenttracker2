#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  try {
    console.log('🔍 Checking timecards table columns...');
    
    // Try to insert a test record to see what columns exist
    const testRecord = {
      user_id: '00000000-0000-0000-0000-000000000001', // dummy UUID
      project_id: '00000000-0000-0000-0000-000000000001', // dummy UUID
      date: '2025-01-21',
      status: 'draft'
    };
    
    const { data, error } = await supabase
      .from('timecards')
      .insert(testRecord)
      .select('*');
    
    if (error) {
      console.error('❌ Error inserting test record:', error);
      
      // Try to get schema info another way
      console.log('🔍 Trying to describe table structure...');
      
      // Check what columns we can insert into
      const { error: insertError } = await supabase
        .from('timecards')
        .insert({});
      
      if (insertError) {
        console.log('📋 Insert error reveals required columns:', insertError.message);
      }
      
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Test record inserted successfully');
      console.log('📋 Timecards table columns:');
      const record = data[0];
      Object.keys(record).forEach(key => {
        const value = record[key];
        const type = typeof value;
        console.log(`  - ${key}: ${type} (${value === null ? 'null' : 'has value'})`);
      });
      
      // Clean up test record
      await supabase
        .from('timecards')
        .delete()
        .eq('id', record.id);
      
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

checkColumns();