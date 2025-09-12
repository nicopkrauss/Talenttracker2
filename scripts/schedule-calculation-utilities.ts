// Schedule Calculation Utilities for Multi-Day Projects
// This demonstrates the simplified automatic calculation approach

export interface ProjectSchedule {
  startDate: Date;
  endDate: Date;
  rehearsalDates: Date[];
  showDates: Date[];
  allDates: Date[];
  totalDays: number;
  rehearsalDayCount: number;
  showDayCount: number;
}

/**
 * Calculate project schedule from start and end dates
 * Rules:
 * - End date is always the show day
 * - All days from start date to (end date - 1) are rehearsal days
 * - Single-day projects have no rehearsal days, only show day
 */
export function calculateProjectSchedule(startDate: Date, endDate: Date): ProjectSchedule {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validate dates
  if (start > end) {
    throw new Error('Start date cannot be after end date');
  }
  
  const allDates = getAllDatesBetween(start, end);
  const rehearsalDates = getRehearsalDates(start, end);
  const showDates = getShowDates(end);
  
  return {
    startDate: start,
    endDate: end,
    rehearsalDates,
    showDates,
    allDates,
    totalDays: allDates.length,
    rehearsalDayCount: rehearsalDates.length,
    showDayCount: showDates.length
  };
}

/**
 * Get all dates between start and end (inclusive)
 */
export function getAllDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Get rehearsal dates (start date to end date - 1)
 * Returns empty array for single-day projects
 */
export function getRehearsalDates(startDate: Date, endDate: Date): Date[] {
  // Single day project - no rehearsal days
  if (startDate.getTime() === endDate.getTime()) {
    return [];
  }
  
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  // Add all days except the last day (which is show day)
  while (current < endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Get show dates (always just the end date)
 */
export function getShowDates(endDate: Date): Date[] {
  return [new Date(endDate)];
}

/**
 * Check if a given date is a rehearsal day for the project
 */
export function isRehearsalDay(date: Date, startDate: Date, endDate: Date): boolean {
  const rehearsalDates = getRehearsalDates(startDate, endDate);
  return rehearsalDates.some(rehearsalDate => 
    rehearsalDate.toDateString() === date.toDateString()
  );
}

/**
 * Check if a given date is a show day for the project
 */
export function isShowDay(date: Date, endDate: Date): boolean {
  return date.toDateString() === endDate.toDateString();
}

/**
 * Get the type of a specific date within a project
 */
export function getDateType(date: Date, startDate: Date, endDate: Date): 'rehearsal' | 'show' | 'outside' {
  if (date < startDate || date > endDate) {
    return 'outside';
  }
  
  if (isShowDay(date, endDate)) {
    return 'show';
  }
  
  return 'rehearsal';
}

// Example usage and test cases
export function demonstrateScheduleCalculation() {
  console.log('=== Schedule Calculation Examples ===\n');
  
  // Example 1: Multi-day project (5 days)
  const multiDay = calculateProjectSchedule(
    new Date('2024-04-01'),
    new Date('2024-04-05')
  );
  
  console.log('Multi-day project (April 1-5, 2024):');
  console.log(`Total days: ${multiDay.totalDays}`);
  console.log(`Rehearsal days (${multiDay.rehearsalDayCount}):`, multiDay.rehearsalDates.map(d => d.toDateString()));
  console.log(`Show days (${multiDay.showDayCount}):`, multiDay.showDates.map(d => d.toDateString()));
  console.log('');
  
  // Example 2: Single-day project
  const singleDay = calculateProjectSchedule(
    new Date('2024-04-10'),
    new Date('2024-04-10')
  );
  
  console.log('Single-day project (April 10, 2024):');
  console.log(`Total days: ${singleDay.totalDays}`);
  console.log(`Rehearsal days (${singleDay.rehearsalDayCount}):`, singleDay.rehearsalDates.map(d => d.toDateString()));
  console.log(`Show days (${singleDay.showDayCount}):`, singleDay.showDates.map(d => d.toDateString()));
  console.log('');
  
  // Example 3: Two-day project
  const twoDay = calculateProjectSchedule(
    new Date('2024-04-15'),
    new Date('2024-04-16')
  );
  
  console.log('Two-day project (April 15-16, 2024):');
  console.log(`Total days: ${twoDay.totalDays}`);
  console.log(`Rehearsal days (${twoDay.rehearsalDayCount}):`, twoDay.rehearsalDates.map(d => d.toDateString()));
  console.log(`Show days (${twoDay.showDayCount}):`, twoDay.showDates.map(d => d.toDateString()));
  console.log('');
  
  console.log('=== Date Type Checking ===\n');
  
  // Test date type checking
  const testDate1 = new Date('2024-04-02'); // Should be rehearsal
  const testDate2 = new Date('2024-04-05'); // Should be show
  const testDate3 = new Date('2024-04-06'); // Should be outside
  
  console.log(`April 2 in multi-day project: ${getDateType(testDate1, multiDay.startDate, multiDay.endDate)}`);
  console.log(`April 5 in multi-day project: ${getDateType(testDate2, multiDay.startDate, multiDay.endDate)}`);
  console.log(`April 6 in multi-day project: ${getDateType(testDate3, multiDay.startDate, multiDay.endDate)}`);
}

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateScheduleCalculation();
}