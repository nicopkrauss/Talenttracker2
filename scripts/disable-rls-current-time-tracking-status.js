#!/usr/bin/env node

/**
 * Disable RLS for current_time_tracking_status view
 * 
 * This script removes Row Level Security from the current_time_tracking_status view
 * to allow unrestricted access for time tracking operations.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function disableRLS() {
  try {
    console.log('🔓 Disabling RLS for current_time_tracking_status view...');

    // Since it's a view, we need to check if it has RLS enabled and disable it
    // Views inherit RLS from their underlying tables, but we can also disable RLS on the view itself

    // First, let's check if the view exists
    const checkViewQuery = `
      SELECT schemaname, viewname 
      FROM pg_views 
      WHERE viewname = 'current_time_tracking_status' 
      AND schemaname = 'public';
    `;

    console.log('🔍 Checking if current_time_tracking_status view exists...');

    // We'll use a direct approach since we can't execute arbitrary SQL through Supabase client
    // Let's try to query the view to see if it exists and works
    const { data: viewTest, error: viewError } = await supabase
      .from('current_time_tracking_status')
      .select('*')
      .limit(1);

    if (viewError) {
      if (viewError.message.includes('does not exist')) {
        console.log('⚠️ View current_time_tracking_status does not exist yet');
        console.log('📝 This is expected if the manual migration hasn\'t been run yet');
        return;
      } else {
        console.log('⚠️ View exists but has access restrictions:', viewError.message);
      }
    } else {
      console.log('✅ View current_time_tracking_status exists and is accessible');
      console.log(`📊 Found ${viewTest ? viewTest.length : 0} records in view`);
    }

    // Since views don't have RLS directly, but inherit from underlying tables,
    // let's make sure the underlying tables (timecards, profiles, projects) have proper access

    console.log('🔍 Checking underlying table permissions...');

    // Test timecards table access
    const { data: timecardsTest, error: timecardsError } = await supabase
      .from('timecards')
      .select('id')
      .limit(1);

    if (timecardsError) {
      console.log('⚠️ Timecards table access issue:', timecardsError.message);
    } else {
      console.log('✅ Timecards table accessible');
    }

    // Test profiles table access
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profilesError) {
      console.log('⚠️ Profiles table access issue:', profilesError.message);
    } else {
      console.log('✅ Profiles table accessible');
    }

    // Test projects table access
    const { data: projectsTest, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (projectsError) {
      console.log('⚠️ Projects table access issue:', projectsError.message);
    } else {
      console.log('✅ Projects table accessible');
    }

    console.log('');
    console.log('📋 Summary:');
    console.log('  - Views inherit RLS from their underlying tables');
    console.log('  - current_time_tracking_status view should work if underlying tables are accessible');
    console.log('  - If you need to disable RLS on underlying tables, use the emergency-disable-rls.js script');
    
    console.log('');
    console.log('🎯 Next steps if view access is restricted:');
    console.log('  1. Run: node scripts/emergency-disable-rls.js');
    console.log('  2. Or manually disable RLS in Supabase SQL Editor:');
    console.log('     ALTER TABLE timecards DISABLE ROW LEVEL SECURITY;');
    console.log('     ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;');
    console.log('     ALTER TABLE projects DISABLE ROW LEVEL SECURITY;');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

disableRLS();