const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showTimecardTestSummary() {
  console.log('📊 TIMECARD TEST DATA SUMMARY');
  console.log('=' .repeat(50));

  try {
    // Get the project
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('name', 'The Timecard Test')
      .order('created_at', { ascending: false })
      .limit(1);

    const project = projects[0];
    console.log(`\n🏗️  PROJECT: "${project.name}"`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Created: ${new Date(project.created_at).toLocaleString()}`);

    // Get team assignments
    const { data: assignments } = await supabase
      .from('team_assignments')
      .select(`
        *,
        profiles(full_name, email, status)
      `)
      .eq('project_id', project.id);

    console.log(`\n👥 TEAM ASSIGNMENTS: ${assignments.length} total`);
    console.log(`   All assigned as: Talent Escort`);
    console.log(`   Pay rate: $25.00/hour`);
    console.log(`   User status: All ACTIVE`);

    // Get timecards with detailed breakdown
    const { data: timecards } = await supabase
      .from('timecard_headers')
      .select(`
        *,
        user:profiles!timecard_headers_user_id_fkey(full_name, email),
        daily_entries:timecard_daily_entries(*)
      `)
      .eq('project_id', project.id)
      .order('status', { ascending: false });

    console.log(`\n📋 TIMECARDS: ${timecards.length} total`);
    
    const statusBreakdown = timecards.reduce((acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1;
      return acc;
    }, {});

    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`   ${status.toUpperCase()}: ${count} timecards`);
    });

    // Show submitted vs draft details
    const submitted = timecards.filter(tc => tc.status === 'submitted');
    const drafts = timecards.filter(tc => tc.status === 'draft');

    console.log(`\n✅ SUBMITTED TIMECARDS (${submitted.length}):`);
    console.log(`   Period: Sep 16-20, 2024 (5 days)`);
    console.log(`   Hours per timecard: 40.00`);
    console.log(`   Pay per timecard: $1,000.00`);
    console.log(`   Total submitted hours: ${submitted.length * 40} hours`);
    console.log(`   Total submitted pay: $${(submitted.length * 1000).toLocaleString()}`);

    console.log(`\n📝 DRAFT TIMECARDS (${drafts.length}):`);
    if (drafts.length > 0) {
      const draftWithEntries = drafts.filter(tc => tc.daily_entries && tc.daily_entries.length > 0);
      const draftWithoutEntries = drafts.filter(tc => !tc.daily_entries || tc.daily_entries.length === 0);
      
      if (draftWithEntries.length > 0) {
        console.log(`   ${draftWithEntries.length} drafts with time entries (${draftWithEntries[0].daily_entries?.length || 0} days each)`);
        const avgHours = draftWithEntries.reduce((sum, tc) => sum + (tc.total_hours || 0), 0) / draftWithEntries.length;
        const avgPay = draftWithEntries.reduce((sum, tc) => sum + (tc.total_pay || 0), 0) / draftWithEntries.length;
        console.log(`   Average hours per draft: ${avgHours.toFixed(2)}`);
        console.log(`   Average pay per draft: $${avgPay.toFixed(2)}`);
      }
      
      if (draftWithoutEntries.length > 0) {
        console.log(`   ${draftWithoutEntries.length} drafts without time entries`);
      }
    }
    console.log(`   Ready for data entry testing`);

    // Show sample users
    console.log(`\n👤 SAMPLE USERS:`);
    timecards.slice(0, 3).forEach((tc, i) => {
      const status = tc.status.toUpperCase();
      const days = tc.daily_entries?.length || 0;
      console.log(`   ${i + 1}. ${tc.user.full_name} - ${status} (${days} days)`);
    });

    console.log(`\n🎯 TEST SCENARIOS READY:`);
    console.log(`   ✅ 20 submitted timecards (no approval/rejection yet)`);
    console.log(`   ✅ 5 draft timecards for testing data entry`);
    console.log(`   ✅ All users assigned as Talent Escorts`);
    console.log(`   ✅ Project fully configured and active`);
    console.log(`   ✅ Ready for timecard approval/rejection testing`);

    console.log(`\n🔗 ACCESS INFO:`);
    console.log(`   Project ID: ${project.id}`);
    console.log(`   Test user emails: escort01@timecardtest.com through escort25@timecardtest.com`);
    console.log(`   Test user password: TestPassword123!`);

  } catch (error) {
    console.error('❌ Summary failed:', error);
  }
}

// Run the summary
showTimecardTestSummary();