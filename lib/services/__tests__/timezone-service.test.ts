/**
 * Tests for TimezoneService
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
import { describe, it, expect, vi } from 'vitest'
import { TimezoneService } from '../timezone-service'

describe('TimezoneService', () => {
  describe('getProjectTimezone', () => {
    it('should return project timezone when set', () => {
      const project = { id: '1', timezone: 'America/New_York' }
      expect(TimezoneService.getProjectTimezone(project)).toBe('America/New_York')
    })

    it('should fall back to organization timezone when project timezone not set', () => {
      const project = { 
        id: '1', 
        organization: { timezone: 'America/Chicago' } 
      }
      expect(TimezoneService.getProjectTimezone(project)).toBe('America/Chicago')
    })

    it('should fall back to UTC when no timezone configured', () => {
      const project = { id: '1' }
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      expect(TimezoneService.getProjectTimezone(project)).toBe('UTC')
      expect(consoleSpy).toHaveBeenCalledWith('No valid timezone configured for project 1, using UTC')
      
      consoleSpy.mockRestore()
    })

    it('should prefer project timezone over organization timezone', () => {
      const project = { 
        id: '1', 
        timezone: 'America/Los_Angeles',
        organization: { timezone: 'America/New_York' } 
      }
      expect(TimezoneService.getProjectTimezone(project)).toBe('America/Los_Angeles')
    })
  })

  describe('calculateTransitionTime', () => {
    it('should calculate transition time correctly for UTC', () => {
      const date = new Date('2024-03-15')
      const time = '06:00'
      const timezone = 'UTC'
      
      const result = TimezoneService.calculateTransitionTime(date, time, timezone)
      
      expect(result.getHours()).toBe(6)
      expect(result.getMinutes()).toBe(0)
    })

    it('should handle different time formats', () => {
      const date = new Date('2024-03-15')
      
      // Test HH:MM format
      let result = TimezoneService.calculateTransitionTime(date, '06:00', 'UTC')
      expect(result.getHours()).toBe(6)
      expect(result.getMinutes()).toBe(0)
      
      // Test H:MM format
      result = TimezoneService.calculateTransitionTime(date, '6:30', 'UTC')
      expect(result.getHours()).toBe(6)
      expect(result.getMinutes()).toBe(30)
    })

    it('should handle timezone offsets for non-UTC timezones', () => {
      const date = new Date('2024-03-15')
      const time = '06:00'
      const timezone = 'America/New_York'
      
      const result = TimezoneService.calculateTransitionTime(date, time, timezone)
      
      // Should adjust for EST offset (UTC-5, so +5 hours = 11:00 UTC)
      expect(result.getHours()).toBe(11)
    })

    it('should return original date on invalid time format', () => {
      const date = new Date('2024-03-15')
      const time = 'invalid'
      const timezone = 'UTC'
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = TimezoneService.calculateTransitionTime(date, time, timezone)
      
      expect(result).toEqual(date)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should handle edge cases with midnight transitions', () => {
      const date = new Date('2024-03-15')
      const time = '00:00'
      const timezone = 'UTC'
      
      const result = TimezoneService.calculateTransitionTime(date, time, timezone)
      
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
    })
  })

  describe('isTransitionDue', () => {
    it('should return true when scheduled time is in the past', () => {
      const pastTime = new Date(Date.now() - 60000) // 1 minute ago
      expect(TimezoneService.isTransitionDue(pastTime)).toBe(true)
    })

    it('should return false when scheduled time is in the future', () => {
      const futureTime = new Date(Date.now() + 60000) // 1 minute from now
      expect(TimezoneService.isTransitionDue(futureTime)).toBe(false)
    })

    it('should return true when scheduled time is exactly now', () => {
      const now = new Date()
      expect(TimezoneService.isTransitionDue(now)).toBe(true)
    })
  })

  describe('handleDaylightSaving', () => {
    it('should return original date for UTC timezone', () => {
      const date = new Date('2024-07-15T12:00:00Z')
      const result = TimezoneService.handleDaylightSaving(date, 'UTC')
      expect(result).toEqual(date)
    })

    it('should adjust for DST in summer months for US timezones', () => {
      const summerDate = new Date('2024-07-15T12:00:00Z')
      const result = TimezoneService.handleDaylightSaving(summerDate, 'America/New_York')
      
      // Should be adjusted back 1 hour for DST
      // Note: The actual hour depends on local timezone interpretation
      expect(result.getTime()).toBeLessThan(summerDate.getTime())
      expect(result.getTime()).toBe(summerDate.getTime() - (60 * 60 * 1000)) // 1 hour less
    })

    it('should not adjust for DST in winter months for US timezones', () => {
      const winterDate = new Date('2024-01-15T12:00:00Z')
      const result = TimezoneService.handleDaylightSaving(winterDate, 'America/New_York')
      
      // Should remain unchanged in winter (no DST adjustment)
      expect(result.getTime()).toBe(winterDate.getTime())
    })

    it('should not adjust for non-US timezones', () => {
      const date = new Date('2024-07-15T12:00:00Z')
      const result = TimezoneService.handleDaylightSaving(date, 'Europe/London')
      
      expect(result).toEqual(date)
    })
  })

  describe('validateTimezone', () => {
    it('should return true for valid IANA timezone identifiers', () => {
      expect(TimezoneService.validateTimezone('America/New_York')).toBe(true)
      expect(TimezoneService.validateTimezone('Europe/London')).toBe(true)
      expect(TimezoneService.validateTimezone('Asia/Tokyo')).toBe(true)
      expect(TimezoneService.validateTimezone('UTC')).toBe(true)
    })

    it('should return false for invalid timezone identifiers', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      expect(TimezoneService.validateTimezone('Invalid/Timezone')).toBe(false)
      expect(TimezoneService.validateTimezone('NotATimezone/AtAll')).toBe(false)
      expect(TimezoneService.validateTimezone('')).toBe(false)
      
      expect(consoleSpy).toHaveBeenCalledTimes(3)
      consoleSpy.mockRestore()
    })
  })

  describe('formatInTimezone', () => {
    it('should format date in specified timezone', () => {
      const date = new Date('2024-03-15T12:00:00Z')
      const result = TimezoneService.formatInTimezone(date, 'America/New_York')
      
      // Should be formatted in Eastern time
      expect(result).toMatch(/03\/15\/2024/)
      expect(result).toMatch(/08:00:00/) // 12:00 UTC = 08:00 EST (UTC-4 in March)
    })

    it('should return ISO string on formatting error', () => {
      const date = new Date('2024-03-15T12:00:00Z')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = TimezoneService.formatInTimezone(date, 'Invalid/Timezone')
      
      expect(result).toBe(date.toISOString())
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('getCurrentTimeInTimezone', () => {
    it('should return current time for UTC', () => {
      const result = TimezoneService.getCurrentTimeInTimezone('UTC')
      const now = new Date()
      
      // Should be within 1 second of current time
      expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000)
    })

    it('should handle invalid timezone by falling back to UTC', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const result = TimezoneService.getCurrentTimeInTimezone('Invalid/Timezone')
      const now = new Date()
      
      expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid timezone Invalid/Timezone, using UTC')
      
      consoleSpy.mockRestore()
    })

    it('should calculate time for valid non-UTC timezone', () => {
      const result = TimezoneService.getCurrentTimeInTimezone('America/New_York')
      const now = new Date()
      
      // Should be a valid date
      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBeGreaterThan(0)
    })
  })

  describe('getTimezoneOffsetDifference', () => {
    it('should return 0 for same timezone', () => {
      const result = TimezoneService.getTimezoneOffsetDifference('UTC', 'UTC')
      expect(result).toBe(0)
    })

    it('should calculate difference between timezones', () => {
      const result = TimezoneService.getTimezoneOffsetDifference('America/New_York', 'America/Los_Angeles')
      // EST is UTC-5, PST is UTC-8, so difference should be 3 hours (180 minutes)
      expect(result).toBe(180)
    })

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // This shouldn't cause an error, but if it does, should return 0
      const result = TimezoneService.getTimezoneOffsetDifference('Invalid/Timezone', 'UTC')
      expect(result).toBe(0)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Enhanced Input Validation', () => {
    it('should validate timezone in getProjectTimezone', () => {
      const project = { 
        id: '1', 
        timezone: 'Invalid/Timezone',
        organization: { timezone: 'America/New_York' }
      }
      
      // Should fall back to organization timezone when project timezone is invalid
      expect(TimezoneService.getProjectTimezone(project)).toBe('America/New_York')
    })

    it('should handle invalid date in calculateTransitionTime', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const invalidDate = new Date('invalid')
      const result = TimezoneService.calculateTransitionTime(invalidDate, '06:00', 'UTC')
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should validate time format more strictly', () => {
      const date = new Date('2024-03-15')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Test invalid hour
      let result = TimezoneService.calculateTransitionTime(date, '25:00', 'UTC')
      expect(consoleSpy).toHaveBeenCalled()
      
      // Test invalid minute
      result = TimezoneService.calculateTransitionTime(date, '12:70', 'UTC')
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle year boundary transitions correctly', () => {
      const newYearDate = new Date('2023-12-31T23:30:00Z')
      const time = '01:00'
      const timezone = 'UTC'
      
      const result = TimezoneService.calculateTransitionTime(newYearDate, time, timezone)
      
      expect(result.getHours()).toBe(1)
      expect(result.getMinutes()).toBe(0)
    })

    it('should handle leap year dates correctly', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00Z')
      const time = '06:00'
      const timezone = 'UTC'
      
      const result = TimezoneService.calculateTransitionTime(leapYearDate, time, timezone)
      
      expect(result.getHours()).toBe(6)
      expect(result.getDate()).toBe(29)
      expect(result.getMonth()).toBe(1) // February (0-indexed)
    })

    it('should handle DST transition dates correctly', () => {
      // Use a date that's clearly in DST period (July)
      const dstDate = new Date('2024-07-15T12:00:00Z')
      const result = TimezoneService.handleDaylightSaving(dstDate, 'America/New_York')
      
      // Should be adjusted for DST (1 hour less)
      expect(result.getTime()).toBeLessThan(dstDate.getTime())
      expect(result.getTime()).toBe(dstDate.getTime() - (60 * 60 * 1000))
    })

    it('should handle multiple timezone calculations in sequence', () => {
      const date = new Date('2024-06-15T12:00:00Z')
      const time = '09:00'
      
      const nyResult = TimezoneService.calculateTransitionTime(date, time, 'America/New_York')
      const laResult = TimezoneService.calculateTransitionTime(date, time, 'America/Los_Angeles')
      const utcResult = TimezoneService.calculateTransitionTime(date, time, 'UTC')
      
      // Each should have different UTC times due to timezone offsets
      expect(nyResult.getTime()).not.toBe(laResult.getTime())
      expect(nyResult.getTime()).not.toBe(utcResult.getTime())
      expect(laResult.getTime()).not.toBe(utcResult.getTime())
    })
  })
})