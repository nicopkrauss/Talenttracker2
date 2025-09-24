/**
 * Tests for Timecard Calculation Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TimecardCalculationEngine, type TimecardData } from '../timecard-calculation-engine'

describe('TimecardCalculationEngine', () => {
  let engine: TimecardCalculationEngine
  let mockSupabaseClient: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a proper mock Supabase client
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        }))
      }))
    }
    
    engine = new TimecardCalculationEngine(mockSupabaseClient)
  })

  describe('calculateTimecard', () => {
    it('should calculate total hours correctly for a basic shift', async () => {
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        status: 'draft',
        manually_edited: false
      }

      // Mock pay rate fetch
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: {
          pay_rate: 25,
          project_role_templates: {
            time_type: 'hourly',
            base_pay_rate: 20
          }
        },
        error: null
      })

      const result = await engine.calculateTimecard(timecardData)

      expect(result.is_valid).toBe(true)
      expect(result.total_hours).toBe(8) // 8 hour shift
      expect(result.break_duration).toBe(0) // No break
      expect(result.total_pay).toBe(200) // 8 hours * $25/hour
      expect(result.validation_errors).toHaveLength(0)
    })

    it('should calculate hours with break correctly', async () => {
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:30:00Z',
        break_start_time: '2024-01-15T12:00:00Z',
        break_end_time: '2024-01-15T12:30:00Z',
        status: 'draft',
        manually_edited: false
      }

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: {
          pay_rate: 25,
          project_role_templates: {
            time_type: 'hourly',
            base_pay_rate: 20
          }
        },
        error: null
      })

      const result = await engine.calculateTimecard(timecardData)

      expect(result.is_valid).toBe(true)
      expect(result.total_hours).toBe(8) // 8.5 hours - 0.5 hour break = 8 hours
      expect(result.break_duration).toBe(30) // 30 minutes
      expect(result.total_pay).toBe(200) // 8 hours * $25/hour
    })

    it('should validate time sequence and reject invalid times', async () => {
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T17:00:00Z',
        check_out_time: '2024-01-15T09:00:00Z', // Invalid: check-out before check-in
        status: 'draft',
        manually_edited: false
      }

      const result = await engine.calculateTimecard(timecardData)

      expect(result.is_valid).toBe(false)
      expect(result.validation_errors).toContain('Check-out time must be after check-in time')
    })

    it('should detect 20-hour shift limit violation', async () => {
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-16T06:00:00Z', // 21 hour shift
        status: 'draft',
        manually_edited: false
      }

      const result = await engine.calculateTimecard(timecardData)

      expect(result.is_valid).toBe(false)
      expect(result.validation_errors).toContain('Shift exceeds 20-hour limit - requires manual review')
    })

    it('should handle missing pay rate gracefully', async () => {
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        status: 'draft',
        manually_edited: false
      }

      // Mock no pay rate found
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await engine.calculateTimecard(timecardData)

      expect(result.is_valid).toBe(true)
      expect(result.total_hours).toBe(8)
      expect(result.total_pay).toBe(0) // No pay rate available
    })
  })

  describe('applyBreakGracePeriod', () => {
    it('should apply default duration when within grace period', () => {
      const breakStart = '2024-01-15T12:00:00Z'
      const breakEnd = '2024-01-15T12:32:00Z' // 32 minutes (within 5 min of 30 min default)
      const defaultDuration = 30

      const result = engine.applyBreakGracePeriod(breakStart, breakEnd, defaultDuration)

      expect(result).toBe(30) // Should use default duration
    })

    it('should use actual duration when outside grace period', () => {
      const breakStart = '2024-01-15T12:00:00Z'
      const breakEnd = '2024-01-15T12:45:00Z' // 45 minutes (outside grace period)
      const defaultDuration = 30

      const result = engine.applyBreakGracePeriod(breakStart, breakEnd, defaultDuration)

      expect(result).toBe(45) // Should use actual duration
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle missing check-in time', async () => {
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_out_time: '2024-01-15T17:00:00Z',
        status: 'draft',
        manually_edited: false
      }

      const result = await engine.calculateTimecard(timecardData)

      expect(result.is_valid).toBe(false)
      expect(result.validation_errors).toContain('Check-in time is required')
    })

    it('should round calculations to 2 decimal places', async () => {
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:20:00Z', // 8 hours 20 minutes = 8.333... hours
        status: 'draft',
        manually_edited: false
      }

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: {
          pay_rate: 25,
          project_role_templates: {
            time_type: 'hourly',
            base_pay_rate: 20
          }
        },
        error: null
      })

      const result = await engine.calculateTimecard(timecardData)

      expect(result.is_valid).toBe(true)
      expect(result.total_hours).toBe(8.33) // Rounded to 2 decimal places
      expect(result.total_pay).toBe(208.25) // 8.33 * 25, rounded
    })
  })

  describe('calculation methods', () => {
    it('should calculate overtime pay correctly', () => {
      // Test the private calculatePay method indirectly through calculateTimecard
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T19:00:00Z', // 10 hour shift
        status: 'draft',
        manually_edited: false
      }

      // Mock pay rate with overtime
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: {
          pay_rate: 25,
          overtime_rate: 37.5, // 1.5x rate
          project_role_templates: {
            time_type: 'hourly',
            base_pay_rate: 20
          }
        },
        error: null
      })

      return engine.calculateTimecard(timecardData).then(result => {
        expect(result.is_valid).toBe(true)
        expect(result.total_hours).toBe(10)
        expect(result.total_pay).toBe(275) // 8 hours * $25 + 2 hours * $37.5
      })
    })

    it('should handle daily rate calculation', () => {
      const timecardData: TimecardData = {
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        status: 'draft',
        manually_edited: false
      }

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: {
          daily_rate: 300,
          project_role_templates: {
            time_type: 'daily',
            base_pay_rate: 200
          }
        },
        error: null
      })

      return engine.calculateTimecard(timecardData).then(result => {
        expect(result.is_valid).toBe(true)
        expect(result.total_hours).toBe(8)
        expect(result.total_pay).toBe(300) // Daily rate regardless of hours
      })
    })
  })
})