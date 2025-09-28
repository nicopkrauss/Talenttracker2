/**
 * Admin Edit Integration Tests
 * 
 * Integration tests to verify admin edit operations are properly integrated with audit logging
 * Requirements: 1.2, 1.4, 1.5, 6.1, 6.2, 9.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAuditLogService } from '@/lib/audit-log-service'

// Mock Supabase client for audit log service
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        order: vi.fn(() => ({ data: [], error: null })),
      })),
      in: vi.fn(() => ({
        order: vi.fn(() => ({ data: [], error: null })),
      })),
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({
          range: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null })),
          })),
          limit: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null })),
          })),
          order: vi.fn(() => ({ data: [], error: null })),
        })),
        range: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null })),
        })),
        limit: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null })),
        })),
        order: vi.fn(() => ({ data: [], error: null })),
      })),
      lte: vi.fn(() => ({
        range: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null })),
        })),
        limit: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null })),
        })),
        order: vi.fn(() => ({ data: [], error: null })),
      })),
      range: vi.fn(() => ({
        order: vi.fn(() => ({ data: [], error: null })),
      })),
      limit: vi.fn(() => ({
        order: vi.fn(() => ({ data: [], error: null })),
      })),
      order: vi.fn(() => ({ data: [], error: null })),
    })),
  })),
}

describe('Admin Edit Integration Tests', () => {
  let auditService: ReturnType<typeof createAuditLogService>

  beforeEach(() => {
    vi.clearAllMocks()
    auditService = createAuditLogService(mockSupabaseClient as any)
  })

  describe('Audit Log Service Integration', () => {
    it('should record admin edit changes with correct action type (requirement 1.2)', async () => {
      const timecardId = 'timecard-123'
      const adminUserId = 'admin-456'
      const changes = [
        {
          fieldName: 'total_hours',
          oldValue: 8.0,
          newValue: 7.5,
        },
        {
          fieldName: 'admin_notes',
          oldValue: null,
          newValue: 'Corrected hours based on security footage',
        },
      ]

      // Mock successful insert
      const mockInsert = vi.fn(() => ({ error: null }))
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      })

      await auditService.recordChanges(
        timecardId,
        changes,
        adminUserId,
        'admin_edit',
        new Date('2024-01-15')
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('timecard_audit_log')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            timecard_id: timecardId,
            field_name: 'total_hours',
            old_value: '8',
            new_value: '7.5',
            changed_by: adminUserId,
            action_type: 'admin_edit',
            work_date: '2024-01-15',
          }),
          expect.objectContaining({
            timecard_id: timecardId,
            field_name: 'admin_notes',
            old_value: null,
            new_value: 'Corrected hours based on security footage',
            changed_by: adminUserId,
            action_type: 'admin_edit',
            work_date: '2024-01-15',
          }),
        ])
      )
    })

    it('should generate unique change_id for grouping related changes (requirement 1.5)', async () => {
      const timecardId = 'timecard-123'
      const adminUserId = 'admin-456'
      const changes = [
        {
          fieldName: 'total_hours',
          oldValue: 8.0,
          newValue: 7.5,
        },
        {
          fieldName: 'break_duration',
          oldValue: 30,
          newValue: 45,
        },
      ]

      // Mock successful insert
      const mockInsert = vi.fn(() => ({ error: null }))
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      })

      await auditService.recordChanges(
        timecardId,
        changes,
        adminUserId,
        'admin_edit'
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            change_id: expect.any(String),
            field_name: 'total_hours',
            action_type: 'admin_edit',
          }),
          expect.objectContaining({
            change_id: expect.any(String),
            field_name: 'break_duration',
            action_type: 'admin_edit',
          }),
        ])
      )

      // Verify both entries have the same change_id
      const insertedData = mockInsert.mock.calls[0][0]
      expect(insertedData[0].change_id).toBe(insertedData[1].change_id)
    })

    it('should handle different action types correctly (requirement 1.1, 1.2, 1.3)', async () => {
      const timecardId = 'timecard-123'
      const userId = 'user-456'
      const changes = [
        {
          fieldName: 'total_hours',
          oldValue: 8.0,
          newValue: 7.5,
        },
      ]

      // Mock successful insert
      const mockInsert = vi.fn(() => ({ error: null }))
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      })

      // Test user_edit action type
      await auditService.recordChanges(
        timecardId,
        changes,
        userId,
        'user_edit'
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            action_type: 'user_edit',
          }),
        ])
      )

      // Test admin_edit action type
      await auditService.recordChanges(
        timecardId,
        changes,
        userId,
        'admin_edit'
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            action_type: 'admin_edit',
          }),
        ])
      )

      // Test rejection_edit action type
      await auditService.recordChanges(
        timecardId,
        changes,
        userId,
        'rejection_edit'
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            action_type: 'rejection_edit',
          }),
        ])
      )
    })

    it('should capture field changes before saving timecard data (requirement 1.4)', async () => {
      const oldTimecardData = {
        total_hours: 8.0,
        break_duration: 30,
        admin_notes: null,
        status: 'draft',
      }

      const newTimecardData = {
        total_hours: 7.5,
        break_duration: 45,
        admin_notes: 'Corrected based on review',
        status: 'draft',
      }

      const detectedChanges = auditService.detectChanges(oldTimecardData, newTimecardData)

      expect(detectedChanges).toHaveLength(3)
      expect(detectedChanges).toEqual(
        expect.arrayContaining([
          {
            fieldName: 'total_hours',
            oldValue: 8.0,
            newValue: 7.5,
          },
          {
            fieldName: 'break_duration',
            oldValue: 30,
            newValue: 45,
          },
          {
            fieldName: 'admin_notes',
            oldValue: null,
            newValue: 'Corrected based on review',
          },
        ])
      )
    })

    it('should handle audit logging failures gracefully (requirement 9.3)', async () => {
      const timecardId = 'timecard-123'
      const adminUserId = 'admin-456'
      const changes = [
        {
          fieldName: 'total_hours',
          oldValue: 8.0,
          newValue: 7.5,
        },
      ]

      // Mock database error
      const mockInsert = vi.fn(() => ({ 
        error: new Error('Database connection failed') 
      }))
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      })

      // Should throw AuditLogError but not crash the system
      await expect(
        auditService.recordChanges(
          timecardId,
          changes,
          adminUserId,
          'admin_edit'
        )
      ).rejects.toThrow('Failed to record audit log entries')
    })
  })

  describe('Field Tracking', () => {
    it('should track all admin-editable fields (requirement 1.4)', async () => {
      const oldData = {
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        break_start_time: '2024-01-15T12:00:00Z',
        break_end_time: '2024-01-15T12:30:00Z',
        total_hours: 8.0,
        break_duration: 30,
        admin_notes: null,
        edit_comments: null,
        status: 'draft',
      }

      const newData = {
        check_in_time: '2024-01-15T09:15:00Z', // Changed
        check_out_time: '2024-01-15T17:00:00Z', // Unchanged
        break_start_time: '2024-01-15T12:00:00Z', // Unchanged
        break_end_time: '2024-01-15T12:45:00Z', // Changed
        total_hours: 7.5, // Changed
        break_duration: 45, // Changed
        admin_notes: 'Corrected check-in time', // Changed
        edit_comments: 'Please verify the new times', // Changed
        status: 'draft', // Unchanged
      }

      const changes = auditService.detectChanges(oldData, newData)

      expect(changes).toHaveLength(6)
      expect(changes.map(c => c.fieldName)).toEqual(
        expect.arrayContaining([
          'check_in_time',
          'break_end_time',
          'total_hours',
          'break_duration',
          'admin_notes',
          'edit_comments',
        ])
      )
    })

    it('should properly serialize different field types', async () => {
      const changes = [
        {
          fieldName: 'total_hours',
          oldValue: 8.0,
          newValue: 7.5,
        },
        {
          fieldName: 'manually_edited',
          oldValue: false,
          newValue: true,
        },
        {
          fieldName: 'rejected_fields',
          oldValue: [],
          newValue: ['check_in_time', 'break_duration'],
        },
        {
          fieldName: 'admin_notes',
          oldValue: null,
          newValue: 'Correction needed',
        },
      ]

      // Mock successful insert
      const mockInsert = vi.fn(() => ({ error: null }))
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      })

      await auditService.recordChanges(
        'timecard-123',
        changes,
        'admin-456',
        'admin_edit'
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            field_name: 'total_hours',
            old_value: '8',
            new_value: '7.5',
          }),
          expect.objectContaining({
            field_name: 'manually_edited',
            old_value: 'false',
            new_value: 'true',
          }),
          expect.objectContaining({
            field_name: 'rejected_fields',
            old_value: '[]',
            new_value: '["check_in_time","break_duration"]',
          }),
          expect.objectContaining({
            field_name: 'admin_notes',
            old_value: null,
            new_value: 'Correction needed',
          }),
        ])
      )
    })
  })
})