import type { Timecard } from "@/lib/types"

export interface MissingBreakData {
  timecardId: string
  date: string
  totalHours: number
  hasBreakData: boolean
}

/**
 * Validates timecards for missing break information
 * Returns timecards that are >6 hours without break data
 */
export function validateTimecardBreaks(timecards: Timecard[]): MissingBreakData[] {
  const missingBreaks: MissingBreakData[] = []

  for (const timecard of timecards) {
    // Only check draft timecards that are being submitted
    if (timecard.status !== 'draft') {
      continue
    }

    // Check if shift is longer than 6 hours
    if (timecard.total_hours > 6) {
      // Check if break information is missing
      const hasBreakData = !!(timecard.break_start_time && timecard.break_end_time && timecard.break_duration > 0)
      
      if (!hasBreakData) {
        missingBreaks.push({
          timecardId: timecard.id,
          date: timecard.date,
          totalHours: timecard.total_hours,
          hasBreakData: false
        })
      }
    }
  }

  return missingBreaks
}

/**
 * Checks if a single timecard has missing break information
 */
export function hasTimecardMissingBreak(timecard: Timecard): boolean {
  if (timecard.status !== 'draft') {
    return false
  }

  if (timecard.total_hours <= 6) {
    return false
  }

  const hasBreakData = !!(timecard.break_start_time && timecard.break_end_time && timecard.break_duration > 0)
  return !hasBreakData
}

/**
 * Validates if timecards can be submitted
 * Returns validation result with blocking issues
 */
export function validateTimecardSubmission(
  timecards: Timecard[], 
  projectStartDate?: string
): {
  canSubmit: boolean
  missingBreaks: MissingBreakData[]
  errors: string[]
} {
  const missingBreaks = validateTimecardBreaks(timecards)
  const errors: string[] = []

  // Check for missing break information
  if (missingBreaks.length > 0) {
    errors.push(`${missingBreaks.length} shift(s) longer than 6 hours are missing break information`)
  }

  // Check show day submission timing (requirement 7.5)
  if (projectStartDate) {
    const projectStart = new Date(projectStartDate + 'T00:00:00') // Ensure we parse as local date
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset to start of day for comparison

    if (today < projectStart) {
      errors.push(`Timecard submission is not available until show day begins (${projectStart.toLocaleDateString()})`)
    }
  }

  // Check for invalid time sequences (basic validation)
  for (const timecard of timecards) {
    if (timecard.status !== 'draft') continue

    if (timecard.check_in_time && timecard.check_out_time) {
      const checkIn = new Date(timecard.check_in_time)
      const checkOut = new Date(timecard.check_out_time)
      
      if (checkOut <= checkIn) {
        errors.push(`Invalid time sequence for ${timecard.date}: check-out must be after check-in`)
      }
    }

    if (timecard.break_start_time && timecard.break_end_time) {
      const breakStart = new Date(timecard.break_start_time)
      const breakEnd = new Date(timecard.break_end_time)
      
      if (breakEnd <= breakStart) {
        errors.push(`Invalid break sequence for ${timecard.date}: break end must be after break start`)
      }
    }
  }

  return {
    canSubmit: errors.length === 0,
    missingBreaks,
    errors
  }
}

/**
 * Validates if a timecard can be edited based on its status
 * Implements requirement 4.8: submitted timecards should be viewable but not editable
 */
export function canEditTimecard(timecard: Timecard): boolean {
  return timecard.status === 'draft'
}

/**
 * Gets user-friendly status text for timecard editing restrictions
 */
export function getTimecardEditRestrictionMessage(timecard: Timecard): string | null {
  switch (timecard.status) {
    case 'submitted':
      return 'This timecard has been submitted and cannot be edited. Contact your supervisor if changes are needed.'
    case 'approved':
      return 'This timecard has been approved and cannot be edited.'
    case 'rejected':
      return 'This timecard was rejected. You can make corrections and resubmit.'
    case 'draft':
      return null // No restriction
    default:
      return 'This timecard cannot be edited.'
  }
}

/**
 * Resolves missing break information by updating timecard records
 */
export function resolveTimecardBreaks(
  timecards: Timecard[],
  resolutions: Record<string, 'add_break' | 'no_break'>
): Partial<Timecard>[] {
  const updates: Partial<Timecard>[] = []

  for (const timecard of timecards) {
    const resolution = resolutions[timecard.id]
    if (!resolution) continue

    if (resolution === 'add_break') {
      // Add a default break (30 minutes) in the middle of the shift
      if (timecard.check_in_time && timecard.check_out_time) {
        const checkIn = new Date(timecard.check_in_time)
        const checkOut = new Date(timecard.check_out_time)
        const shiftDuration = checkOut.getTime() - checkIn.getTime()
        
        // Place break at roughly the middle of the shift
        const breakStart = new Date(checkIn.getTime() + (shiftDuration * 0.5))
        const breakEnd = new Date(breakStart.getTime() + (30 * 60 * 1000)) // 30 minutes
        
        updates.push({
          id: timecard.id,
          break_start_time: breakStart.toISOString(),
          break_end_time: breakEnd.toISOString(),
          break_duration: 30,
          // Recalculate total hours (subtract break time)
          total_hours: Math.max(0, timecard.total_hours - 0.5),
          // Recalculate total pay
          total_pay: Math.max(0, (timecard.total_hours - 0.5) * timecard.pay_rate)
        })
      }
    } else if (resolution === 'no_break') {
      // Mark that no break was taken (set break duration to 0)
      updates.push({
        id: timecard.id,
        break_start_time: undefined,
        break_end_time: undefined,
        break_duration: 0,
        // Keep original total hours and pay since no break was taken
        total_hours: timecard.total_hours,
        total_pay: timecard.total_pay
      })
    }
  }

  return updates
}