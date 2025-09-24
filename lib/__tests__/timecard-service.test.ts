/**
 * Tests for Timecard Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TimecardService, type TimecardSubmissionResult } from '../timecard-service'

// Mock calculation engine
vi.mock('../timecard-calculation-engine', () => ({
  createTimecardCalculationEngine: vi.fn(() => ({
    calculateTimecard: vi.fn(),
    generateTimecard: vi.fn(),
    updateTimecardCalculations: vi.fn()
  }))
}))

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        gte: vi.fn(() => ({
          lte: vi.fn()
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
} as any

describe('TimecardService', () => {
  let service: TimecardService
  let mockCalculationEngine: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockCalculationEngine = {
      calculateTimecard: vi.fn(),
      generateTimecard: vi.fn(),
      updateTimecardCalculations: vi.fn()
    }

    const { createTimecardCalculationEngine } = require('../timecard-calculation-engine')
    createTimecardCalculationEngine.mockReturnValue(mockCalculationEngine)

    service = new TimecardService(mockSupabaseClient)
  })

  describe('submitTimecard', () => {
    it('should submit valid timecard successfully', async () => {
      const timecardId = 'timecard-1'
      const mockTimecard = {
        id: timecardId,
        user_id: 'user-1',
        project_id: 'project-1',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        status: 'draft'
      }

      // Mock timecard fetch
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockTimecard,
        error: null
      })

      // Mock calculation result
      mockCalculationEngine.calculateTimecard.mockResolvedValue({
        total_hours: 8,
        break_duration: 0,
        total_pay: 200,
        is_valid: true,
        validation_errors: [],
        manually_edited_flag: false
      })

      // Mock submission update
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: {
          ...mockTimecard,
          status: 'submitted',
          submitted_at: '2024-01-15T18:00:00Z',
          total_hours: 8,
          total_pay: 200
        },
        error: null
      })

      const result = await service.submitTimecard(timecardId)

      expect(result.success).toBe(true)
      expect(result.timecard?.status).toBe('submitted')
      expect(result.timecard?.total_hours).toBe(8)
      expect(mockCalculationEngine.calculateTimecard).toHaveBeenCalledWith(mockTimecard)
    })

    it('should reject submission for invalid timecard', async () => {
      const timecardId = 'timecard-1'
      const mockTimecard = {
        id: timecardId,
        check_in_time: '2024-01-15T17:00:00Z',
        check_out_time: '2024-01-15T09:00:00Z', // Invalid: check-out before check-in
        status: 'draft'
      }

      // Mock timecard fetch
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockTimecard,
        error: null
      })

      // Mock calculation failure
      mockCalculationEngine.calculateTimecard.mockResolvedValue({
        total_hours: 0,
        break_duration: 0,
        total_pay: 0,
        is_valid: false,
        validation_errors: ['Check-out time must be after check-in time'],
        manually_edited_flag: false
      })

      const result = await service.submitTimecard(timecardId)

      expect(result.success).toBe(false)
      expect(result.validationErrors).toContain('Check-out time must be after check-in time')
    })

    it('should detect missing breaks for long shifts', async () => {
      const timecardId = 'timecard-1'
      const mockTimecard = {
        id: timecardId,
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T18:00:00Z', // 9 hour shift
        break_start_time: null, // No break recorded
        break_end_time: null,
        status: 'draft'
      }

      // Mock timecard fetch
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockTimecard,
        error: null
      })

      // Mock valid calculation
      mockCalculationEngine.calculateTimecard.mockResolvedValue({
        total_hours: 9,
        break_duration: 0,
        total_pay: 225,
        is_valid: true,
        validation_errors: [],
        manually_edited_flag: false
      })

      const result = await service.submitTimecard(timecardId)

      expect(result.success).toBe(false)
      expect(result.missingBreaks).toContain('2024-01-15')
    })
  })

  describe('approveTimecard', () => {
    it('should approve timecard successfully', async () => {
      const timecardId = 'timecard-1'
      const approverId = 'approver-1'
      const comments = 'Approved - looks good'

      const approvedTimecard = {
        id: timecardId,
        status: 'approved',
        approved_at: '2024-01-15T18:00:00Z',
        approved_by: approverId,
        edit_comments: comments
      }

      mockSupabaseClient.from().update().eq().eq().select().single.mockResolvedValue({
        data: approvedTimecard,
        error: null
      })

      const result = await service.approveTimecard(timecardId, approverId, comments)

      expect(result.success).toBe(true)
      expect(result.timecard?.status).toBe('approved')
      expect(result.timecard?.approved_by).toBe(approverId)
    })

    it('should handle approval errors', async () => {
      const timecardId = 'timecard-1'
      const approverId = 'approver-1'

      mockSupabaseClient.from().update().eq().eq().select().single.mockResolvedValue({
        data: null,
        error: new Error('Timecard not found')
      })

      const result = await service.approveTimecard(timecardId, approverId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to approve timecard')
    })
  })

  describe('rejectTimecard', () => {
    it('should reject timecard with comments', async () => {
      const timecardId = 'timecard-1'
      const approverId = 'approver-1'
      const comments = 'Hours seem incorrect - please review'

      const rejectedTimecard = {
        id: timecardId,
        status: 'rejected',
        approved_by: approverId,
        edit_comments: comments
      }

      mockSupabaseClient.from().update().eq().eq().select().single.mockResolvedValue({
        data: rejectedTimecard,
        error: null
      })

      const result = await service.rejectTimecard(timecardId, approverId, comments)

      expect(result.success).toBe(true)
      expect(result.timecard?.status).toBe('rejected')
      expect(result.timecard?.edit_comments).toBe(comments)
    })

    it('should require comments for rejection', async () => {
      const timecardId = 'timecard-1'
      const approverId = 'approver-1'
      const emptyComments = ''

      const result = await service.rejectTimecard(timecardId, approverId, emptyComments)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Comments are required for timecard rejection')
    })
  })

  describe('bulkApproveTimecards', () => {
    it('should approve multiple timecards', async () => {
      const timecardIds = ['timecard-1', 'timecard-2', 'timecard-3']
      const approverId = 'approver-1'

      // Mock successful approvals for first two, failure for third
      mockSupabaseClient.from().update().eq().eq().select().single
        .mockResolvedValueOnce({ data: { id: 'timecard-1', status: 'approved' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'timecard-2', status: 'approved' }, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('Failed') })

      const result = await service.bulkApproveTimecards(timecardIds, approverId)

      expect(result.successful).toEqual(['timecard-1', 'timecard-2'])
      expect(result.failed).toEqual(['timecard-3'])
    })
  })

  describe('resolveMissingBreak', () => {
    it('should add break information', async () => {
      const timecardId = 'timecard-1'
      const breakData = {
        start_time: '2024-01-15T12:00:00Z',
        end_time: '2024-01-15T12:30:00Z'
      }

      mockSupabaseClient.from().update().eq.mockResolvedValue({ error: null })
      mockCalculationEngine.updateTimecardCalculations.mockResolvedValue(true)

      const result = await service.resolveMissingBreak(timecardId, 'add_break', breakData)

      expect(result).toBe(true)
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        break_start_time: breakData.start_time,
        break_end_time: breakData.end_time
      })
      expect(mockCalculationEngine.updateTimecardCalculations).toHaveBeenCalledWith(timecardId)
    })

    it('should mark no break taken', async () => {
      const timecardId = 'timecard-1'

      mockSupabaseClient.from().update().eq.mockResolvedValue({ error: null })
      mockCalculationEngine.updateTimecardCalculations.mockResolvedValue(true)

      const result = await service.resolveMissingBreak(timecardId, 'no_break')

      expect(result).toBe(true)
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        edit_comments: 'No break taken - confirmed by user'
      })
    })
  })

  describe('getTimecardStatistics', () => {
    it('should calculate project statistics', async () => {
      const projectId = 'project-1'
      const mockTimecards = [
        { status: 'submitted', total_hours: 8, total_pay: 200, manually_edited: false },
        { status: 'approved', total_hours: 7.5, total_pay: 187.5, manually_edited: true },
        { status: 'draft', total_hours: 6, total_pay: 150, manually_edited: false },
        { status: 'rejected', total_hours: 8, total_pay: 200, manually_edited: false }
      ]

      mockSupabaseClient.from().select().eq.mockResolvedValue({
        data: mockTimecards,
        error: null
      })

      const result = await service.getTimecardStatistics(projectId)

      expect(result).toBeTruthy()
      expect(result!.stats.total_timecards).toBe(4)
      expect(result!.stats.submitted).toBe(1)
      expect(result!.stats.approved).toBe(1)
      expect(result!.stats.draft).toBe(1)
      expect(result!.stats.rejected).toBe(1)
      expect(result!.stats.total_hours).toBe(29.5)
      expect(result!.stats.total_pay).toBe(737.5)
      expect(result!.stats.manually_edited).toBe(1)
    })

    it('should handle date range filtering', async () => {
      const projectId = 'project-1'
      const dateRange = { start: '2024-01-01', end: '2024-01-31' }

      mockSupabaseClient.from().select().eq().gte().lte.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await service.getTimecardStatistics(projectId, dateRange)

      expect(result).toBeTruthy()
      expect(mockSupabaseClient.from().select().eq().gte).toHaveBeenCalledWith('date', '2024-01-01')
    })
  })

  describe('generateTimecardFromTracking', () => {
    it('should delegate to calculation engine', async () => {
      const userId = 'user-1'
      const projectId = 'project-1'
      const date = '2024-01-15'
      const timeTrackingData = {
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z'
      }

      const mockTimecard = {
        id: 'timecard-1',
        ...timeTrackingData,
        total_hours: 8,
        total_pay: 200
      }

      mockCalculationEngine.generateTimecard.mockResolvedValue(mockTimecard)

      const result = await service.generateTimecardFromTracking(
        userId,
        projectId,
        date,
        timeTrackingData
      )

      expect(result).toEqual(mockTimecard)
      expect(mockCalculationEngine.generateTimecard).toHaveBeenCalledWith(
        userId,
        projectId,
        date,
        timeTrackingData
      )
    })
  })

  describe('recalculateTimecard', () => {
    it('should delegate to calculation engine', async () => {
      const timecardId = 'timecard-1'

      mockCalculationEngine.updateTimecardCalculations.mockResolvedValue(true)

      const result = await service.recalculateTimecard(timecardId)

      expect(result).toBe(true)
      expect(mockCalculationEngine.updateTimecardCalculations).toHaveBeenCalledWith(timecardId)
    })
  })
})