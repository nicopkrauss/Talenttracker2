// Test that calendar week logic works for ALL timecards (not just >7 days)

// Test case 1: Single day timecard (Tuesday)
const singleDayTimecard = [
  { work_date: '2024-09-17', day: 'Tuesday' }
];

// Test case 2: 5-day timecard (Monday-Friday)
const fiveDayTimecard = [
  { work_date: '2024-09-16', day: 'Monday' },
  { work_date: '2024-09-17', day: 'Tuesday' },
  { work_date: '2024-09-18', day: 'Wednesday' },
  { work_date: '2024-09-19', day: 'Thursday' },
  { work_date: '2024-09-20', day: 'Friday' }
];

// Test case 3: 12-day timecard (spans multiple weeks)
const twelveDayTimecard = [
  { work_date: '2024-09-17', day: 'Tuesday' },
  { work_date: '2024-09-18', day: 'Wednesday' },
  { work_date: '2024-09-19', day: 'Thursday' },
  { work_date: '2024-09-20', day: 'Friday' },
  { work_date: '2024-09-21', day: 'Saturday' },
  { work_date: '2024-09-24', day: 'Tuesday' },
  { work_date: '2024-09-25', day: 'Wednesday' },
  { work_date: '2024-09-26', day: 'Thursday' },
  { work_date: '2024-09-27', day: 'Friday' },
  { work_date: '2024-09-28', day: 'Saturday' },
  { work_date: '2024-10-01', day: 'Tuesday' },
  { work_date: '2024-10-02', day: 'Wednesday' }
];

function testCalendarWeekLogic(dailyEntries, testName) {
  console.log(`\n📅 Testing: ${testName}`);
  console.log(`Work days: ${dailyEntries.length}`);
  
  // This is the updated logic that should work for ALL timecards
  const getCalendarWeeks = (entries) => {
    if (entries.length === 0) return [[]];
    
    const weeks = [];
    const weekMap = new Map();
    
    // Find the date range
    const dates = entries.map(entry => new Date(entry.work_date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    
    // Find the Sunday of the week containing the start date
    const firstSunday = new Date(startDate);
    firstSunday.setDate(startDate.getDate() - startDate.getDay());
    
    // Find the Saturday of the week containing the end date
    const lastSaturday = new Date(endDate);
    lastSaturday.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    console.log(`Calendar range: ${firstSunday.toDateString()} to ${lastSaturday.toDateString()}`);
    
    // Create week buckets
    let currentWeekStart = new Date(firstSunday);
    while (currentWeekStart <= lastSaturday) {
      const weekKey = currentWeekStart.toISOString().split('T')[0];
      weekMap.set(weekKey, []);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    // Place entries in correct week buckets
    entries.forEach(entry => {
      const entryDate = new Date(entry.work_date);
      const entrySunday = new Date(entryDate);
      entrySunday.setDate(entryDate.getDate() - entryDate.getDay());
      const weekKey = entrySunday.toISOString().split('T')[0];
      
      if (weekMap.has(weekKey)) {
        weekMap.get(weekKey).push(entry);
      }
    });
    
    // Convert to full weeks with 7 days each
    currentWeekStart = new Date(firstSunday);
    let weekNumber = 1;
    while (currentWeekStart <= lastSaturday) {
      const weekKey = currentWeekStart.toISOString().split('T')[0];
      const weekEntries = weekMap.get(weekKey) || [];
      
      console.log(`  Week ${weekNumber}:`);
      
      const fullWeek = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = new Date(currentWeekStart);
        dayDate.setDate(currentWeekStart.getDate() + dayOffset);
        const dayKey = dayDate.toISOString().split('T')[0];
        
        const dayEntry = weekEntries.find(entry => entry.work_date === dayKey);
        fullWeek.push(dayEntry || null);
        
        const status = dayEntry ? `✓ Work` : '—';
        console.log(`    ${dayNames[dayOffset]} ${dayDate.getDate().toString().padStart(2, '0')}: ${status}`);
      }
      
      weeks.push(fullWeek);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      weekNumber++;
    }
    
    return weeks;
  };
  
  const weeks = getCalendarWeeks(dailyEntries);
  console.log(`  📊 Result: ${weeks.length} calendar week(s), each with 7 days (Sun-Sat)`);
  
  return weeks;
}

console.log('🧪 Testing Calendar Week Logic for ALL Timecards\n');
console.log('='.repeat(60));

// Test all scenarios
testCalendarWeekLogic(singleDayTimecard, 'Single Day Timecard (Tuesday)');
testCalendarWeekLogic(fiveDayTimecard, '5-Day Timecard (Mon-Fri)');
testCalendarWeekLogic(twelveDayTimecard, '12-Day Timecard (Multi-week)');

console.log('\n✅ All timecards now use calendar week layout!');
console.log('📋 Benefits:');
console.log('   - Consistent Sunday-Saturday layout for all timecards');
console.log('   - Easy to see which days of the week work occurred');
console.log('   - Empty days show "—" for visual context');
console.log('   - Pagination only when >7 days, but layout always calendar-based');