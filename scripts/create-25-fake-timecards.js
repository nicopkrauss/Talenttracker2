const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  'https://phksmrvgqqjfxgxztvgc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoa3NtcnZncXFqZnhneHp0dmdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQyNjA0NiwiZXhwIjoyMDcyMDAyMDQ2fQ.oNTcoB4HfFPEMEl0KdfiuC-09NQnATKPZIn3xP4U1mY'
);

// Helper function to generate random date within a range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate random time
function randomTime(hour, minute = 0) {
  const variance = Math.random() * 30 - 15; // ±15 minutes
  const totalMinutes = hour * 60 + minute + variance;
  const finalHour = Math.floor(totalMinutes / 60);
  const finalMinute = Math.floor(totalMinutes % 60);
  return `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}:00`;
}

// Helper function to calculate hours between times
function calculateHours(startTime, endTime) {
  const start = new Date(`2024-01-01T${startTime}`);
  const end = new Date(`2024-01-01T${endTime}`);
  return (end - start) / (1000 * 60 * 60);
}

// Helper function to format date for database
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function createFakeTimecards() {
  try {
    console.log('🚀 Starting fake timecard creation...');

    // Get available users and projects
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('status', 'active')
      .limit(15);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return;
    }

    if (!users || users.length === 0) {
      console.error('No users found');
      return;
    }

    if (!projects || projects.length === 0) {
      console.error('No projects found');
      return;
    }

    console.log(`Found ${users.length} users and ${projects.length} projects`);

    const timecards = [];
    const payRate = 20; // $20/hour as requested

    // Generate 25 timecards with specified status distribution
    const statusDistribution = [
      ...Array(5).fill('approved'),
      ...Array(10).fill('submitted'),
      ...Array(10).fill('draft')
    ];

    for (let i = 0; i < 25; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const project = projects[Math.floor(Math.random() * projects.length)];
      const status = statusDistribution[i];

      // Determine if this should be multi-day (80% chance) or single day (20% chance)
      const isMultiDay = Math.random() > 0.2;
      const numDays = isMultiDay ? Math.floor(Math.random() * 4) + 2 : 1; // 2-5 days for multi-day

      // Generate period dates (within last 30 days)
      const endDate = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (numDays - 1));

      // Generate daily entries
      const dailyEntries = [];
      let totalHours = 0;
      let totalBreakDuration = 0;
      let totalPay = 0;

      for (let day = 0; day < numDays; day++) {
        const workDate = new Date(startDate);
        workDate.setDate(workDate.getDate() + day);

        // Generate realistic work times (8-hour days)
        const checkInTime = randomTime(8, 0); // Around 8:00 AM
        const checkOutTime = randomTime(16, 30); // Around 4:30 PM
        
        // Break times (0.5-1.0 hours)
        const breakStartTime = randomTime(12, 0); // Around noon
        const breakDurationHours = Math.random() > 0.5 ? 0.5 : 1.0; // 0.5 or 1.0 hours
        const breakDurationMinutes = breakDurationHours * 60;
        const breakEndHour = parseInt(breakStartTime.split(':')[0]);
        const breakEndMinute = parseInt(breakStartTime.split(':')[1]) + breakDurationMinutes;
        const breakEndTime = `${Math.floor(breakEndMinute / 60) + breakEndHour}:${(breakEndMinute % 60).toString().padStart(2, '0')}:00`;

        const hoursWorked = calculateHours(checkInTime, checkOutTime) - breakDurationHours;
        const dailyPay = hoursWorked * payRate;

        totalHours += hoursWorked;
        totalBreakDuration += breakDurationHours;
        totalPay += dailyPay;

        dailyEntries.push({
          work_date: formatDate(workDate),
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          break_start_time: breakStartTime,
          break_end_time: breakEndTime,
          hours_worked: Math.round(hoursWorked * 100) / 100,
          break_duration: breakDurationHours,
          daily_pay: Math.round(dailyPay * 100) / 100
        });
      }

      // Create timecard header data
      const timecardData = {
        user_id: user.id,
        project_id: project.id,
        period_start_date: formatDate(startDate),
        period_end_date: formatDate(endDate),
        total_hours: Math.round(totalHours * 100) / 100,
        total_break_duration: totalBreakDuration,
        total_pay: Math.round(totalPay * 100) / 100,
        pay_rate: payRate,
        status: status,
        admin_notes: status === 'approved' ? 'Approved by system admin' : null,
        submitted_at: status !== 'draft' ? new Date().toISOString() : null,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        approved_by: status === 'approved' ? users[0].id : null // Use first user as approver
      };

      // Insert timecard header
      const { data: header, error: headerError } = await supabase
        .from('timecard_headers')
        .insert(timecardData)
        .select()
        .single();

      if (headerError) {
        console.error(`Error creating timecard header ${i + 1}:`, headerError);
        continue;
      }

      // Insert daily entries
      const entriesData = dailyEntries.map(entry => ({
        timecard_header_id: header.id,
        ...entry
      }));

      const { error: entriesError } = await supabase
        .from('timecard_daily_entries')
        .insert(entriesData);

      if (entriesError) {
        console.error(`Error creating daily entries for timecard ${i + 1}:`, entriesError);
        // Clean up header
        await supabase.from('timecard_headers').delete().eq('id', header.id);
        continue;
      }

      timecards.push({
        id: header.id,
        user: user.full_name,
        project: project.name,
        status: status,
        days: numDays,
        totalHours: Math.round(totalHours * 100) / 100,
        totalPay: Math.round(totalPay * 100) / 100
      });

      console.log(`✅ Created timecard ${i + 1}/25: ${user.full_name} - ${project.name} (${status}, ${numDays} days, $${Math.round(totalPay * 100) / 100})`);
    }

    console.log('\n🎉 Successfully created 25 fake timecards!');
    console.log('\n📊 Summary:');
    console.log(`- Approved: ${timecards.filter(t => t.status === 'approved').length}`);
    console.log(`- Submitted: ${timecards.filter(t => t.status === 'submitted').length}`);
    console.log(`- Draft: ${timecards.filter(t => t.status === 'draft').length}`);
    console.log(`- Multi-day cards: ${timecards.filter(t => t.days > 1).length}`);
    console.log(`- Single-day cards: ${timecards.filter(t => t.days === 1).length}`);
    console.log(`- Total pay generated: $${timecards.reduce((sum, t) => sum + t.totalPay, 0).toFixed(2)}`);

  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the script
createFakeTimecards();