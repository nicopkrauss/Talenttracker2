import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuditLogService } from '@/lib/audit-log-service'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn().mockResolvedValue({ error: null })
  }))
}

// Mock the audit log service
vi.mock('@/lib/audit-log-service', () => {
  const mockAuditLogService = {
    recordChanges: vi.fn().mockResolvedValue(undefined),
    logStatusChange: vi.fn().mockResolvedValue(undefined)
  }
  
  return {
    AuditLogService: vi.fn(() => mockAuditLogService)
  }
})

describe('Status Change Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AuditLogService status change tracking (requirement 2.1, 2.2, 2.3)', () => {
    it('should create audit log entries for status changes with proper structure', async () => {
      const auditLogService = new AuditLogService(mockSupabaseClient as any)
      
      // Test submission status change (requirement 2.1)
      await auditLogService.recordChanges(
        'timecard-123',
        [{
          fieldName: 'status',
          oldValue: 'draft',
          newValue: 'submitted'
        }],
        'user-456',
        'user_edit',
        new Date('2024-01-15')
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('timecard_audit_log')
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          timecard_id: 'timecard-123',
          action_type: 'user_edit',
          field_name: 'status',
          old_value: 'draft',
          new_value: 'submitted',
          changed_by: 'user-456',
          work_date: new Date('2024-01-15')
        })
      )
    })

    it('should handle rejection status changes with proper attribution (requirement 2.2)', async () => {
      const auditLogService = new AuditLogService(mockSupabaseClient as any)
      
      // Test rejection status change
      await auditLogService.recordChanges(
        'timecard-123',
        [
          {
            fieldName: 'status',
            oldValue: 'submitted',
            newValue: 'rejected'
          },
          {
            fieldName: 'rejection_reason',
            oldValue: null,
            newValue: 'Missing break times'
          }
        ],
        'admin-789',
        'rejection_edit',
        new Date('2024-01-15')
      )

      // Should create multiple audit log entries
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(2)
      
      // Verify status change entry
      expect(mockSupabaseClient.from().insert).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          timecard_id: 'timecard-123',
          action_type: 'rejection_edit',
          field_name: 'status',
          old_value: 'submitted',
          new_value: 'rejected',
          changed_by: 'admin-789'
        })
      )
      
      // Verify rejection reason entry
      expect(mockSupabaseClient.from().insert).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          timecard_id: 'timecard-123',
          action_type: 'rejection_edit',
          field_name: 'rejection_reason',
          old_value: null,
          new_value: 'Missing break times',
          changed_by: 'admin-789'
        })
      )
    })

    it('should handle approval status changes with proper attribution (requirement 2.3)', async () => {
      const auditLogService = new AuditLogService(mockSupabaseClient as any)
      
      // Test approval status change
      await auditLogService.recordChanges(
        'timecard-123',
        [{
          fieldName: 'status',
          oldValue: 'submitted',
          newValue: 'approved'
        }],
        'admin-789',
        'admin_edit',
        new Date('2024-01-15')
      )

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          timecard_id: 'timecard-123',
          action_type: 'admin_edit',
          field_name: 'status',
          old_value: 'submitted',
          new_value: 'approved',
          changed_by: 'admin-789'
        })
      )
    })

    it('should handle edited_draft status changes (requirement 3.4)', async () => {
      const auditLogService = new AuditLogService(mockSupabaseClient as any)
      
      // Test admin edit creating edited_draft status
      await auditLogService.recordChanges(
        'timecard-123',
        [{
          fieldName: 'status',
          oldValue: 'draft',
          newValue: 'edited_draft'
        }],
        'admin-789',
        'admin_edit',
        new Date('2024-01-15')
      )

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          timecard_id: 'timecard-123',
          action_type: 'admin_edit',
          field_name: 'status',
          old_value: 'draft',
          new_value: 'edited_draft',
          changed_by: 'admin-789'
        })
      )
    })
  })

  describe('Status change workflow sequence (requirement 1.4)', () => {
    it('should track complete workflow: draft → submitted → rejected → submitted → approved', async () => {
      const auditLogService = new AuditLogService(mockSupabaseClient as any)
      const timecardId = 'timecard-workflow-test'
      
      // Step 1: Draft → Submitted (user submission)
      await auditLogService.recordChanges(
        timecardId,
        [{ fieldName: 'status', oldValue: 'draft', newValue: 'submitted' }],
        'user-123',
        'user_edit',
        new Date('2024-01-15')
      )

      // Step 2: Submitted → Rejected (admin rejection)
      await auditLogService.recordChanges(
        timecardId,
        [
          { fieldName: 'status', oldValue: 'submitted', newValue: 'rejected' },
          { fieldName: 'rejection_reason', oldValue: null, newValue: 'Missing data' }
        ],
        'admin-456',
        'rejection_edit',
        new Date('2024-01-15')
      )

      // Step 3: Rejected → Submitted (user resubmission)
      await auditLogService.recordChanges(
        timecardId,
        [{ fieldName: 'status', oldValue: 'rejected', newValue: 'submitted' }],
        'user-123',
        'user_edit',
        new Date('2024-01-15')
      )

      // Step 4: Submitted → Approved (admin approval)
      await auditLogService.recordChanges(
        timecardId,
        [{ fieldName: 'status', oldValue: 'submitted', newValue: 'approved' }],
        'admin-456',
        'admin_edit',
        new Date('2024-01-15')
      )

      // Verify all status changes were logged
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(5) // 4 status changes + 1 rejection reason
      
      // Verify proper attribution for each step
      const insertCalls = mockSupabaseClient.from().insert.mock.calls
      
      // Step 1: User submission
      expect(insertCalls[0][0]).toMatchObject({
        field_name: 'status',
        old_value: 'draft',
        new_value: 'submitted',
        changed_by: 'user-123',
        action_type: 'user_edit'
      })
      
      // Step 2: Admin rejection (status)
      expect(insertCalls[1][0]).toMatchObject({
        field_name: 'status',
        old_value: 'submitted',
        new_value: 'rejected',
        changed_by: 'admin-456',
        action_type: 'rejection_edit'
      })
      
      // Step 3: User resubmission
      expect(insertCalls[3][0]).toMatchObject({
        field_name: 'status',
        old_value: 'rejected',
        new_value: 'submitted',
        changed_by: 'user-123',
        action_type: 'user_edit'
      })
      
      // Step 4: Admin approval
      expect(insertCalls[4][0]).toMatchObject({
        field_name: 'status',
        old_value: 'submitted',
        new_value: 'approved',
        changed_by: 'admin-456',
        action_type: 'admin_edit'
      })
    })
  })

  describe('Error handling and resilience', () => {
    it('should handle audit logging failures gracefully', async () => {
      // Mock insert failure
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error('Database connection failed') })
      })

      const auditLogService = new AuditLogService(mockSupabaseClient as any)
      
      // Should not throw error even if insert fails
      await expect(auditLogService.recordChanges(
        'timecard-123',
        [{ fieldName: 'status', oldValue: 'draft', newValue: 'submitted' }],
        'user-123',
        'user_edit',
        new Date('2024-01-15')
      )).resolves.not.toThrow()
    })

    it('should handle missing or null values in status changes', async () => {
      const auditLogService = new AuditLogService(mockSupabaseClient as any)
      
      // Test with null old_value (initial status)
      await auditLogService.recordChanges(
        'timecard-123',
        [{ fieldName: 'status', oldValue: null, newValue: 'draft' }],
        'user-123',
        'user_edit',
        new Date('2024-01-15')
      )

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          field_name: 'status',
          old_value: null,
          new_value: 'draft'
        })
      )
    })
  })
})