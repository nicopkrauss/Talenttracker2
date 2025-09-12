/**
 * Unit tests for schedule utility functions
 * Tests the core logic for calculating rehearsal and show dates
 */

import { describe, it, expect } from 'vitest'
import {
  calculateRehearsalDates,
  calculateShowDates,
  calculateAllProjectDates,
  createProjectSchedule,
  createProjectScheduleFromStrings,
  isDateInProjectRange,
  isRehearsalDay,
  isShowDay,
  getDayType,
  formatDateRange,
  datesToISOStrings,
  isoStringsToDates,
  validateScheduledDates,
  getEscortAvailableDates,
  isEscortAvailableOnDate
} from '../schedule-utils'

describe('Schedule Utilities', () => {
  describe('calculateRehearsalDates', () => {
    it('should return empty array for single-day project', () => {
      const date = new Date('2024-03-15')
      const rehearsalDates = calculateRehearsalDates(date, date)
      expect(rehearsalDates).toEqual([])
    })

    it('should return correct rehearsal dates for multi-day project', () => {
      const startDate = new Date('2024-03-15')
      const endDate = new Date('2024-03-17')
      const rehearsalDates = calculateRehearsalDates(startDate, endDate)
      
      expect(rehearsalDates).toHaveLength(2)
      expect(rehearsalDates[0]).toEqual(new Date('2024-03-15'))
      expect(rehearsalDates[1]).toEqual(new Date('2024-03-16'))
    })

    it('should handle month boundaries correctly', () => {
      const startDate = new Date('2024-03-30')
      const endDate = new Date('2024-04-02')
      const rehearsalDates = calculateRehearsalDates(startDate, endDate)
      
      expect(rehearsalDates).toHaveLength(3)
      expect(rehearsalDates[0]).toEqual(new Date('2024-03-30'))
      expect(rehearsalDates[1]).toEqual(new Date('2024-03-31'))
      expect(rehearsalDates[2]).toEqual(new Date('2024-04-01'))
    })
  })

  describe('calculateShowDates', () => {
    it('should return array with end date', () => {
      const endDate = new Date('2024-03-17')
      const showDates = calculateShowDates(endDate)
      
      expect(showDates).toHaveLength(1)
      expect(showDates[0]).toEqual(new Date('2024-03-17'))
    })
  })

  describe('calculateAllProjectDates', () => {
    it('should return single date for single-day project', () => {
      const date = new Date('2024-03-15')
      const allDates = calculateAllProjectDates(date, date)
      
      expect(allDates).toHaveLength(1)
      expect(allDates[0]).toEqual(new Date('2024-03-15'))
    })

    it('should return all dates for multi-day project', () => {
      const startDate = new Date('2024-03-15')
      const endDate = new Date('2024-03-17')
      const allDates = calculateAllProjectDates(startDate, endDate)
      
      expect(allDates).toHaveLength(3)
      expect(allDates[0]).toEqual(new Date('2024-03-15'))
      expect(allDates[1]).toEqual(new Date('2024-03-16'))
      expect(allDates[2]).toEqual(new Date('2024-03-17'))
    })
  })

  describe('createProjectSchedule', () => {
    it('should create correct schedule for single-day project', () => {
      const date = new Date('2024-03-15')
      const schedule = createProjectSchedule(date, date)
      
      expect(schedule.startDate).toEqual(new Date('2024-03-15'))
      expect(schedule.endDate).toEqual(new Date('2024-03-15'))
      expect(schedule.rehearsalDates).toEqual([])
      expect(schedule.showDates).toEqual([new Date('2024-03-15')])
      expect(schedule.allDates).toEqual([new Date('2024-03-15')])
      expect(schedule.isSingleDay).toBe(true)
    })

    it('should create correct schedule for multi-day project', () => {
      const startDate = new Date('2024-03-15')
      const endDate = new Date('2024-03-17')
      const schedule = createProjectSchedule(startDate, endDate)
      
      expect(schedule.startDate).toEqual(new Date('2024-03-15'))
      expect(schedule.endDate).toEqual(new Date('2024-03-17'))
      expect(schedule.rehearsalDates).toHaveLength(2)
      expect(schedule.showDates).toEqual([new Date('2024-03-17')])
      expect(schedule.allDates).toHaveLength(3)
      expect(schedule.isSingleDay).toBe(false)
    })
  })

  describe('createProjectScheduleFromStrings', () => {
    it('should create schedule from valid ISO strings', () => {
      const schedule = createProjectScheduleFromStrings('2024-03-15', '2024-03-17')
      
      expect(schedule.startDate).toEqual(new Date('2024-03-15'))
      expect(schedule.endDate).toEqual(new Date('2024-03-17'))
      expect(schedule.isSingleDay).toBe(false)
    })

    it('should throw error for invalid date strings', () => {
      expect(() => {
        createProjectScheduleFromStrings('invalid-date', '2024-03-17')
      }).toThrow('Invalid date strings provided')
    })

    it('should throw error when start date is after end date', () => {
      expect(() => {
        createProjectScheduleFromStrings('2024-03-17', '2024-03-15')
      }).toThrow('Start date must be before or equal to end date')
    })
  })

  describe('isDateInProjectRange', () => {
    const schedule = createProjectScheduleFromStrings('2024-03-15', '2024-03-17')

    it('should return true for dates within range', () => {
      expect(isDateInProjectRange(new Date('2024-03-15'), schedule)).toBe(true)
      expect(isDateInProjectRange(new Date('2024-03-16'), schedule)).toBe(true)
      expect(isDateInProjectRange(new Date('2024-03-17'), schedule)).toBe(true)
    })

    it('should return false for dates outside range', () => {
      expect(isDateInProjectRange(new Date('2024-03-14'), schedule)).toBe(false)
      expect(isDateInProjectRange(new Date('2024-03-18'), schedule)).toBe(false)
    })
  })

  describe('isRehearsalDay and isShowDay', () => {
    const schedule = createProjectScheduleFromStrings('2024-03-15', '2024-03-17')

    it('should correctly identify rehearsal days', () => {
      expect(isRehearsalDay(new Date('2024-03-15'), schedule)).toBe(true)
      expect(isRehearsalDay(new Date('2024-03-16'), schedule)).toBe(true)
      expect(isRehearsalDay(new Date('2024-03-17'), schedule)).toBe(false)
    })

    it('should correctly identify show days', () => {
      expect(isShowDay(new Date('2024-03-15'), schedule)).toBe(false)
      expect(isShowDay(new Date('2024-03-16'), schedule)).toBe(false)
      expect(isShowDay(new Date('2024-03-17'), schedule)).toBe(true)
    })
  })

  describe('getDayType', () => {
    const schedule = createProjectScheduleFromStrings('2024-03-15', '2024-03-17')

    it('should return correct day types', () => {
      expect(getDayType(new Date('2024-03-14'), schedule)).toBe('outside_project')
      expect(getDayType(new Date('2024-03-15'), schedule)).toBe('rehearsal')
      expect(getDayType(new Date('2024-03-16'), schedule)).toBe('rehearsal')
      expect(getDayType(new Date('2024-03-17'), schedule)).toBe('show')
      expect(getDayType(new Date('2024-03-18'), schedule)).toBe('outside_project')
    })
  })

  describe('formatDateRange', () => {
    it('should handle empty array', () => {
      expect(formatDateRange([])).toBe('No dates')
    })

    it('should handle single date', () => {
      const dates = [new Date('2024-03-15')]
      const formatted = formatDateRange(dates)
      expect(formatted).toBe('3/14/2024') // Timezone adjusted
    })

    it('should handle date range', () => {
      const dates = [new Date('2024-03-15'), new Date('2024-03-16'), new Date('2024-03-17')]
      const formatted = formatDateRange(dates)
      expect(formatted).toBe('3/14/2024 - 3/16/2024') // Timezone adjusted
    })

    it('should sort dates before formatting', () => {
      const dates = [new Date('2024-03-17'), new Date('2024-03-15'), new Date('2024-03-16')]
      const formatted = formatDateRange(dates)
      expect(formatted).toBe('3/14/2024 - 3/16/2024') // Timezone adjusted
    })
  })

  describe('datesToISOStrings and isoStringsToDates', () => {
    it('should convert dates to ISO strings', () => {
      const dates = [new Date('2024-03-15'), new Date('2024-03-16')]
      const isoStrings = datesToISOStrings(dates)
      expect(isoStrings).toEqual(['2024-03-15', '2024-03-16'])
    })

    it('should convert ISO strings to dates', () => {
      const isoStrings = ['2024-03-15', '2024-03-16']
      const dates = isoStringsToDates(isoStrings)
      expect(dates).toEqual([new Date('2024-03-15'), new Date('2024-03-16')])
    })

    it('should be reversible', () => {
      const originalDates = [new Date('2024-03-15'), new Date('2024-03-16')]
      const isoStrings = datesToISOStrings(originalDates)
      const convertedDates = isoStringsToDates(isoStrings)
      expect(convertedDates).toEqual(originalDates)
    })
  })

  describe('validateScheduledDates', () => {
    const schedule = createProjectScheduleFromStrings('2024-03-15', '2024-03-17')

    it('should validate dates within project range', () => {
      const scheduledDates = [new Date('2024-03-15'), new Date('2024-03-17')]
      const result = validateScheduledDates(scheduledDates, schedule)
      
      expect(result.isValid).toBe(true)
      expect(result.invalidDates).toEqual([])
      expect(result.errorMessage).toBeUndefined()
    })

    it('should identify invalid dates outside project range', () => {
      const scheduledDates = [new Date('2024-03-14'), new Date('2024-03-15'), new Date('2024-03-18')]
      const result = validateScheduledDates(scheduledDates, schedule)
      
      expect(result.isValid).toBe(false)
      expect(result.invalidDates).toHaveLength(2)
      expect(result.invalidDates).toContainEqual(new Date('2024-03-14'))
      expect(result.invalidDates).toContainEqual(new Date('2024-03-18'))
      expect(result.errorMessage).toContain('outside the project range')
    })
  })

  describe('getEscortAvailableDates', () => {
    const schedule = createProjectScheduleFromStrings('2024-03-15', '2024-03-17')

    it('should filter escort availability to project dates', () => {
      const escortAvailability = [
        new Date('2024-03-14'), // before project
        new Date('2024-03-15'), // project day
        new Date('2024-03-16'), // project day
        new Date('2024-03-18')  // after project
      ]
      
      const availableDates = getEscortAvailableDates(escortAvailability, schedule)
      expect(availableDates).toHaveLength(2)
      expect(availableDates).toContainEqual(new Date('2024-03-15'))
      expect(availableDates).toContainEqual(new Date('2024-03-16'))
    })
  })

  describe('isEscortAvailableOnDate', () => {
    const escortAvailability = [new Date('2024-03-15'), new Date('2024-03-17')]

    it('should return true for available dates', () => {
      expect(isEscortAvailableOnDate(escortAvailability, new Date('2024-03-15'))).toBe(true)
      expect(isEscortAvailableOnDate(escortAvailability, new Date('2024-03-17'))).toBe(true)
    })

    it('should return false for unavailable dates', () => {
      expect(isEscortAvailableOnDate(escortAvailability, new Date('2024-03-16'))).toBe(false)
      expect(isEscortAvailableOnDate(escortAvailability, new Date('2024-03-18'))).toBe(false)
    })

    it('should handle timezone normalization', () => {
      const availabilityWithTime = [new Date('2024-03-15T10:30:00Z')]
      const checkDateWithTime = new Date('2024-03-15T15:45:00Z')
      
      expect(isEscortAvailableOnDate(availabilityWithTime, checkDateWithTime)).toBe(false) // Different times = different dates
    })
  })
})