/**
 * Integration tests for Audit Log Service
 * 
 * Tests the service with more realistic Supabase client interactions
 * and verifies the complete audit logging workflow.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAuditLogService, type FieldChange } from '../audit-log-service'

// More realistic Supabase client mock
const createMockSupabaseClient = () => {
  const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
  const mockSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      in: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            range: vi.fn(() => ({
              limit: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ 
                  data: [], 
                  error: null 
                }))
              }))
            }))
          }))
        }))
      })),
      order: vi.fn(() => Promise.resolve({ 
        data: [], 
        error: null 
      }))
    }))
  }))

  const mockClient = {
    from: vi.fn((table: string) => {
      if (table === 'timecard_audit_log') {
        return {
          insert: mockInsert,
          select: mockSelect
        }
      }
      return {}
    }),
    // Expose mocks for testing
    _mocks: {
      insert: mockInsert,
      select: mockSelect
    }
  }
  return mockClient
}

describe('Audit Log Service Integration', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>
  let auditLogService: ReturnType<typeof createAuditLogService>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockSupabaseClient()
    auditLogService = createAuditLogService(mockClient as any)
  })

  describe('Complete audit workflow', () => {
    it('should handle a complete timecard edit workflow', async () => {
      // Simulate timecard data before and after edit
      const oldTimecardData = {
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        break_start_time: null,
        break_end_time: null,
        total_hours: 8,
        status: 'draft',
        manually_edited: false
      }

      const newTimecardData = {
        check_in_time: '2024-01-15T09:30:00Z',
        check_out_time: '2024-01-15T17:30:00Z',
        break_start_time: '2024-01-15T12:00:00Z',
        break_end_time: '2024-01-15T12:30:00Z',
        total_hours: 7.5,
        status: 'submitted',
        manually_edited: true
      }

      // Detect changes
      const changes = auditLogService.detectChanges(oldTimecardData, newTimecardData)
      
      expect(changes).toHaveLength(7) // All fields changed

      // Record the changes
      await auditLogService.recordChanges(
        'timecard-123',
        changes,
        'user-456',
        'user_edit',
        new Date('2024-01-15')
      )

      // Verify the insert was called with correct data
      const insertCall = (mockClient as any)._mocks.insert
      expect(insertCall).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            timecard_id: 'timecard-123',
            field_name: 'check_in_time',
            old_value: '2024-01-15T09:00:00Z',
            new_value: '2024-01-15T09:30:00Z',
            changed_by: 'user-456',
            action_type: 'user_edit',
            work_date: '2024-01-15'
          }),
          expect.objectContaining({
            field_name: 'status',
            old_value: 'draft',
            new_value: 'submitted'
          })
        ])
      )
    })

    it('should handle admin rejection workflow', async () => {
      const rejectionChanges: FieldChange[] = [
        { fieldName: 'status', oldValue: 'submitted', newValue: 'rejected' },
        { fieldName: 'rejected_fields', oldValue: [], newValue: ['check_in_time', 'total_hours'] },
        { fieldName: 'edit_comments', oldValue: null, newValue: 'Please correct check-in time' }
      ]

      await auditLogService.recordChanges(
        'timecard-789',
        rejectionChanges,
        'admin-123',
        'rejection_edit'
      )

      const insertCall = (mockClient as any)._mocks.insert
      expect(insertCall).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            timecard_id: 'timecard-789',
            action_type: 'rejection_edit',
            changed_by: 'admin-123'
          })
        ])
      )

      // Verify all entries have the same change_id
      const insertedData = insertCall.mock.calls[0][0]
      const changeIds = insertedData.map((entry: any) => entry.change_id)
      expect(new Set(changeIds)).toHaveProperty('size', 1)
    })

    it('should retrieve and group audit logs correctly', async () => {
      // Mock audit log data
      const mockAuditData = [
        {
          id: 'audit-1',
          timecard_id: 'timecard-123',
          change_id: 'change-1',
          field_name: 'check_in_time',
          old_value: '09:00',
          new_value: '09:30',
          changed_by: 'user-456',
          changed_at: '2024-01-15T10:00:00Z',
          action_type: 'user_edit',
          work_date: '2024-01-15',
          changed_by_profile: { full_name: 'John Doe' }
        },
        {
          id: 'audit-2',
          timecard_id: 'timecard-123',
          change_id: 'change-1',
          field_name: 'status',
          old_value: 'draft',
          new_value: 'submitted',
          changed_by: 'user-456',
          changed_at: '2024-01-15T10:00:00Z',
          action_type: 'user_edit',
          work_date: '2024-01-15',
          changed_by_profile: { full_name: 'John Doe' }
        }
      ]

      // Mock the select chain to return our test data
      const mockSelectChain = {
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: mockAuditData, 
            error: null 
          }))
        }))
      }
      
      const mockSelect = vi.fn(() => mockSelectChain)
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      mockClient.from = mockFrom

      // Test individual audit logs
      const auditLogs = await auditLogService.getAuditLogs('timecard-123')
      expect(auditLogs).toHaveLength(2)
      expect(auditLogs[0].changed_at).toBeInstanceOf(Date)

      // Test grouped audit logs
      const groupedLogs = await auditLogService.getGroupedAuditLogs('timecard-123')
      expect(groupedLogs).toHaveLength(1)
      expect(groupedLogs[0].changes).toHaveLength(2)
      expect(groupedLogs[0].change_id).toBe('change-1')
    })

    it('should calculate audit statistics correctly', async () => {
      const mockStatsData = [
        {
          action_type: 'user_edit',
          changed_at: '2024-01-15T12:00:00Z',
          changed_by: 'user-1',
          changed_by_profile: { full_name: 'John Doe' }
        },
        {
          action_type: 'admin_edit',
          changed_at: '2024-01-15T11:00:00Z',
          changed_by: 'admin-1',
          changed_by_profile: { full_name: 'Admin User' }
        }
      ]

      const mockSelectChain = {
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: mockStatsData, 
            error: null 
          }))
        }))
      }
      
      const mockSelect = vi.fn(() => mockSelectChain)
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      mockClient.from = mockFrom

      const stats = await auditLogService.getAuditLogStatistics('timecard-123')

      expect(stats).toEqual({
        totalChanges: 2,
        userEdits: 1,
        adminEdits: 1,
        rejectionEdits: 0,
        lastModified: new Date('2024-01-15T12:00:00Z'),
        lastModifiedBy: 'John Doe'
      })
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockFrom = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ 
          error: { message: 'Connection timeout' } 
        }))
      }))
      mockClient.from = mockFrom

      const changes: FieldChange[] = [
        { fieldName: 'status', oldValue: 'draft', newValue: 'submitted' }
      ]

      await expect(
        auditLogService.recordChanges('timecard-123', changes, 'user-456', 'user_edit')
      ).rejects.toThrow('Failed to record audit log entries')
    })

    it('should handle empty timecard data gracefully', () => {
      const changes = auditLogService.detectChanges({}, {})
      expect(changes).toHaveLength(0)
    })

    it('should handle partial timecard data', () => {
      const oldData = { check_in_time: '09:00' }
      const newData = { check_in_time: '09:30', status: 'submitted' }
      
      const changes = auditLogService.detectChanges(oldData, newData)
      
      // Should detect both the change and the new field
      expect(changes).toEqual(
        expect.arrayContaining([
          { fieldName: 'check_in_time', oldValue: '09:00', newValue: '09:30' },
          { fieldName: 'status', oldValue: undefined, newValue: 'submitted' }
        ])
      )
    })

    it('should handle complex nested data structures', () => {
      const oldData = {
        rejected_fields: ['field1'],
        admin_notes: { note: 'old note', timestamp: '2024-01-15' }
      }
      
      const newData = {
        rejected_fields: ['field1', 'field2'],
        admin_notes: { note: 'new note', timestamp: '2024-01-16' }
      }

      const changes = auditLogService.detectChanges(oldData, newData)
      
      expect(changes).toHaveLength(2)
      expect(changes.find(c => c.fieldName === 'rejected_fields')).toBeDefined()
      expect(changes.find(c => c.fieldName === 'admin_notes')).toBeDefined()
    })
  })

  describe('Performance considerations', () => {
    it('should handle large numbers of changes efficiently', async () => {
      // Create a large number of field changes
      const changes: FieldChange[] = []
      for (let i = 0; i < 100; i++) {
        changes.push({
          fieldName: 'check_in_time',
          oldValue: `09:${i.toString().padStart(2, '0')}`,
          newValue: `09:${(i + 1).toString().padStart(2, '0')}`
        })
      }

      const startTime = Date.now()
      await auditLogService.recordChanges(
        'timecard-123',
        changes,
        'user-456',
        'user_edit'
      )
      const endTime = Date.now()

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000)

      // Should make only one database call
      expect(mockClient.from).toHaveBeenCalledTimes(1)
    })

    it('should detect changes efficiently for large objects', () => {
      const largeObject: Record<string, any> = {}
      const largeObjectModified: Record<string, any> = {}

      // Create objects with many fields
      for (let i = 0; i < 1000; i++) {
        largeObject[`field_${i}`] = `value_${i}`
        largeObjectModified[`field_${i}`] = i === 500 ? `modified_value_${i}` : `value_${i}`
      }

      // Add some trackable fields
      largeObject.check_in_time = '09:00'
      largeObjectModified.check_in_time = '09:30'

      const startTime = Date.now()
      const changes = auditLogService.detectChanges(largeObject, largeObjectModified)
      const endTime = Date.now()

      // Should only detect changes in trackable fields
      expect(changes).toHaveLength(1)
      expect(changes[0].fieldName).toBe('check_in_time')

      // Should complete quickly even with large objects
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})