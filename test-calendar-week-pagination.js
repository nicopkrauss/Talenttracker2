// Test the calendar week pagination logic
const testDailyEntries = [
  { work_date: '2024-09-17', day: 'Tuesday' },    // Week 1
  { work_date: '2024-09-18', day: 'Wednesday' },  // Week 1
  { work_date: '2024-09-19', day: 'Thursday' },   // Week 1
  { work_date: '2024-09-20', day: 'Friday' },     // Week 1
  { work_date: '2024-09-21', day: 'Saturday' },   // Week 1
  { work_date: '2024-09-24', day: 'Tuesday' },    // Week 2
  { work_date: '2024-09-25', day: 'Wednesday' },  // Week 2
  { work_date: '2024-09-26', day: 'Thursday' },   // Week 2
  { work_date: '2024-09-27', day: 'Friday' },     // Week 2
  { work_date: '2024-09-28', day: 'Saturday' },   // Week 2
  { work_date: '2024-10-01', day: 'Tuesday' },    // Week 3
  { work_date: '2024-10-02', day: 'Wednesday' },  // Week 3
];

console.log('📅 Testing Calendar Week Pagination Logic\n');
console.log(`Total work days: ${testDailyEntries.length}`);

// Group daily entries by calendar weeks (Sunday = 0, Saturday = 6)
const getCalendarWeeks = (dailyEntries) => {
  const weeks = [];
  const weekMap = new Map();
  
  // Find the date range
  const dates = dailyEntries.map(entry => new Date(entry.work_date)).sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return [dailyEntries];
  
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  
  console.log(`Date range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
  
  // Find the Sunday of the week containing the start date
  const firstSunday = new Date(startDate);
  firstSunday.setDate(startDate.getDate() - startDate.getDay());
  
  // Find the Saturday of the week containing the end date
  const lastSaturday = new Date(endDate);
  lastSaturday.setDate(endDate.getDate() + (6 - endDate.getDay()));
  
  console.log(`Calendar range: ${firstSunday.toDateString()} to ${lastSaturday.toDateString()}\n`);
  
  // Create week buckets from first Sunday to last Saturday
  let currentWeekStart = new Date(firstSunday);
  while (currentWeekStart <= lastSaturday) {
    const weekKey = currentWeekStart.toISOString().split('T')[0];
    weekMap.set(weekKey, []);
    
    // Move to next Sunday
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  
  // Place each daily entry in the correct week bucket
  dailyEntries.forEach(entry => {
    const entryDate = new Date(entry.work_date);
    const entrySunday = new Date(entryDate);
    entrySunday.setDate(entryDate.getDate() - entryDate.getDay());
    const weekKey = entrySunday.toISOString().split('T')[0];
    
    if (weekMap.has(weekKey)) {
      weekMap.get(weekKey).push(entry);
    }
  });
  
  // Convert map to array of weeks, ensuring each week has 7 slots (some may be empty)
  currentWeekStart = new Date(firstSunday);
  let weekNumber = 1;
  while (currentWeekStart <= lastSaturday) {
    const weekKey = currentWeekStart.toISOString().split('T')[0];
    const weekEntries = weekMap.get(weekKey) || [];
    
    console.log(`Week ${weekNumber} (${currentWeekStart.toDateString()} - ${new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toDateString()}):`);
    
    // Create 7-day week structure with empty slots for missing days
    const fullWeek = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + dayOffset);
      const dayKey = dayDate.toISOString().split('T')[0];
      
      // Find entry for this specific date
      const dayEntry = weekEntries.find(entry => entry.work_date === dayKey);
      fullWeek.push(dayEntry || null); // null for empty days
      
      const status = dayEntry ? `✓ ${dayEntry.day}` : '—';
      console.log(`  ${dayNames[dayOffset]} ${dayDate.getDate().toString().padStart(2, '0')}: ${status}`);
    }
    
    weeks.push(fullWeek);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNumber++;
    console.log('');
  }
  
  return weeks;
};

const weekChunks = getCalendarWeeks(testDailyEntries);
console.log(`📊 Summary:`);
console.log(`   - Total calendar weeks: ${weekChunks.length}`);
console.log(`   - Work days distributed across ${weekChunks.length} calendar weeks`);
console.log(`   - Each week shows exactly 7 days (Sun-Sat) with empty slots for non-work days`);

console.log('\n✅ Calendar week pagination test complete!');