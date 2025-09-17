/**
 * Service for mapping project locations to timezones
 * This service converts city/state locations to IANA timezone identifiers
 */

interface LocationTimezoneMapping {
  [key: string]: string
}

// Major US cities and their timezones
const US_CITY_TIMEZONES: LocationTimezoneMapping = {
  // Eastern Time Zone
  'new york': 'America/New_York',
  'new york city': 'America/New_York',
  'nyc': 'America/New_York',
  'manhattan': 'America/New_York',
  'brooklyn': 'America/New_York',
  'queens': 'America/New_York',
  'bronx': 'America/New_York',
  'staten island': 'America/New_York',
  'atlanta': 'America/New_York',
  'boston': 'America/New_York',
  'philadelphia': 'America/New_York',
  'miami': 'America/New_York',
  'orlando': 'America/New_York',
  'tampa': 'America/New_York',
  'jacksonville': 'America/New_York',
  'charlotte': 'America/New_York',
  'raleigh': 'America/New_York',
  'richmond': 'America/New_York',
  'washington': 'America/New_York',
  'washington dc': 'America/New_York',
  'baltimore': 'America/New_York',
  'pittsburgh': 'America/New_York',
  'buffalo': 'America/New_York',
  'albany': 'America/New_York',
  'detroit': 'America/Detroit',
  'cleveland': 'America/New_York',
  'columbus': 'America/New_York',
  'cincinnati': 'America/New_York',
  'indianapolis': 'America/Indiana/Indianapolis',
  'louisville': 'America/Kentucky/Louisville',
  'nashville': 'America/Chicago',
  'memphis': 'America/Chicago',
  'knoxville': 'America/New_York',

  // Central Time Zone
  'chicago': 'America/Chicago',
  'dallas': 'America/Chicago',
  'houston': 'America/Chicago',
  'san antonio': 'America/Chicago',
  'austin': 'America/Chicago',
  'fort worth': 'America/Chicago',
  'oklahoma city': 'America/Chicago',
  'tulsa': 'America/Chicago',
  'kansas city': 'America/Chicago',
  'st louis': 'America/Chicago',
  'milwaukee': 'America/Chicago',
  'minneapolis': 'America/Chicago',
  'st paul': 'America/Chicago',
  'omaha': 'America/Chicago',
  'des moines': 'America/Chicago',
  'little rock': 'America/Chicago',
  'jackson': 'America/Chicago',
  'birmingham': 'America/Chicago',
  'mobile': 'America/Chicago',
  'new orleans': 'America/Chicago',
  'baton rouge': 'America/Chicago',
  'shreveport': 'America/Chicago',

  // Mountain Time Zone
  'denver': 'America/Denver',
  'colorado springs': 'America/Denver',
  'boulder': 'America/Denver',
  'salt lake city': 'America/Denver',
  'phoenix': 'America/Phoenix', // Arizona doesn't observe DST
  'tucson': 'America/Phoenix',
  'scottsdale': 'America/Phoenix',
  'albuquerque': 'America/Denver',
  'santa fe': 'America/Denver',
  'las vegas': 'America/Los_Angeles', // Nevada is Pacific Time
  'reno': 'America/Los_Angeles',
  'boise': 'America/Boise',
  'billings': 'America/Denver',
  'missoula': 'America/Denver',
  'cheyenne': 'America/Denver',
  'casper': 'America/Denver',

  // Pacific Time Zone
  'los angeles': 'America/Los_Angeles',
  'la': 'America/Los_Angeles',
  'hollywood': 'America/Los_Angeles',
  'beverly hills': 'America/Los_Angeles',
  'santa monica': 'America/Los_Angeles',
  'pasadena': 'America/Los_Angeles',
  'long beach': 'America/Los_Angeles',
  'anaheim': 'America/Los_Angeles',
  'san diego': 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles',
  'sf': 'America/Los_Angeles',
  'oakland': 'America/Los_Angeles',
  'san jose': 'America/Los_Angeles',
  'sacramento': 'America/Los_Angeles',
  'fresno': 'America/Los_Angeles',
  'bakersfield': 'America/Los_Angeles',
  'stockton': 'America/Los_Angeles',
  'modesto': 'America/Los_Angeles',
  'riverside': 'America/Los_Angeles',
  'santa barbara': 'America/Los_Angeles',
  'ventura': 'America/Los_Angeles',
  'oxnard': 'America/Los_Angeles',
  'portland': 'America/Los_Angeles',
  'seattle': 'America/Los_Angeles',
  'spokane': 'America/Los_Angeles',
  'tacoma': 'America/Los_Angeles',
  'vancouver': 'America/Los_Angeles', // Vancouver, WA

  // Alaska Time Zone
  'anchorage': 'America/Anchorage',
  'fairbanks': 'America/Anchorage',
  'juneau': 'America/Juneau',

  // Hawaii Time Zone
  'honolulu': 'Pacific/Honolulu',
  'hilo': 'Pacific/Honolulu',
  'kona': 'Pacific/Honolulu',
  'maui': 'Pacific/Honolulu',
  'kauai': 'Pacific/Honolulu',

  // Canadian cities (common for US productions)
  'toronto': 'America/Toronto',
  'vancouver bc': 'America/Vancouver',
  'montreal': 'America/Montreal',
  'calgary': 'America/Edmonton',
  'edmonton': 'America/Edmonton',
  'winnipeg': 'America/Winnipeg',
  'ottawa': 'America/Toronto',
}

