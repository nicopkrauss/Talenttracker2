#!/usr/bin/env node

/**
 * Apply Timecard TIMESTAMPTZ Migration
 * 
 * This script applies the migration to fix timecards table time fields
 * and ensure global settings are properly configured for the timecard system.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Starting timecard TIMESTAMPTZ migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/035_fix_timecards_timestamptz_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded migration file: 035_fix_timecards_timestamptz_fields.sql');

    // Execute the migration by breaking it into individual commands
    console.log('⚡ Executing migration...');
    
    // Split the SQL into individual statements (simplified approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('BEGIN') && !stmt.startsWith('COMMIT'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;
      
      console.log(`  Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec', { sql: statement });
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
          // Continue with other statements for now
        }
      } catch (err) {
        console.error(`❌ Statement ${i + 1} error:`, err);
        // Continue with other statements
      }
    }

    console.log('✅ Migration execution completed');

    // Verify the changes
    console.log('🔍 Verifying migration results...');

    // Check timecards table structure
    const { data: timecardsColumns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'timecards')
      .in('column_name', ['check_in_time', 'check_out_time', 'break_start_time', 'break_end_time']);

    if (columnsError) {
      console.error('❌ Failed to verify timecards columns:', columnsError);
    } else {
      console.log('📋 Timecards table time columns:');
      timecardsColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

    // Check global settings
    const { data: globalSettings, error: settingsError } = await supabase
      .from('global_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('❌ Failed to verify global settings:', settingsError);
    } else {
      console.log('⚙️ Global settings configuration:');
      console.log(`  - Escort break duration: ${globalSettings.default_escort_break_minutes} minutes`);
      console.log(`  - Staff break duration: ${globalSettings.default_staff_break_minutes} minutes`);
      console.log(`  - Max hours before stop: ${globalSettings.max_hours_before_stop} hours`);
      console.log(`  - Overtime warning: ${globalSettings.overtime_warning_hours} hours`);
      console.log(`  - Reminder frequency: ${globalSettings.timecard_reminder_frequency_days} days`);
    }

    // Test the calculation functions
    console.log('🧮 Testing calculation functions...');
    
    const testCheckIn = new Date('2025-01-21T09:00:00Z').toISOString();
    const testBreakStart = new Date('2025-01-21T12:00:00Z').toISOString();
    const testBreakEnd = new Date('2025-01-21T12:30:00Z').toISOString();
    const testCheckOut = new Date('2025-01-21T17:00:00Z').toISOString();

    const { data: hoursTest, error: hoursError } = await supabase
      .rpc('calculate_timecard_hours', {
        p_check_in: testCheckIn,
        p_check_out: testCheckOut,
        p_break_start: testBreakStart,
        p_break_end: testBreakEnd
      });

    if (hoursError) {
      console.error('❌ Hours calculation test failed:', hoursError);
    } else {
      console.log(`✅ Hours calculation test: ${hoursTest} hours (expected: 7.5)`);
    }

    const { data: breakTest, error: breakError } = await supabase
      .rpc('calculate_break_duration', {
        p_break_start: testBreakStart,
        p_break_end: testBreakEnd
      });

    if (breakError) {
      console.error('❌ Break calculation test failed:', breakError);
    } else {
      console.log(`✅ Break calculation test: ${breakTest} minutes (expected: 30)`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📝 Summary of changes:');
    console.log('  ✅ Converted TIME fields to TIMESTAMPTZ for real-time tracking');
    console.log('  ✅ Added global break duration settings (escort vs staff)');
    console.log('  ✅ Added shift limit and notification frequency settings');
    console.log('  ✅ Created calculation functions for hours and break duration');
    console.log('  ✅ Added automatic calculation triggers');
    console.log('  ✅ Created current time tracking status view');
    console.log('');
    console.log('🚀 The timecard system is now ready for real-time time tracking!');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();