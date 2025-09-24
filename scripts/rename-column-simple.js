#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('🔍 Testing current column name...');
    
    // Try to select from the table to see what columns exist
    const { data, error } = await supabase
      .from('timecards')
      .select('id, supervisor_comments')
      .limit(1);
    
    if (error) {
      if (error.message.includes('supervisor_comments')) {
        console.log('❌ supervisor_comments column does not exist - may already be renamed');
      } else {
        console.error('❌ Error:', error);
      }
    } else {
      console.log('✅ supervisor_comments column exists');
      console.log('Data sample:', data);
    }
    
    // Now try the new column name
    const { data: data2, error: error2 } = await supabase
      .from('timecards')
      .select('id, edit_comments')
      .limit(1);
    
    if (error2) {
      if (error2.message.includes('edit_comments')) {
        console.log('❌ edit_comments column does not exist - needs to be created');
      } else {
        console.error('❌ Error:', error2);
      }
    } else {
      console.log('✅ edit_comments column exists');
      console.log('Data sample:', data2);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection();