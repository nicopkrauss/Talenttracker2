import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { describe } from 'vitest'
import { calculateAdjustedHours, calculateAdjustedHoursForDay, getAdjustedHoursBreakdown, getAdjustedHoursBreakdownForDay } from '../adjusted-hours-calculation'

describe('Adjusted Hours Calculation', () => {
  describe('calculateAdjustedHoursForDay (single day)', () => {
    it('should return 0 for 0 hours', () => {
      expect(calculateAdjustedHoursForDay(0)).toBe(0)
    })

    it('should return same hours for work under 8 hours (regular time)', () => {
      expect(calculateAdjustedHoursForDay(4)).toBe(4)
      expect(calculateAdjustedHoursForDay(8)).toBe(8)
    })

    it('should calculate overtime correctly for 9-12 hours', () => {
      // 9 hours: 8 regular + 1 overtime (1.5x) = 8 + 1.5 = 9.5
      expect(calculateAdjustedHoursForDay(9)).toBe(9.5)
      
      // 10 hours: 8 regular + 2 overtime (1.5x) = 8 + 3 = 11
      expect(calculateAdjustedHoursForDay(10)).toBe(11)
      
      // 12 hours: 8 regular + 4 overtime (1.5x) = 8 + 6 = 14
      expect(calculateAdjustedHoursForDay(12)).toBe(14)
    })

    it('should calculate double time correctly for 13+ hours', () => {
      // 13 hours: 8 regular + 4 overtime (1.5x) + 1 double (2x) = 8 + 6 + 2 = 16
      expect(calculateAdjustedHoursForDay(13)).toBe(16)
      
      // 14 hours: 8 regular + 4 overtime (1.5x) + 2 double (2x) = 8 + 6 + 4 = 18
      expect(calculateAdjustedHoursForDay(14)).toBe(18)
    })

    it('should handle the example from the requirements (13 work hours in one day)', () => {
      // 14 hour day with 1 hour meal break = 13 work hours
      // 8 hours at 1x = 8 hours
      // 4 hours at 1.5x = 6 hours  
      // 1 hour at 2x = 2 hours
      // Total = 16 adjusted hours
      expect(calculateAdjustedHoursForDay(13)).toBe(16)
    })

    it('should handle fractional hours correctly', () => {
      // 8.5 hours: 8 regular + 0.5 overtime (1.5x) = 8 + 0.75 = 8.75
      expect(calculateAdjustedHoursForDay(8.5)).toBe(8.75)
      
      // 12.5 hours: 8 regular + 4 overtime (1.5x) + 0.5 double (2x) = 8 + 6 + 1 = 15
      expect(calculateAdjustedHoursForDay(12.5)).toBe(15)
    })
  })

  describe('calculateAdjustedHours (timecard object)', () => {
    it('should handle single-day timecard with total_hours', () => {
      const timecard = { total_hours: 10 }
      // 10 hours: 8 regular + 2 overtime (1.5x) = 8 + 3 = 11
      expect(calculateAdjustedHours(timecard)).toBe(11)
    })

    it('should handle multi-day timecard with daily_entries', () => {
      const timecard = {
        total_hours: 40, // This should be ignored when daily_entries exist
        daily_entries: [
          { hours_worked: 8 }, // 8 adjusted hours
          { hours_worked: 8 }, // 8 adjusted hours
          { hours_worked: 8 }, // 8 adjusted hours
          { hours_worked: 8 }, // 8 adjusted hours
          { hours_worked: 8 }  // 8 adjusted hours
        ]
      }
      // 5 days × 8 hours each = 40 adjusted hours (no overtime per day)
      expect(calculateAdjustedHours(timecard)).toBe(40)
    })

    it('should handle multi-day timecard with some overtime days', () => {
      const timecard = {
        daily_entries: [
          { hours_worked: 8 },  // 8 adjusted hours
          { hours_worked: 10 }, // 8 + 2*1.5 = 11 adjusted hours
          { hours_worked: 8 },  // 8 adjusted hours
          { hours_worked: 12 }, // 8 + 4*1.5 = 14 adjusted hours
          { hours_worked: 8 }   // 8 adjusted hours
        ]
      }
      // Total: 8 + 11 + 8 + 14 + 8 = 49 adjusted hours
      expect(calculateAdjustedHours(timecard)).toBe(49)
    })

    it('should handle multi-day timecard with double time', () => {
      const timecard = {
        daily_entries: [
          { hours_worked: 8 },  // 8 adjusted hours
          { hours_worked: 13 }, // 8 + 4*1.5 + 1*2 = 16 adjusted hours
          { hours_worked: 8 }   // 8 adjusted hours
        ]
      }
      // Total: 8 + 16 + 8 = 32 adjusted hours
      expect(calculateAdjustedHours(timecard)).toBe(32)
    })

    it('should handle empty timecard', () => {
      expect(calculateAdjustedHours({})).toBe(0)
      expect(calculateAdjustedHours({ total_hours: 0 })).toBe(0)
      expect(calculateAdjustedHours({ daily_entries: [] })).toBe(0)
    })
  })

  describe('getAdjustedHoursBreakdownForDay', () => {
    it('should provide correct breakdown for 0 hours', () => {
      const breakdown = getAdjustedHoursBreakdownForDay(0)
      expect(breakdown).toEqual({
        regularHours: 0,
        overtimeHours: 0,
        doubleTimeHours: 0,
        adjustedHours: 0
      })
    })

    it('should provide correct breakdown for regular time only', () => {
      const breakdown = getAdjustedHoursBreakdownForDay(6)
      expect(breakdown).toEqual({
        regularHours: 6,
        overtimeHours: 0,
        doubleTimeHours: 0,
        adjustedHours: 6
      })
    })

    it('should provide correct breakdown for overtime', () => {
      const breakdown = getAdjustedHoursBreakdownForDay(10)
      expect(breakdown).toEqual({
        regularHours: 8,
        overtimeHours: 2,
        doubleTimeHours: 0,
        adjustedHours: 11
      })
    })

    it('should provide correct breakdown for double time', () => {
      const breakdown = getAdjustedHoursBreakdownForDay(14)
      expect(breakdown).toEqual({
        regularHours: 8,
        overtimeHours: 4,
        doubleTimeHours: 2,
        adjustedHours: 18
      })
    })
  })

  describe('getAdjustedHoursBreakdown (timecard object)', () => {
    it('should provide correct breakdown for multi-day timecard', () => {
      const timecard = {
        daily_entries: [
          { hours_worked: 8 },  // 8 regular
          { hours_worked: 10 }, // 8 regular + 2 overtime
          { hours_worked: 13 }  // 8 regular + 4 overtime + 1 double
        ]
      }
      const breakdown = getAdjustedHoursBreakdown(timecard)
      expect(breakdown).toEqual({
        regularHours: 24,    // 8 + 8 + 8
        overtimeHours: 6,    // 0 + 2 + 4
        doubleTimeHours: 1,  // 0 + 0 + 1
        adjustedHours: 35    // 8 + 11 + 16
      })
    })

    it('should provide correct breakdown for single-day timecard', () => {
      const timecard = { total_hours: 13 }
      const breakdown = getAdjustedHoursBreakdown(timecard)
      expect(breakdown).toEqual({
        regularHours: 8,
        overtimeHours: 4,
        doubleTimeHours: 1,
        adjustedHours: 16
      })
    })
  })
})