/**
 * Unit tests for Audit Log Service
 * 
 * Tests all core functionality including change detection, recording, retrieval,
 * and value formatting utilities.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { 
  AuditLogService, 
  createAuditLogService,
  ValueFormatter,
  AuditLogError,
  TRACKABLE_FIELDS,
  type FieldChange,
  type AuditLogEntry,
  type GroupedAuditEntry,
  type AuditLogFilter
} from '../audit-log-service'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              range: vi.fn(() => ({
                limit: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }))
            }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }))
}

describe('AuditLogService', () => {
  let auditLogService: AuditLogService
  let mockFrom: Mock
  let mockInsert: Mock
  let mockSelect: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    auditLogService = new AuditLogService(mockSupabaseClient as any)
    
    // Setup mock chain
    mockInsert = vi.fn(() => Promise.resolve({ error: null }))
    mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              range: vi.fn(() => ({
                limit: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }))
            }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
    
    mockFrom = vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect
    }))
    
    mockSupabaseClient.from = mockFrom
  })

  describe('recordChanges', () => {
    it('should record changes successfully', async () => {
      const changes: FieldChange[] = [
        { fieldName: 'check_in_time', oldValue: '09:00', newValue: '09:30' },
        { fieldName: 'status', oldValue: 'draft', newValue: 'submitted' }
      ]

      await auditLogService.recordChanges(
        'timecard-123',
        changes,
        'user-456',
        'user_edit',
        new Date('2024-01-15')
      )

      expect(mockFrom).toHaveBeenCalledWith('timecard_audit_log')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            timecard_id: 'timecard-123',
            field_name: 'check_in_time',
            old_value: '09:00',
            new_value: '09:30',
            changed_by: 'user-456',
            action_type: 'user_edit',
            work_date: '2024-01-15'
          }),
          expect.objectContaining({
            timecard_id: 'timecard-123',
            field_name: 'status',
            old_value: 'draft',
            new_value: 'submitted',
            changed_by: 'user-456',
            action_type: 'user_edit',
            work_date: '2024-01-15'
          })
        ])
      )
    })

    it('should handle empty changes array', async () => {
      await auditLogService.recordChanges(
        'timecard-123',
        [],
        'user-456',
        'user_edit'
      )

      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('should generate unique change_id for related changes', async () => {
      const changes: FieldChange[] = [
        { fieldName: 'check_in_time', oldValue: '09:00', newValue: '09:30' },
        { fieldName: 'check_out_time', oldValue: '17:00', newValue: '17:30' }
      ]

      await auditLogService.recordChanges(
        'timecard-123',
        changes,
        'user-456',
        'admin_edit'
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            change_id: expect.any(String)
          }),
          expect.objectContaining({
            change_id: expect.any(String)
          })
        ])
      )

      // Verify both entries have the same change_id
      const insertedData = mockInsert.mock.calls[0][0]
      expect(insertedData[0].change_id).toBe(insertedData[1].change_id)
    })

    it('should handle database errors', async () => {
      mockInsert.mockResolvedValueOnce({ error: { message: 'Database error' } })

      const changes: FieldChange[] = [
        { fieldName: 'status', oldValue: 'draft', newValue: 'submitted' }
      ]

      await expect(
        auditLogService.recordChanges('timecard-123', changes, 'user-456', 'user_edit')
      ).rejects.toThrow(AuditLogError)
    })

    it('should serialize complex values correctly', async () => {
      const changes: FieldChange[] = [
        { fieldName: 'rejected_fields', oldValue: null, newValue: ['field1', 'field2'] },
        { fieldName: 'manually_edited', oldValue: false, newValue: true },
        { fieldName: 'total_hours', oldValue: 8, newValue: 8.5 }
      ]

      await auditLogService.recordChanges(
        'timecard-123',
        changes,
        'user-456',
        'rejection_edit'
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            field_name: 'rejected_fields',
            old_value: null,
            new_value: '["field1","field2"]'
          }),
          expect.objectContaining({
            field_name: 'manually_edited',
            old_value: 'false',
            new_value: 'true'
          }),
          expect.objectContaining({
            field_name: 'total_hours',
            old_value: '8',
            new_value: '8.5'
          })
        ])
      )
    })
  })

  describe('getAuditLogs', () => {
    it('should retrieve audit logs successfully', async () => {
      const mockData = [
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
        }
      ]

      const mockQuery = {
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      }
      mockSelect.mockReturnValueOnce(mockQuery)

      const result = await auditLogService.getAuditLogs('timecard-123')

      expect(mockFrom).toHaveBeenCalledWith('timecard_audit_log')
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('changed_by_profile:profiles'))
      expect(mockQuery.eq).toHaveBeenCalledWith('timecard_id', 'timecard-123')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'audit-1',
        field_name: 'check_in_time',
        changed_at: new Date('2024-01-15T10:00:00Z'),
        work_date: new Date('2024-01-15')
      })
    })

    it('should apply filters correctly', async () => {
      const filter: AuditLogFilter = {
        action_type: ['user_edit', 'admin_edit'],
        field_name: ['check_in_time', 'status'],
        date_from: new Date('2024-01-01'),
        date_to: new Date('2024-01-31'),
        limit: 10,
        offset: 5
      }

      const mockChain = {
        eq: vi.fn(() => mockChain),
        in: vi.fn(() => mockChain),
        gte: vi.fn(() => mockChain),
        lte: vi.fn(() => mockChain),
        range: vi.fn(() => mockChain),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }
      mockSelect.mockReturnValueOnce(mockChain)

      await auditLogService.getAuditLogs('timecard-123', filter)

      expect(mockChain.in).toHaveBeenCalledWith('action_type', ['user_edit', 'admin_edit'])
      expect(mockChain.in).toHaveBeenCalledWith('field_name', ['check_in_time', 'status'])
      expect(mockChain.gte).toHaveBeenCalledWith('changed_at', '2024-01-01T00:00:00.000Z')
      expect(mockChain.lte).toHaveBeenCalledWith('changed_at', '2024-01-31T00:00:00.000Z')
      expect(mockChain.range).toHaveBeenCalledWith(5, 14)
    })

    it('should handle database errors', async () => {
      const mockQuery = {
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
        }))
      }
      mockSelect.mockReturnValueOnce(mockQuery)

      await expect(
        auditLogService.getAuditLogs('timecard-123')
      ).rejects.toThrow(AuditLogError)
    })
  })

  describe('getGroupedAuditLogs', () => {
    it('should group audit logs by change_id', async () => {
      const mockData = [
        {
          id: 'audit-1',
          change_id: 'change-1',
          field_name: 'check_in_time',
          changed_at: '2024-01-15T10:00:00Z',
          changed_by: 'user-456',
          action_type: 'user_edit',
          changed_by_profile: { full_name: 'John Doe' }
        },
        {
          id: 'audit-2',
          change_id: 'change-1',
          field_name: 'check_out_time',
          changed_at: '2024-01-15T10:00:00Z',
          changed_by: 'user-456',
          action_type: 'user_edit',
          changed_by_profile: { full_name: 'John Doe' }
        },
        {
          id: 'audit-3',
          change_id: 'change-2',
          field_name: 'status',
          changed_at: '2024-01-15T11:00:00Z',
          changed_by: 'admin-789',
          action_type: 'admin_edit',
          changed_by_profile: { full_name: 'Admin User' }
        }
      ]

      // Mock the getAuditLogs method
      vi.spyOn(auditLogService, 'getAuditLogs').mockResolvedValueOnce(
        mockData.map(entry => ({
          ...entry,
          timecard_id: 'timecard-123',
          old_value: null,
          new_value: 'test',
          work_date: null,
          changed_at: new Date(entry.changed_at)
        }))
      )

      const result = await auditLogService.getGroupedAuditLogs('timecard-123')

      expect(result).toHaveLength(2)
      
      // First group (change-2, more recent)
      expect(result[0]).toMatchObject({
        change_id: 'change-2',
        changed_by: 'admin-789',
        action_type: 'admin_edit',
        changes: expect.arrayContaining([
          expect.objectContaining({ field_name: 'status' })
        ])
      })

      // Second group (change-1, older)
      expect(result[1]).toMatchObject({
        change_id: 'change-1',
        changed_by: 'user-456',
        action_type: 'user_edit',
        changes: expect.arrayContaining([
          expect.objectContaining({ field_name: 'check_in_time' }),
          expect.objectContaining({ field_name: 'check_out_time' })
        ])
      })
    })
  })

  describe('detectChanges', () => {
    it('should detect field changes correctly', () => {
      const oldData = {
        check_in_time: '09:00',
        check_out_time: '17:00',
        status: 'draft',
        total_hours: 8,
        manually_edited: false
      }

      const newData = {
        check_in_time: '09:30',
        check_out_time: '17:00', // unchanged
        status: 'submitted',
        total_hours: 8.5,
        manually_edited: true
      }

      const changes = auditLogService.detectChanges(oldData, newData)

      expect(changes).toHaveLength(4)
      expect(changes).toEqual(
        expect.arrayContaining([
          { fieldName: 'check_in_time', oldValue: '09:00', newValue: '09:30' },
          { fieldName: 'status', oldValue: 'draft', newValue: 'submitted' },
          { fieldName: 'total_hours', oldValue: 8, newValue: 8.5 },
          { fieldName: 'manually_edited', oldValue: false, newValue: true }
        ])
      )
    })

    it('should handle null and undefined values correctly', () => {
      const oldData = {
        break_start_time: null,
        admin_notes: undefined,
        rejected_fields: []
      }

      const newData = {
        break_start_time: '12:00',
        admin_notes: null,
        rejected_fields: ['field1']
      }

      const changes = auditLogService.detectChanges(oldData, newData)

      expect(changes).toEqual(
        expect.arrayContaining([
          { fieldName: 'break_start_time', oldValue: null, newValue: '12:00' },
          { fieldName: 'rejected_fields', oldValue: [], newValue: ['field1'] }
        ])
      )
      
      // admin_notes should not be detected as changed (null === undefined for our purposes)
      expect(changes.find(c => c.fieldName === 'admin_notes')).toBeUndefined()
    })

    it('should handle array comparisons correctly', () => {
      const oldData = {
        rejected_fields: ['field1', 'field2']
      }

      const newData = {
        rejected_fields: ['field1', 'field3']
      }

      const changes = auditLogService.detectChanges(oldData, newData)

      expect(changes).toEqual([
        { fieldName: 'rejected_fields', oldValue: ['field1', 'field2'], newValue: ['field1', 'field3'] }
      ])
    })

    it('should only track fields defined in TRACKABLE_FIELDS', () => {
      const oldData = {
        check_in_time: '09:00',
        non_trackable_field: 'old_value',
        id: 'timecard-123'
      }

      const newData = {
        check_in_time: '09:30',
        non_trackable_field: 'new_value',
        id: 'timecard-456'
      }

      const changes = auditLogService.detectChanges(oldData, newData)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        fieldName: 'check_in_time',
        oldValue: '09:00',
        newValue: '09:30'
      })
    })
  })

  describe('getAuditLogStatistics', () => {
    it('should calculate statistics correctly', async () => {
      const mockData = [
        {
          action_type: 'user_edit',
          changed_at: '2024-01-15T12:00:00Z',
          changed_by: 'user-1',
          changed_by_profile: { full_name: 'John Doe' }
        },
        {
          action_type: 'user_edit',
          changed_at: '2024-01-15T11:00:00Z',
          changed_by: 'user-1',
          changed_by_profile: { full_name: 'John Doe' }
        },
        {
          action_type: 'admin_edit',
          changed_at: '2024-01-15T10:00:00Z',
          changed_by: 'admin-1',
          changed_by_profile: { full_name: 'Admin User' }
        },
        {
          action_type: 'rejection_edit',
          changed_at: '2024-01-15T09:00:00Z',
          changed_by: 'admin-1',
          changed_by_profile: { full_name: 'Admin User' }
        }
      ]

      const mockQuery = {
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      }
      mockSelect.mockReturnValueOnce(mockQuery)

      const stats = await auditLogService.getAuditLogStatistics('timecard-123')

      expect(stats).toEqual({
        totalChanges: 4,
        userEdits: 2,
        adminEdits: 1,
        rejectionEdits: 1,
        lastModified: new Date('2024-01-15T12:00:00Z'),
        lastModifiedBy: 'John Doe'
      })
    })

    it('should handle empty audit log', async () => {
      const mockQuery = {
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }
      mockSelect.mockReturnValueOnce(mockQuery)

      const stats = await auditLogService.getAuditLogStatistics('timecard-123')

      expect(stats).toEqual({
        totalChanges: 0,
        userEdits: 0,
        adminEdits: 0,
        rejectionEdits: 0,
        lastModified: undefined,
        lastModifiedBy: undefined
      })
    })
  })
})

describe('ValueFormatter', () => {
  describe('formatValue', () => {
    it('should format time values correctly', () => {
      const timeValue = '2024-01-15T09:30:00Z'
      const formatted = ValueFormatter.formatOldValue('check_in_time', timeValue)
      
      // Should contain date and time, but timezone may vary
      expect(formatted).toMatch(/Jan 15.*\d{1,2}:\d{2}.*[AP]M/)
    })

    it('should format duration values correctly', () => {
      expect(ValueFormatter.formatOldValue('break_duration', 30)).toBe('30 minutes')
      expect(ValueFormatter.formatOldValue('break_duration', 60)).toBe('1 hour')
      expect(ValueFormatter.formatOldValue('break_duration', 90)).toBe('1h 30m')
    })

    it('should format hours values correctly', () => {
      expect(ValueFormatter.formatOldValue('total_hours', 1)).toBe('1 hour')
      expect(ValueFormatter.formatOldValue('total_hours', 8.5)).toBe('8.5 hours')
    })

    it('should format status values correctly', () => {
      expect(ValueFormatter.formatOldValue('status', 'draft')).toBe('Draft')
      expect(ValueFormatter.formatOldValue('status', 'submitted')).toBe('Submitted')
      expect(ValueFormatter.formatOldValue('status', 'approved')).toBe('Approved')
      expect(ValueFormatter.formatOldValue('status', 'rejected')).toBe('Rejected')
    })

    it('should format boolean values correctly', () => {
      expect(ValueFormatter.formatOldValue('manually_edited', true)).toBe('Yes')
      expect(ValueFormatter.formatOldValue('manually_edited', false)).toBe('No')
    })

    it('should format array values correctly', () => {
      expect(ValueFormatter.formatOldValue('rejected_fields', ['field1', 'field2'])).toBe('field1, field2')
      expect(ValueFormatter.formatOldValue('rejected_fields', [])).toBe('(none)')
    })

    it('should format null/undefined values correctly', () => {
      expect(ValueFormatter.formatOldValue('check_in_time', null)).toBe('(empty)')
      expect(ValueFormatter.formatOldValue('check_in_time', undefined)).toBe('(empty)')
    })
  })

  describe('formatTimestamp', () => {
    it('should format timestamps correctly', () => {
      const date = new Date('2024-01-15T14:30:00Z')
      const formatted = ValueFormatter.formatTimestamp(date)
      
      // Should contain date and time, but timezone may vary
      expect(formatted).toMatch(/Jan 15, 2024.*\d{1,2}:\d{2}.*[AP]M/)
    })
  })

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      expect(ValueFormatter.formatDuration(15)).toBe('15 minutes')
      expect(ValueFormatter.formatDuration(60)).toBe('1 hour')
      expect(ValueFormatter.formatDuration(90)).toBe('1h 30m')
      expect(ValueFormatter.formatDuration(120)).toBe('2 hours')
      expect(ValueFormatter.formatDuration(150)).toBe('2h 30m')
    })
  })

  describe('formatFieldName', () => {
    it('should format field names correctly', () => {
      expect(ValueFormatter.formatFieldName('check_in_time')).toBe('Check In Time')
      expect(ValueFormatter.formatFieldName('total_hours')).toBe('Total Hours')
      expect(ValueFormatter.formatFieldName('unknown_field')).toBe('unknown_field')
    })
  })
})

describe('createAuditLogService', () => {
  it('should create audit log service instance', () => {
    const service = createAuditLogService(mockSupabaseClient as any)
    expect(service).toBeInstanceOf(AuditLogService)
  })
})

describe('AuditLogError', () => {
  it('should create error with timecard ID and original error', () => {
    const originalError = new Error('Original error')
    const auditError = new AuditLogError('Audit error', 'timecard-123', originalError)
    
    expect(auditError.message).toBe('Audit error')
    expect(auditError.timecardId).toBe('timecard-123')
    expect(auditError.originalError).toBe(originalError)
    expect(auditError.name).toBe('AuditLogError')
  })
})

describe('TRACKABLE_FIELDS', () => {
  it('should contain all expected trackable fields', () => {
    const expectedFields = [
      'check_in_time',
      'check_out_time',
      'break_start_time',
      'break_end_time',
      'total_hours',
      'break_duration',
      'overtime_hours',
      'status',
      'manually_edited',
      'admin_notes',
      'edit_comments',
      'rejected_fields',
      'daily_check_in',
      'daily_check_out',
      'daily_break_start',
      'daily_break_end',
      'daily_total_hours'
    ]

    for (const field of expectedFields) {
      expect(TRACKABLE_FIELDS).toHaveProperty(field)
    }
  })
})