import { format } from "date-fns"

/**
 * Timezone utility functions for handling datetime-local inputs
 * 
 * The datetime-local input type expects values in the format:
 * YYYY-MM-DDTHH:mm (without timezone info, assumes local timezone)
 * 
 * But our database stores UTC timestamps, so we need to convert properly.
 */

/**
 * Convert a UTC timestamp to a datetime-local input value
 * This accounts for the user's local timezone
 */
export function utcToDatetimeLocal(utcTimestamp: string | null): string {
  if (!utcTimestamp) return ''
  
  try {
    // Create a Date object from the UTC timestamp
    const date = new Date(utcTimestamp)
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return ''
    
    // Get the timezone offset in minutes
    const timezoneOffset = date.getTimezoneOffset()
    
    // Adjust for timezone offset to get local time
    const localDate = new Date(date.getTime() - (timezoneOffset * 60 * 1000))
    
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    return localDate.toISOString().slice(0, 16)
  } catch (error) {
    console.error('Error converting UTC to datetime-local:', error)
    return ''
  }
}

/**
 * Convert a datetime-local input value to UTC timestamp
 * This accounts for the user's local timezone
 */
export function datetimeLocalToUtc(datetimeLocal: string): string {
  if (!datetimeLocal) return ''
  
  try {
    // Create a Date object treating the input as local time
    const localDate = new Date(datetimeLocal)
    
    // Check if the date is valid
    if (isNaN(localDate.getTime())) return ''
    
    // Return as UTC ISO string
    return localDate.toISOString()
  } catch (error) {
    console.error('Error converting datetime-local to UTC:', error)
    return ''
  }
}

/**
 * Format a UTC timestamp for display in the user's local timezone
 */
export function formatTimeForDisplay(utcTimestamp: string | null, formatString: string = "h:mm a"): string {
  if (!utcTimestamp) return ''
  
  const date = new Date(utcTimestamp)
  
  // Use Intl.DateTimeFormat for proper timezone handling
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

/**
 * Validate that a datetime-local value is valid
 */
export function isValidDatetimeLocal(value: string): boolean {
  if (!value) return false
  
  // Check format: YYYY-MM-DDTHH:mm
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
  if (!datetimeRegex.test(value)) return false
  
  // Check if it creates a valid date
  const date = new Date(value)
  return !isNaN(date.getTime())
}

/**
 * Get the current datetime in datetime-local format
 */
export function getCurrentDatetimeLocal(): string {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset()
  const localDate = new Date(now.getTime() - (timezoneOffset * 60 * 1000))
  return localDate.toISOString().slice(0, 16)
}

/**
 * Safely parse a date string that might be date-only (YYYY-MM-DD) or full datetime
 * This prevents timezone shifting issues with date-only values
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  
  try {
    // Check if it's a date-only format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // For date-only strings, parse as local date to avoid timezone shifting
      const [year, month, day] = dateString.split('-').map(Number)
      return new Date(year, month - 1, day) // month is 0-indexed
    }
    
    // For full datetime strings, parse normally
    return new Date(dateString)
  } catch (error) {
    console.error('Error parsing date:', error, 'for value:', dateString)
    return null
  }
}

/**
 * Format a date string safely, handling both date-only and datetime formats
 */
export function formatDateSafe(dateString: string | null | undefined, formatString: string, fallback: string = "Invalid Date"): string {
  const date = parseDate(dateString)
  if (!date || isNaN(date.getTime())) return fallback
  
  // Use date-fns format if available, otherwise use basic formatting
  if (typeof format !== 'undefined') {
    return format(date, formatString)
  }
  
  // Fallback formatting
  return date.toLocaleDateString('en-US', {
    weekday: formatString.includes('EEEE') ? 'long' : formatString.includes('EEE') ? 'short' : undefined,
    year: formatString.includes('yyyy') ? 'numeric' : undefined,
    month: formatString.includes('MMMM') ? 'long' : formatString.includes('MMM') ? 'short' : formatString.includes('MM') ? '2-digit' : undefined,
    day: formatString.includes('dd') ? '2-digit' : formatString.includes('d') ? 'numeric' : undefined
  })
}