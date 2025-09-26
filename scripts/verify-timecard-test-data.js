const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTimecardTestData() {
  console.log('🔍 Verifying timecard test data...');

  try {
    // Check the project (get the latest one)
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', 'The Timecard Test')
      .order('created_at', { ascending: false })
      .limit(1);

    if (projectError || !projects || projects.length === 0) {
      console.error('❌ Project not found:', projectError);
      return;
    }

    const project = projects[0];

    if (projectError) {
      console.error('❌ Project not found:', projectError);
      return;
    }

    console.log(`✅ Project found: "${project.name}" (ID: ${project.id})`);

    // Check team assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('team_assignments')
      .select(`
        *,
        profiles(full_name, email)
      `)
      .eq('project_id', project.id);

    if (assignmentsError) {
      console.error('❌ Error getting team assignments:', assignmentsError);
    } else {
      console.log(`✅ Team assignments: ${assignments.length} talent escorts assigned`);
    }

    // Check timecards
    const { data: timecards, error: timecardsError } = await supabase
      .from('timecard_headers')
      .select(`
        *,
        user:profiles!timecard_headers_user_id_fkey(full_name, email),
        daily_entries:timecard_daily_entries(*)
      `)
      .eq('project_id', project.id)
      .order('created_at');

    if (timecardsError) {
      console.error('❌ Error getting timecards:', timecardsError);
      return;
    }

    console.log(`✅ Timecards found: ${timecards.length} total`);

    // Count by status
    const statusCounts = timecards.reduce((acc, timecard) => {
      acc[timecard.status] = (acc[timecard.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Timecard status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status.toUpperCase()}: ${count}`);
    });

    // Check daily entries
    const totalDailyEntries = timecards.reduce((sum, timecard) => {
      return sum + (timecard.daily_entries?.length || 0);
    }, 0);

    console.log(`✅ Daily entries: ${totalDailyEntries} total`);

    // Show sample data
    console.log('\n📋 Sample timecards:');
    timecards.slice(0, 5).forEach((timecard, index) => {
      console.log(`   ${index + 1}. ${timecard.user?.full_name} - ${timecard.status.toUpperCase()} (${timecard.daily_entries?.length || 0} days)`);
    });

    if (timecards.length > 5) {
      console.log(`   ... and ${timecards.length - 5} more`);
    }

    console.log('\n🎉 Verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyTimecardTestData();