import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

// Mock the Supabase client creation
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient)
}))

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' }))
  }))
}))

// Mock role utils
vi.mock('@/lib/role-utils', () => ({
  canApproveTimecards: vi.fn(() => true)
}))

// Mock audit log service
const mockAuditLogService = {
  recordChanges: vi.fn()
}

vi.mock('@/lib/audit-log-service', () => ({
  AuditLogService: vi.fn(() => mockAuditLogService)
}))

describe('/api/timecards/reject - Status Change Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create status change audit log when rejecting timecard (requirement 2.2)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      user_id: 'user-123'
    }
    const mockCurrentTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      period_start_date: '2024-01-01',
      rejection_reason: null,
      rejected_fields: []
    }

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock the from() calls in sequence
    mockSupabaseClient.from
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          }))
        }))
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }))
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockTimecard,
              error: null
            })
          }))
        }))
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockCurrentTimecard,
              error: null
            })
          }))
        }))
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      })

    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456',
        comments: 'Missing break time',
        rejectedFields: ['break_start_time']
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify audit log service was called with correct parameters
    expect(mockAuditLogService.recordChanges).toHaveBeenCalledWith(
      'timecard-456',
      [
        {
          fieldName: 'status',
          oldValue: 'submitted',
          newValue: 'rejected'
        },
        {
          fieldName: 'rejection_reason',
          oldValue: null,
          newValue: 'Missing break time'
        },
        {
          fieldName: 'rejected_fields',
          oldValue: [],
          newValue: ['break_start_time']
        }
      ],
      'admin-123',
      'rejection_edit',
      new Date('2024-01-01')
    )
  })

  it('should set old_value to submitted and new_value to rejected (requirement 3.3)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      user_id: 'user-123'
    }
    const mockCurrentTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      period_start_date: '2024-01-01',
      rejection_reason: null,
      rejected_fields: []
    }

    // Mock successful authentication and operations
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    const mockProfileSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }))
    }))

    const mockSettingsSelect = vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }))

    const mockTimecardSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockTimecard,
          error: null
        })
      }))
    }))

    const mockCurrentTimecardSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockCurrentTimecard,
          error: null
        })
      }))
    }))

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockProfileSelect })
      .mockReturnValueOnce({ select: mockSettingsSelect })
      .mockReturnValueOnce({ select: mockTimecardSelect })
      .mockReturnValueOnce({ select: mockCurrentTimecardSelect })
      .mockReturnValueOnce({ update: mockUpdate })

    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456',
        comments: 'Rejection reason'
      })
    })

    await POST(request)

    // Verify the status change audit log entry structure
    const recordChangesCall = mockAuditLogService.recordChanges.mock.calls[0]
    const statusChange = recordChangesCall[1].find((change: any) => change.fieldName === 'status')
    
    expect(statusChange).toEqual({
      fieldName: 'status',
      oldValue: 'submitted',
      newValue: 'rejected'
    })
  })

  it('should continue rejection even if audit logging fails (requirement 3.3)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      user_id: 'user-123'
    }
    const mockCurrentTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      period_start_date: '2024-01-01',
      rejection_reason: null,
      rejected_fields: []
    }

    // Mock successful authentication and operations
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    const mockProfileSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }))
    }))

    const mockSettingsSelect = vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }))

    const mockTimecardSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockTimecard,
          error: null
        })
      }))
    }))

    const mockCurrentTimecardSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockCurrentTimecard,
          error: null
        })
      }))
    }))

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockProfileSelect })
      .mockReturnValueOnce({ select: mockSettingsSelect })
      .mockReturnValueOnce({ select: mockTimecardSelect })
      .mockReturnValueOnce({ select: mockCurrentTimecardSelect })
      .mockReturnValueOnce({ update: mockUpdate })

    // Mock audit logging failure
    mockAuditLogService.recordChanges.mockRejectedValue(new Error('Audit logging failed'))

    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456',
        comments: 'Rejection reason'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    // Should still succeed even if audit logging fails
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
  })

  it('should include work_date in status change audit log (requirement 3.3)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      user_id: 'user-123'
    }
    const mockCurrentTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      period_start_date: '2024-01-15',
      rejection_reason: null,
      rejected_fields: []
    }

    // Mock successful authentication and operations
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    const mockProfileSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }))
    }))

    const mockSettingsSelect = vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }))

    const mockTimecardSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockTimecard,
          error: null
        })
      }))
    }))

    const mockCurrentTimecardSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockCurrentTimecard,
          error: null
        })
      }))
    }))

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockProfileSelect })
      .mockReturnValueOnce({ select: mockSettingsSelect })
      .mockReturnValueOnce({ select: mockTimecardSelect })
      .mockReturnValueOnce({ select: mockCurrentTimecardSelect })
      .mockReturnValueOnce({ update: mockUpdate })

    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456',
        comments: 'Rejection reason'
      })
    })

    await POST(request)

    // Verify work_date is included in the audit log call
    expect(mockAuditLogService.recordChanges).toHaveBeenCalledWith(
      'timecard-456',
      expect.any(Array),
      'admin-123',
      'rejection_edit',
      new Date('2024-01-15') // work_date should be the timecard period start date
    )
  })
})