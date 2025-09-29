/**
 * Calculate adjusted hours for a single day based on overtime rules:
 * - Hours 1-8: 1x multiplier (regular time)
 * - Hours 9-12: 1.5x multiplier (time and a half)
 * - Hours 13+: 2x multiplier (double time)
 * 
 * @param workHours - Work hours for a single day (excluding breaks)
 * @returns Adjusted hours with overtime multipliers applied for that day
 */
export function calculateAdjustedHoursForDay(workHours: number): number {
  if (workHours <= 0) return 0
  
  let adjustedHours = 0
  
  // First 8 hours at regular time (1x)
  const regularHours = Math.min(workHours, 8)
  adjustedHours += regularHours * 1
  
  // Hours 9-12 at time and a half (1.5x)
  if (workHours > 8) {
    const overtimeHours = Math.min(workHours - 8, 4) // Max 4 hours in this bracket
    adjustedHours += overtimeHours * 1.5
  }
  
  // Hours 13+ at double time (2x)
  if (workHours > 12) {
    const doubleTimeHours = workHours - 12
    adjustedHours += doubleTimeHours * 2
  }
  
  return adjustedHours
}

/**
 * Calculate adjusted hours for a timecard (handles both single-day and multi-day)
 * For multi-day timecards, applies the calculation per day and sums the results
 * 
 * @param timecard - Timecard object with total_hours and optional daily_entries
 * @returns Total adjusted hours across all days
 */
export function calculateAdjustedHours(timecard: { total_hours?: number; daily_entries?: Array<{ hours_worked: number }> }): number {
  // If we have daily entries, calculate per day and sum
  if (timecard.daily_entries && timecard.daily_entries.length > 0) {
    return timecard.daily_entries.reduce((total, entry) => {
      return total + calculateAdjustedHoursForDay(entry.hours_worked || 0)
    }, 0)
  }
  
  // For single-day timecards, use total_hours
  return calculateAdjustedHoursForDay(timecard.total_hours || 0)
}

/**
 * Get a breakdown of how adjusted hours are calculated for a single day
 * @param workHours - Work hours for a single day (excluding breaks)
 * @returns Object with breakdown of regular, overtime, and double time hours
 */
export function getAdjustedHoursBreakdownForDay(workHours: number) {
  if (workHours <= 0) {
    return {
      regularHours: 0,
      overtimeHours: 0,
      doubleTimeHours: 0,
      adjustedHours: 0
    }
  }
  
  const regularHours = Math.min(workHours, 8)
  const overtimeHours = workHours > 8 ? Math.min(workHours - 8, 4) : 0
  const doubleTimeHours = workHours > 12 ? workHours - 12 : 0
  
  return {
    regularHours,
    overtimeHours,
    doubleTimeHours,
    adjustedHours: calculateAdjustedHoursForDay(workHours)
  }
}

/**
 * Get a breakdown of how adjusted hours are calculated for a timecard
 * @param timecard - Timecard object with total_hours and optional daily_entries
 * @returns Object with breakdown across all days
 */
export function getAdjustedHoursBreakdown(timecard: { total_hours?: number; daily_entries?: Array<{ hours_worked: number }> }) {
  if (timecard.daily_entries && timecard.daily_entries.length > 0) {
    // Multi-day timecard - sum up breakdowns from each day
    const totalBreakdown = timecard.daily_entries.reduce((total, entry) => {
      const dayBreakdown = getAdjustedHoursBreakdownForDay(entry.hours_worked || 0)
      return {
        regularHours: total.regularHours + dayBreakdown.regularHours,
        overtimeHours: total.overtimeHours + dayBreakdown.overtimeHours,
        doubleTimeHours: total.doubleTimeHours + dayBreakdown.doubleTimeHours,
        adjustedHours: total.adjustedHours + dayBreakdown.adjustedHours
      }
    }, { regularHours: 0, overtimeHours: 0, doubleTimeHours: 0, adjustedHours: 0 })
    
    return totalBreakdown
  }
  
  // Single-day timecard
  return getAdjustedHoursBreakdownForDay(timecard.total_hours || 0)
}