// State-based timezone mappings (fallback)
const US_STATE_TIMEZONES: LocationTimezoneMapping = {
  // Eastern Time
  'florida': 'America/New_York',
  'fl': 'America/New_York',
  'georgia': 'America/New_York',
  'ga': 'America/New_York',
  'south carolina': 'America/New_York',
  'sc': 'America/New_York',
  'north carolina': 'America/New_York',
  'nc': 'America/New_York',
  'virginia': 'America/New_York',
  'va': 'America/New_York',
  'west virginia': 'America/New_York',
  'wv': 'America/New_York',
  'maryland': 'America/New_York',
  'md': 'America/New_York',
  'delaware': 'America/New_York',
  'de': 'America/New_York',
  'pennsylvania': 'America/New_York',
  'pa': 'America/New_York',
  'new jersey': 'America/New_York',
  'nj': 'America/New_York',
  'new york': 'America/New_York',
  'ny': 'America/New_York',
  'connecticut': 'America/New_York',
  'ct': 'America/New_York',
  'rhode island': 'America/New_York',
  'ri': 'America/New_York',
  'massachusetts': 'America/New_York',
  'ma': 'America/New_York',
  'vermont': 'America/New_York',
  'vt': 'America/New_York',
  'new hampshire': 'America/New_York',
  'nh': 'America/New_York',
  'maine': 'America/New_York',
  'me': 'America/New_York',
  'ohio': 'America/New_York',
  'oh': 'America/New_York',
  'michigan': 'America/Detroit',
  'mi': 'America/Detroit',
  'kentucky': 'America/Kentucky/Louisville',
  'ky': 'America/Kentucky/Louisville',
  'tennessee': 'America/Chicago',
  'tn': 'America/Chicago',
  'indiana': 'America/Indiana/Indianapolis',
  'in': 'America/Indiana/Indianapolis',

  // Central Time
  'alabama': 'America/Chicago',
  'al': 'America/Chicago',
  'mississippi': 'America/Chicago',
  'ms': 'America/Chicago',
  'louisiana': 'America/Chicago',
  'la': 'America/Chicago',
  'arkansas': 'America/Chicago',
  'ar': 'America/Chicago',
  'missouri': 'America/Chicago',
  'mo': 'America/Chicago',
  'iowa': 'America/Chicago',
  'ia': 'America/Chicago',
  'minnesota': 'America/Chicago',
  'mn': 'America/Chicago',
  'wisconsin': 'America/Chicago',
  'wi': 'America/Chicago',
  'illinois': 'America/Chicago',
  'il': 'America/Chicago',
  'oklahoma': 'America/Chicago',
  'ok': 'America/Chicago',
  'kansas': 'America/Chicago',
  'ks': 'America/Chicago',
  'nebraska': 'America/Chicago',
  'ne': 'America/Chicago',
  'south dakota': 'America/Chicago',
  'sd': 'America/Chicago',
  'north dakota': 'America/Chicago',
  'nd': 'America/Chicago',
  'texas': 'America/Chicago',
  'tx': 'America/Chicago',

  // Mountain Time
  'montana': 'America/Denver',
  'mt': 'America/Denver',
  'wyoming': 'America/Denver',
  'wy': 'America/Denver',
  'colorado': 'America/Denver',
  'co': 'America/Denver',
  'new mexico': 'America/Denver',
  'nm': 'America/Denver',
  'utah': 'America/Denver',
  'ut': 'America/Denver',
  'idaho': 'America/Boise',
  'id': 'America/Boise',
  'arizona': 'America/Phoenix',
  'az': 'America/Phoenix',

  // Pacific Time
  'california': 'America/Los_Angeles',
  'ca': 'America/Los_Angeles',
  'nevada': 'America/Los_Angeles',
  'nv': 'America/Los_Angeles',
  'oregon': 'America/Los_Angeles',
  'or': 'America/Los_Angeles',
  'washington': 'America/Los_Angeles',
  'wa': 'America/Los_Angeles',

  // Alaska Time
  'alaska': 'America/Anchorage',
  'ak': 'America/Anchorage',

  // Hawaii Time
  'hawaii': 'Pacific/Honolulu',
  'hi': 'Pacific/Honolulu',
}

