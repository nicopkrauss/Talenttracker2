/**
 * Utility functions for calculating rehearsal and show dates from project start and end dates
 * Used by the multi-day scheduling system to automatically determine project timeline
 */

import { ProjectSchedule } from './types'

/**
 * Calculate rehearsal dates from project start and end dates
 * Rehearsal days are all days from start_date to (end_date - 1 day)
 * For single-day projects, returns empty array (no rehearsal days)
 */
export function calculateRehearsalDates(startDate: Date, endDate: Date): Date[] {
  // Single day project has no rehearsal days
  if (startDate.getTime() === endDate.getTime()) {
    return []
  }
  
  const rehearsalDates: Date[] = []
  const current = new Date(startDate)
  
  // Add all days from start to (end - 1)
  while (current < endDate) {
    rehearsalDates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return rehearsalDates
}

/**
 * Calculate show dates from project end date
 * Show day is always the end_date
 */
export function calculateShowDates(endDate: Date): Date[] {
  return [new Date(endDate)]
}

/**
 * Calculate all project dates from start to end (inclusive)
 */
export function calculateAllProjectDates(startDate: Date, endDate: Date): Date[] {
  const allDates: Date[] = []
  const current = new Date(startDate)
  
  // Add all days from start to end (inclusive)
  while (current <= endDate) {
    allDates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return allDates
}

/**
 * Create a complete ProjectSchedule object from start and end dates
 * This is the main function used throughout the application
 */
export function createProjectSchedule(startDate: Date, endDate: Date): ProjectSchedule {
  const rehearsalDates = calculateRehearsalDates(startDate, endDate)
  const showDates = calculateShowDates(endDate)
  const allDates = calculateAllProjectDates(startDate, endDate)
  const isSingleDay = startDate.getTime() === endDate.getTime()
  
  return {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    rehearsalDates,
    showDates,
    allDates,
    isSingleDay
  }
}

/**
 * Create ProjectSchedule from ISO date strings (common API format)
 * Handles timezone issues by creating dates in local timezone
 */
export function createProjectScheduleFromStrings(startDateStr: string, endDateStr: string): ProjectSchedule {
  // Create dates in local timezone to avoid UTC conversion issues
  const startDate = new Date(startDateStr + 'T00:00:00')
  const endDate = new Date(endDateStr + 'T00:00:00')
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date strings provided')
  }
  
  if (startDate > endDate) {
    throw new Error('Start date must be before or equal to end date')
  }
  
  return createProjectSchedule(startDate, endDate)
}

/**
 * Check if a date falls within the project date range
 */
export function isDateInProjectRange(date: Date, projectSchedule: ProjectSchedule): boolean {
  return date >= projectSchedule.startDate && date <= projectSchedule.endDate
}

/**
 * Check if a date is a rehearsal day
 */
export function isRehearsalDay(date: Date, projectSchedule: ProjectSchedule): boolean {
  return projectSchedule.rehearsalDates.some(rehearsalDate => 
    rehearsalDate.getTime() === date.getTime()
  )
}

/**
 * Check if a date is a show day
 */
export function isShowDay(date: Date, projectSchedule: ProjectSchedule): boolean {
  return projectSchedule.showDates.some(showDate => 
    showDate.getTime() === date.getTime()
  )
}

/**
 * Get the day type for a given date within a project
 */
export function getDayType(date: Date, projectSchedule: ProjectSchedule): 'rehearsal' | 'show' | 'outside_project' {
  if (!isDateInProjectRange(date, projectSchedule)) {
    return 'outside_project'
  }
  
  if (isShowDay(date, projectSchedule)) {
    return 'show'
  }
  
  return 'rehearsal'
}

/**
 * Format a date array for display purposes
 */
export function formatDateRange(dates: Date[]): string {
  if (dates.length === 0) return 'No dates'
  if (dates.length === 1) return dates[0].toLocaleDateString()
  
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const firstDate = sortedDates[0]
  const lastDate = sortedDates[sortedDates.length - 1]
  
  return `${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()}`
}

/**
 * Convert Date array to ISO string array for API calls
 */
export function datesToISOStrings(dates: Date[]): string[] {
  return dates.map(date => date.toISOString().split('T')[0])
}

/**
 * Convert ISO string array to Date array from API responses
 */
export function isoStringsToDates(dateStrings: string[]): Date[] {
  return dateStrings.map(dateStr => new Date(dateStr))
}

/**
 * Validate that scheduled dates fall within project date range
 */
export function validateScheduledDates(scheduledDates: Date[], projectSchedule: ProjectSchedule): {
  isValid: boolean
  invalidDates: Date[]
  errorMessage?: string
} {
  const invalidDates = scheduledDates.filter(date => !isDateInProjectRange(date, projectSchedule))
  
  if (invalidDates.length > 0) {
    return {
      isValid: false,
      invalidDates,
      errorMessage: `The following dates are outside the project range: ${invalidDates.map(d => d.toLocaleDateString()).join(', ')}`
    }
  }
  
  return {
    isValid: true,
    invalidDates: []
  }
}

/**
 * Get available dates for escort assignment based on their confirmed availability
 */
export function getEscortAvailableDates(
  escortAvailability: Date[],
  projectSchedule: ProjectSchedule
): Date[] {
  return escortAvailability.filter(date => isDateInProjectRange(date, projectSchedule))
}

/**
 * Check if an escort is available on a specific date
 */
export function isEscortAvailableOnDate(
  escortAvailability: Date[],
  checkDate: Date
): boolean {
  return escortAvailability.some(availableDate => 
    availableDate.getTime() === checkDate.getTime()
  )
}