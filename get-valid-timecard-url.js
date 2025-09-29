const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getValidTimecardUrls() {
  console.log('🔍 Getting valid timecard URLs...\n');
  
  const { data: timecards, error } = await supabase
    .from('timecard_headers')
    .select(`
      id, 
      status, 
      period_start_date, 
      period_end_date,
      profiles:user_id(full_name),
      projects:project_id(name),
      daily_entries:timecard_daily_entries(work_date)
    `)
    .order('created_at', { ascending: true })
    .limit(25);
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (timecards.length === 0) {
    console.log('❌ No timecards found');
    return;
  }
  
  console.log('📋 Valid Timecard URLs (showing oldest first):\n');
  
  timecards.forEach((tc, i) => {
    const userName = Array.isArray(tc.profiles) 
      ? tc.profiles[0]?.full_name || 'Unknown User'
      : tc.profiles?.full_name || 'Unknown User';
    
    const projectName = Array.isArray(tc.projects)
      ? tc.projects[0]?.name || 'Unknown Project'
      : tc.projects?.name || 'Unknown Project';
    
    const dayCount = tc.daily_entries?.length || 1;
    const isMultiDay = dayCount > 1;
    
    console.log(`${i + 1}. ${userName} - ${tc.status.toUpperCase()}`);
    console.log(`   Project: ${projectName}`);
    console.log(`   Period: ${tc.period_start_date} to ${tc.period_end_date}`);
    console.log(`   Days: ${dayCount} ${isMultiDay ? '(MULTI-DAY - TESTS PAGINATION)' : ''}`);
    console.log(`   URL: http://localhost:3000/timecards/${tc.id}`);
    console.log('');
  });
  
  // Highlight the special 12-day timecard
  const multiDayTimecard = timecards.find(tc => tc.daily_entries?.length > 7);
  if (multiDayTimecard) {
    console.log('🎯 RECOMMENDED FOR PAGINATION TESTING:');
    const userName = Array.isArray(multiDayTimecard.profiles) 
      ? multiDayTimecard.profiles[0]?.full_name || 'Unknown User'
      : multiDayTimecard.profiles?.full_name || 'Unknown User';
    console.log(`   ${userName}'s ${multiDayTimecard.daily_entries.length}-day timecard`);
    console.log(`   URL: http://localhost:3000/timecards/${multiDayTimecard.id}`);
  }
}

getValidTimecardUrls();