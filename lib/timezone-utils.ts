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
export function formatTimeForDisplay(utcTimestamp: string | null, formatString: string = "h:mm:ss a"): string {
  if (!utcTimestamp) return ''
  
  const date = new Date(utcTimestamp)
  
  // Use Intl.DateTimeFormat for proper timezone handling
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
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