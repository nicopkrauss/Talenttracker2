const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetTimecards() {
  console.log('🧹 Starting fresh timecard reset...');

  try {
    // Step 1: Clear all existing timecard data
    console.log('📋 Clearing all existing timecard data...');
    
    // Delete audit logs first
    const { error: auditError } = await supabase
      .from('timecard_audit_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (auditError) {
      console.warn('Warning deleting audit logs:', auditError.message);
    }

    // Delete daily entries
    const { error: dailyEntriesError } = await supabase
      .from('timecard_daily_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (dailyEntriesError) {
      console.error('Error deleting daily entries:', dailyEntriesError);
      throw dailyEntriesError;
    }

    // Delete timecard headers
    const { error: headersError } = await supabase
      .from('timecard_headers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (headersError) {
      console.error('Error deleting timecard headers:', headersError);
      throw headersError;
    }

    console.log('✅ All existing timecard data cleared');

    // Step 2: Get or create test project
    console.log('🏗️ Setting up test project...');
    
    let project;
    const { data: existingProject } = await supabase
      .from('projects')
      .select('*')
      .eq('name', 'The Timecard Test')
      .single();

    if (existingProject) {
      project = existingProject;
      console.log(`✅ Using existing project: ${project.name} (ID: ${project.id})`);
    } else {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: 'The Timecard Test',
          production_company: 'Test Productions LLC',
          hiring_contact: 'test@example.com',
          location: 'Test Studio, Los Angeles, CA',
          description: 'Test project for timecard functionality validation',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'active',
          talent_expected: 25
        })
        .select()
        .single();

      if (projectError) {
        console.error('Error creating project:', projectError);
        throw projectError;
      }

      project = newProject;
      console.log(`✅ Created new project: ${project.name} (ID: ${project.id})`);
    }

    // Step 3: Get existing test users
    console.log('👤 Getting test users...');
    
    const { data: users, error: getUsersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'active')
      .limit(25);

    if (getUsersError) {
      console.error('Error getting users:', getUsersError);
      throw getUsersError;
    }

    if (!users || users.length < 25) {
      console.error(`❌ Need at least 25 active users, found ${users?.length || 0}`);
      console.log('Please run the setup-timecard-test-data.js script first to create test users');
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} active users`);

    // Step 4: Create 25 fresh timecards
    console.log('⏰ Creating 25 fresh timecards...');
    
    const baseStartDate = new Date('2024-09-16'); // Monday
    
    for (let i = 0; i < 25; i++) {
      const user = users[i];
      const isMultiDay = i === 0; // First timecard gets 10 days
      const isDraft = i >= 20; // Last 5 are drafts
      
      // Calculate period dates
      let periodStartDate, periodEndDate, dailyEntries;
      
      if (isMultiDay) {
        // 12-day timecard (test pagination with more than 7 days)
        periodStartDate = new Date(baseStartDate);
        periodEndDate = new Date(baseStartDate);
        periodEndDate.setDate(periodEndDate.getDate() + 17); // ~2.5 weeks (12 work days)
        
        dailyEntries = [];
        let workDaysAdded = 0;
        for (let day = 0; day < 20 && workDaysAdded < 12; day++) {
          const workDate = new Date(periodStartDate);
          workDate.setDate(periodStartDate.getDate() + day);
          
          // Skip weekends
          if (workDate.getDay() === 0 || workDate.getDay() === 6) {
            continue;
          }
          
          dailyEntries.push({
            work_date: workDate.toISOString().split('T')[0],
            check_in_time: '08:00:00',
            check_out_time: '16:30:00',
            break_start_time: '12:00:00',
            break_end_time: '12:30:00',
            hours_worked: 8.00,
            break_duration: 0.50,
            daily_pay: 200.00
          });
          
          workDaysAdded++;
        }
      } else {
        // Regular 5-day timecard
        periodStartDate = new Date(baseStartDate);
        periodEndDate = new Date(baseStartDate);
        periodEndDate.setDate(periodEndDate.getDate() + 4); // 5 days
        
        dailyEntries = [];
        for (let day = 0; day < 5; day++) {
          const workDate = new Date(periodStartDate);
          workDate.setDate(periodStartDate.getDate() + day);
          
          dailyEntries.push({
            work_date: workDate.toISOString().split('T')[0],
            check_in_time: '08:00:00',
            check_out_time: '16:30:00',
            break_start_time: '12:00:00',
            break_end_time: '12:30:00',
            hours_worked: 8.00,
            break_duration: 0.50,
            daily_pay: 200.00
          });
        }
      }

      // Calculate totals
      const totalHours = dailyEntries.reduce((sum, entry) => sum + entry.hours_worked, 0);
      const totalBreakDuration = dailyEntries.reduce((sum, entry) => sum + entry.break_duration, 0);
      const totalPay = dailyEntries.reduce((sum, entry) => sum + entry.daily_pay, 0);

      // Create timecard header
      const { data: timecardHeader, error: headerError } = await supabase
        .from('timecard_headers')
        .insert({
          user_id: user.id,
          project_id: project.id,
          status: isDraft ? 'draft' : 'submitted',
          submitted_at: isDraft ? null : new Date().toISOString(),
          period_start_date: periodStartDate.toISOString().split('T')[0],
          period_end_date: periodEndDate.toISOString().split('T')[0],
          pay_rate: 25.00,
          total_hours: isDraft ? 0 : totalHours,
          total_break_duration: isDraft ? 0 : totalBreakDuration,
          total_pay: isDraft ? 0 : totalPay
        })
        .select()
        .single();

      if (headerError) {
        console.error(`Error creating timecard header for ${user.full_name}:`, headerError);
        continue;
      }

      // Create daily entries for submitted timecards
      if (!isDraft) {
        const entriesData = dailyEntries.map(entry => ({
          timecard_header_id: timecardHeader.id,
          ...entry
        }));

        const { error: dailyError } = await supabase
          .from('timecard_daily_entries')
          .insert(entriesData);

        if (dailyError) {
          console.error(`Error creating daily entries for ${user.full_name}:`, dailyError);
          continue;
        }
      }

      const status = isDraft ? 'DRAFT' : 'SUBMITTED';
      const dayCount = isMultiDay ? '12 days' : '5 days';
      console.log(`✅ Created timecard ${i + 1}/25 for ${user.full_name} (${status}, ${dayCount})`);
    }

    console.log('🎉 Fresh timecard reset complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Project: "${project.name}" (ID: ${project.id})`);
    console.log(`   - Timecards created: 25 total`);
    console.log(`   - Status breakdown: 20 submitted, 5 drafts`);
    console.log(`   - Special: First timecard has 12 working days (tests pagination)`);
    console.log(`   - Regular: Other timecards have 5 working days`);
    console.log(`   - All audit logs cleared`);

  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

// Run the reset
resetTimecards();