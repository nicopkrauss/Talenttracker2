#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStructure() {
  try {
    console.log('🔍 Checking timecards table structure...');
    
    // Check if timecards table exists by querying it
    const { data: timecards, error } = await supabase
      .from('timecards')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing timecards table:', error);
      return;
    }
    
    console.log('✅ Timecards table exists');
    if (timecards && timecards.length > 0) {
      console.log('📋 Sample timecard structure:');
      const sample = timecards[0];
      Object.keys(sample).forEach(key => {
        console.log(`  - ${key}: ${typeof sample[key]} (${sample[key] === null ? 'null' : 'has value'})`);
      });
    } else {
      console.log('📋 Timecards table is empty');
    }
    
    // Check if global_settings table exists
    const { data: globalSettings, error: gsError } = await supabase
      .from('global_settings')
      .select('*')
      .limit(1);
    
    if (gsError) {
      console.log('⚠️ Global settings table not found or error:', gsError);
    } else {
      console.log('✅ Global settings table exists');
      if (globalSettings.length > 0) {
        const settings = globalSettings[0];
        console.log('⚙️ Current global settings:');
        Object.keys(settings).forEach(key => {
          if (!['id', 'created_at', 'updated_at', 'updated_by'].includes(key)) {
            console.log(`  - ${key}: ${settings[key]}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

checkStructure();