export class LocationTimezoneService {
  /**
   * Convert a location string to an IANA timezone identifier
   */
  static getTimezoneFromLocation(location: string): string | null {
    if (!location) return null

    const normalizedLocation = location.toLowerCase().trim()

    // First try exact city match
    if (US_CITY_TIMEZONES[normalizedLocation]) {
      return US_CITY_TIMEZONES[normalizedLocation]
    }

    // Try partial city matches
    for (const [city, timezone] of Object.entries(US_CITY_TIMEZONES)) {
      if (normalizedLocation.includes(city) || city.includes(normalizedLocation)) {
        return timezone
      }
    }

    // Try state matches
    if (US_STATE_TIMEZONES[normalizedLocation]) {
      return US_STATE_TIMEZONES[normalizedLocation]
    }

    // Try partial state matches
    for (const [state, timezone] of Object.entries(US_STATE_TIMEZONES)) {
      if (normalizedLocation.includes(state) || state.includes(normalizedLocation)) {
        return timezone
      }
    }

    // Try to extract state from "City, State" format
    const parts = normalizedLocation.split(',').map(part => part.trim())
    if (parts.length >= 2) {
      const state = parts[parts.length - 1]
      if (US_STATE_TIMEZONES[state]) {
        return US_STATE_TIMEZONES[state]
      }
    }

    return null
  }

  /**
   * Get a list of common US timezones for selection
   */
  static getCommonTimezones(): Array<{ value: string; label: string; region: string }> {
    return [
      { value: 'America/New_York', label: 'Eastern Time (ET)', region: 'US East Coast' },
      { value: 'America/Chicago', label: 'Central Time (CT)', region: 'US Central' },
      { value: 'America/Denver', label: 'Mountain Time (MT)', region: 'US Mountain' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', region: 'US West Coast' },
      { value: 'America/Phoenix', label: 'Arizona Time (MST)', region: 'Arizona' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKST)', region: 'Alaska' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', region: 'Hawaii' },
      { value: 'America/Toronto', label: 'Eastern Time (Canada)', region: 'Canada East' },
      { value: 'America/Vancouver', label: 'Pacific Time (Canada)', region: 'Canada West' },
    ]
  }

  /**
   * Validate that a timezone is a valid IANA timezone identifier
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get timezone display name for a given IANA timezone
   */
  static getTimezoneDisplayName(timezone: string): string {
    try {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      })
      
      const parts = formatter.formatToParts(now)
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value
      
      return timeZoneName || timezone
    } catch (error) {
      return timezone
    }
  }

  /**
   * Get suggestions for location input
   */
  static getLocationSuggestions(input: string): string[] {
    if (!input || input.length < 2) return []

    const normalizedInput = input.toLowerCase()
    const suggestions: string[] = []

    // Get city suggestions
    for (const city of Object.keys(US_CITY_TIMEZONES)) {
      if (city.startsWith(normalizedInput) || city.includes(normalizedInput)) {
        // Capitalize first letter of each word
        const formatted = city.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        suggestions.push(formatted)
      }
    }

    // Get state suggestions
    for (const state of Object.keys(US_STATE_TIMEZONES)) {
      if (state.startsWith(normalizedInput) || state.includes(normalizedInput)) {
        // Capitalize first letter of each word
        const formatted = state.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        if (!suggestions.includes(formatted)) {
          suggestions.push(formatted)
        }
      }
    }

    return suggestions.slice(0, 10) // Limit to 10 suggestions
  }
}