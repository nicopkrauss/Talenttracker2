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

async function checkData() {
  try {
    console.log('🔍 Checking existing group assignments data...\n');
    
    // Check if there are any existing group_daily_assignments
    const { data: groupAssignments, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('*')
      .limit(5);
    
    if (groupError) {
      console.error('❌ Error checking group assignments:', groupError);
    } else {
      console.log('📊 Existing group_daily_assignments (first 5):');
      console.table(groupAssignments);
    }
    
    // Check talent_daily_assignments for comparison
    const { data: talentAssignments, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('*')
      .is('escort_id', null)
      .limit(5);
    
    if (talentError) {
      console.error('❌ Error checking talent assignments:', talentError);
    } else {
      console.log('\n📊 Talent assignments with NULL escort_id (first 5):');
      console.table(talentAssignments);
    }
    
    // Check talent groups
    const { data: talentGroups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('*')
      .limit(3);
    
    if (groupsError) {
      console.error('❌ Error checking talent groups:', groupsError);
    } else {
      console.log('\n📊 Existing talent groups (first 3):');
      console.table(talentGroups);
    }
    
  } catch (err) {
    console.error('❌ Failed to check data:', err);
  }
}

checkData();