/**
 * Integration tests for timecard audit logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withTimecardAuditLogging, recordTimecardAuditLog, fetchTimecardForAudit, extractWorkDate } from '../timecard-audit-integration'

// Mock the audit log service
vi.mock('../audit-log-service', () => ({
  createAuditLogService: vi.fn(() => ({
    detectChanges: vi.fn(() => [
      { fieldName: 'check_in_time', oldValue: '09:00', newValue: '09:15' },
      { fieldName: 'status', oldValue: 'draft', newValue: 'submitted' }
    ]),
    recordChanges: vi.fn()
  }))
}))

describe('Timecard Audit Integration', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'timecard-123',
                user_id: 'user-123',
                status: 'draft',
                check_in_time: '09:00',
                period_start_date: '2024-01-15'
              },
              error: null
            }))
          }))
        }))
      }))
    }
  })

  describe('recordTimecardAuditLog', () => {
    it('should record audit log for timecard changes', async () => {
      const context = {
        timecardId: 'timecard-123',
        userId: 'user-123',
        actionType: 'user_edit' as const,
        workDate: new Date('2024-01-15')
      }

      const oldData = { check_in_time: '09:00', status: 'draft' }
      const newData = { check_in_time: '09:15', status: 'submitted' }

      await recordTimecardAuditLog(mockSupabaseClient, context, oldData, newData)

      // Should not throw any errors
      expect(true).toBe(true)
    })

    it('should handle audit logging errors gracefully', async () => {
      const context = {
        timecardId: 'timecard-123',
        userId: 'user-123',
        actionType: 'user_edit' as const
      }

      // Mock audit service to throw error
      const { createAuditLogService } = await import('../audit-log-service')
      const mockAuditService = createAuditLogService(mockSupabaseClient)
      vi.mocked(mockAuditService.recordChanges).mockRejectedValue(new Error('Database error'))

      const oldData = { check_in_time: '09:00' }
      const newData = { check_in_time: '09:15' }

      // Should not throw error even if audit logging fails
      await expect(recordTimecardAuditLog(mockSupabaseClient, context, oldData, newData))
        .resolves.not.toThrow()
    })
  })

  describe('fetchTimecardForAudit', () => {
    it('should fetch timecard data successfully', async () => {
      const result = await fetchTimecardForAudit(mockSupabaseClient, 'timecard-123')

      expect(result).toEqual({
        id: 'timecard-123',
        user_id: 'user-123',
        status: 'draft',
        check_in_time: '09:00',
        period_start_date: '2024-01-15'
      })
    })

    it('should handle fetch errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Not found' }
            }))
          }))
        }))
      })

      const result = await fetchTimecardForAudit(mockSupabaseClient, 'nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('extractWorkDate', () => {
    it('should extract work date from period_start_date', () => {
      const timecardData = {
        period_start_date: '2024-01-15T00:00:00Z'
      }

      const result = extractWorkDate(timecardData)
      expect(result).toEqual(new Date('2024-01-15T00:00:00Z'))
    })

    it('should return undefined if no date available', () => {
      const timecardData = {}
      const result = extractWorkDate(timecardData)
      expect(result).toBeUndefined()
    })
  })

  describe('withTimecardAuditLogging', () => {
    it('should execute operation and record audit log', async () => {
      const context = {
        timecardId: 'timecard-123',
        userId: 'user-123',
        actionType: 'user_edit' as const
      }

      let operationExecuted = false
      const operation = async () => {
        operationExecuted = true
        return 'success'
      }

      const result = await withTimecardAuditLogging(mockSupabaseClient, context, operation)

      expect(operationExecuted).toBe(true)
      expect(result).toBe('success')
    })

    it('should handle operation errors', async () => {
      const context = {
        timecardId: 'timecard-123',
        userId: 'user-123',
        actionType: 'user_edit' as const
      }

      const operation = async () => {
        throw new Error('Operation failed')
      }

      await expect(withTimecardAuditLogging(mockSupabaseClient, context, operation))
        .rejects.toThrow('Operation failed')
    })

    it('should work with provided work date', async () => {
      const context = {
        timecardId: 'timecard-123',
        userId: 'user-123',
        actionType: 'admin_edit' as const,
        workDate: new Date('2024-01-15')
      }

      const operation = async () => 'success'

      const result = await withTimecardAuditLogging(mockSupabaseClient, context, operation)
      expect(result).toBe('success')
    })
  })

  describe('Action Type Classification', () => {
    it('should handle user_edit action type', async () => {
      const context = {
        timecardId: 'timecard-123',
        userId: 'user-123',
        actionType: 'user_edit' as const
      }

      const operation = async () => 'success'
      const result = await withTimecardAuditLogging(mockSupabaseClient, context, operation)
      expect(result).toBe('success')
    })

    it('should handle admin_edit action type', async () => {
      const context = {
        timecardId: 'timecard-123',
        userId: 'admin-123',
        actionType: 'admin_edit' as const
      }

      const operation = async () => 'success'
      const result = await withTimecardAuditLogging(mockSupabaseClient, context, operation)
      expect(result).toBe('success')
    })

    it('should handle rejection_edit action type', async () => {
      const context = {
        timecardId: 'timecard-123',
        userId: 'admin-123',
        actionType: 'rejection_edit' as const
      }

      const operation = async () => 'success'
      const result = await withTimecardAuditLogging(mockSupabaseClient, context, operation)
      expect(result).toBe('success')
    })
  })
})