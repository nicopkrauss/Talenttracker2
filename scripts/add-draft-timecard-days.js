const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addDraftTimecardDays() {
  console.log('📅 Adding 3 days to draft timecards...');

  try {
    // Step 1: Get all draft timecards
    console.log('🔍 Finding draft timecards...');
    
    const { data: draftTimecards, error: draftError } = await supabase
      .from('timecard_headers')
      .select(`
        id,
        user_id,
        project_id,
        period_start_date,
        profiles!timecard_headers_user_id_fkey(full_name)
      `)
      .eq('status', 'draft');

    if (draftError) {
      console.error('Error fetching draft timecards:', draftError);
      throw draftError;
    }

    if (!draftTimecards || draftTimecards.length === 0) {
      console.log('❌ No draft timecards found');
      return;
    }

    console.log(`✅ Found ${draftTimecards.length} draft timecards`);

    // Step 2: Add 3 days of entries for each draft timecard
    for (const timecard of draftTimecards) {
      const userName = timecard.profiles?.full_name || 'Unknown User';
      console.log(`📝 Adding days for ${userName}...`);

      // Check if this timecard already has daily entries
      const { data: existingEntries, error: checkError } = await supabase
        .from('timecard_daily_entries')
        .select('id')
        .eq('timecard_header_id', timecard.id);

      if (checkError) {
        console.error(`Error checking existing entries for ${userName}:`, checkError);
        continue;
      }

      if (existingEntries && existingEntries.length > 0) {
        console.log(`⚠️  ${userName} already has ${existingEntries.length} daily entries, skipping...`);
        continue;
      }

      // Create 3 days of entries (Monday, Tuesday, Wednesday)
      const startDate = new Date(timecard.period_start_date);
      const dailyEntries = [];
      let totalHours = 0;
      let totalBreakDuration = 0;
      let totalPay = 0;

      for (let day = 0; day < 3; day++) {
        const workDate = new Date(startDate);
        workDate.setDate(startDate.getDate() + day);
        
        // Vary the hours slightly for realism
        const baseHours = 8;
        const variation = (Math.random() - 0.5) * 0.5; // ±15 minutes
        const hoursWorked = Math.round((baseHours + variation) * 4) / 4; // Round to nearest 15 minutes
        
        const breakDuration = 0.5; // 30 minutes
        const dailyPay = hoursWorked * 25.00; // $25/hour
        
        totalHours += hoursWorked;
        totalBreakDuration += breakDuration;
        totalPay += dailyPay;

        // Calculate check-in/out times based on hours worked
        const checkInHour = 8; // 8:00 AM
        const checkOutTime = checkInHour + hoursWorked + breakDuration;
        const checkOutHour = Math.floor(checkOutTime);
        const checkOutMinutes = Math.round((checkOutTime - checkOutHour) * 60);

        dailyEntries.push({
          timecard_header_id: timecard.id,
          work_date: workDate.toISOString().split('T')[0],
          check_in_time: '08:00:00',
          check_out_time: `${checkOutHour.toString().padStart(2, '0')}:${checkOutMinutes.toString().padStart(2, '0')}:00`,
          break_start_time: '12:00:00',
          break_end_time: '12:30:00',
          hours_worked: hoursWorked,
          break_duration: breakDuration,
          daily_pay: Math.round(dailyPay * 100) / 100 // Round to 2 decimal places
        });
      }

      // Insert all daily entries for this timecard
      const { error: insertError } = await supabase
        .from('timecard_daily_entries')
        .insert(dailyEntries);

      if (insertError) {
        console.error(`Error inserting daily entries for ${userName}:`, insertError);
        continue;
      }

      // Update the timecard header with totals
      const { error: updateError } = await supabase
        .from('timecard_headers')
        .update({
          total_hours: Math.round(totalHours * 100) / 100,
          total_break_duration: Math.round(totalBreakDuration * 100) / 100,
          total_pay: Math.round(totalPay * 100) / 100
        })
        .eq('id', timecard.id);

      if (updateError) {
        console.error(`Error updating timecard header for ${userName}:`, updateError);
        continue;
      }

      console.log(`✅ Added 3 days for ${userName} (${totalHours}h, $${totalPay.toFixed(2)})`);
    }

    console.log('🎉 Successfully added days to all draft timecards!');
    console.log(`📊 Summary:`);
    console.log(`   - Draft timecards processed: ${draftTimecards.length}`);
    console.log(`   - Days added per timecard: 3`);
    console.log(`   - Total daily entries created: ${draftTimecards.length * 3}`);

  } catch (error) {
    console.error('❌ Failed to add draft timecard days:', error);
    process.exit(1);
  }
}

// Run the script
addDraftTimecardDays();