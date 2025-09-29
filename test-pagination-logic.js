// Test the pagination logic
const DAYS_PER_PAGE = 7;

// Simulate 12 daily entries
const dailyEntries = Array.from({ length: 12 }, (_, i) => ({
  work_date: `2024-09-${16 + i}`,
  day: i + 1
}));

console.log('📅 Testing Pagination Logic\n');
console.log(`Total days: ${dailyEntries.length}`);
console.log(`Days per page: ${DAYS_PER_PAGE}`);

const needsPagination = dailyEntries.length > DAYS_PER_PAGE;
console.log(`Needs pagination: ${needsPagination}\n`);

// Split daily entries into weeks (7-day chunks)
const weekChunks = [];
for (let i = 0; i < dailyEntries.length; i += DAYS_PER_PAGE) {
  weekChunks.push(dailyEntries.slice(i, i + DAYS_PER_PAGE));
}

const totalWeeks = weekChunks.length;
console.log(`Total weeks: ${totalWeeks}\n`);

weekChunks.forEach((week, weekIndex) => {
  console.log(`Week ${weekIndex + 1}:`);
  week.forEach((day, dayIndex) => {
    const actualDayIndex = needsPagination 
      ? (weekIndex * DAYS_PER_PAGE) + dayIndex 
      : dayIndex;
    console.log(`  Day ${actualDayIndex + 1}: ${day.work_date} (entry index: ${dayIndex}, actual index: ${actualDayIndex})`);
  });
  console.log('');
});

console.log('✅ Pagination logic test complete!');