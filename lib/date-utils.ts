/**
 * Date utility functions to handle timezone issues consistently across the application
 */

/**
 * Parse a date string in local timezone to avoid UTC conversion issues
 * This ensures that "2024-12-15" displays as December 15th regardless of timezone
 */
export function parseLocalDate(dateString: string): Date {
  // Add time component to ensure local timezone interpretation
  return new Date(dateString + 'T00:00:00')
}

/**
 * Format a date string for display, handling timezone issues
 */
export function formatDateString(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(dateString)
  return date.toLocaleDateString('en-US', options)
}

/**
 * Format a date string with default formatting (Month Day, Year)
 */
export function formatDateStringDefault(dateString: string): string {
  return formatDateString(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format a date string with short formatting (MMM d, yyyy)
 */
export function formatDateStringShort(dateString: string): string {
  return formatDateString(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format a date string for compact display (MMM d)
 */
export function formatDateStringCompact(dateString: string): string {
  return formatDateString(dateString, {
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Get month and day numbers from a date string (for schedule display)
 */
export function getMonthDay(dateString: string): { month: number; day: number } {
  const date = parseLocalDate(dateString)
  return {
    month: date.getMonth() + 1,
    day: date.getDate()
  }
}