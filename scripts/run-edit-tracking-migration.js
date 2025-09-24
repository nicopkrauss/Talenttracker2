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

async function testCurrentState() {
  try {
    console.log('🔍 Testing current timecard structure...');
    
    // Check what columns exist
    const { data, error } = await supabase
      .from('timecards')
      .select('id, manually_edited, edit_comments, admin_edited, admin_edit_reason')
      .limit(1);
    
    if (error) {
      console.log('Current columns available:', Object.keys(error.details || {}));
      console.log('Error details:', error.message);
    } else {
      console.log('✅ Current timecard structure works');
      console.log('Sample data:', data[0]);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function runMigration() {
  console.log('📋 Edit Tracking Migration Plan:');
  console.log('1. Add admin_edited column for admin-specific edits');
  console.log('2. Add admin_edit_reason for admin edit explanations');
  console.log('3. Add last_edited_by to track who made the edit');
  console.log('4. Add edit_type to categorize edit types');
  console.log('5. Migrate existing data appropriately');
  console.log('');
  console.log('⚠️  This migration needs to be run manually in Supabase SQL Editor');
  console.log('📁 Migration file: migrations/038_improve_timecard_edit_tracking.sql');
  console.log('');
  console.log('Benefits of this approach:');
  console.log('- admin_edited: Tracks admin/supervisor edits specifically');
  console.log('- manually_edited: Tracks user corrections to their own timecards');
  console.log('- Clear separation of concerns and audit trail');
  console.log('- Better UI messaging based on edit type');
}

testCurrentState().then(() => {
  runMigration();
});