import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        limit: vi.fn()
      })),
      in: vi.fn()
    })),
    update: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
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

// Mock timecard audit integration
vi.mock('@/lib/timecard-audit-integration', () => ({
  withTimecardAuditLogging: vi.fn()
}))

describe('/api/timecards/approve - Status Change Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create status change audit log when approving single timecard (requirement 2.3)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      period_start_date: '2024-01-01',
      user_id: 'user-123'
    }

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock profile fetch
    const mockProfileSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }))
    }))

    // Mock global settings fetch (empty)
    const mockSettingsSelect = vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }))

    // Mock timecard fetch
    const mockTimecardSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockTimecard,
          error: null
        })
      }))
    }))

    // Mock successful update
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    // Set up the mock chain
    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockProfileSelect })
      .mockReturnValueOnce({ select: mockSettingsSelect })
      .mockReturnValueOnce({ select: mockTimecardSelect })
      .mockReturnValueOnce({ update: mockUpdate })

    const request = new NextRequest('http://localhost/api/timecards/approve', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456',
        comments: 'Approved'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify audit log service was called with correct parameters
    expect(mockAuditLogService.recordChanges).toHaveBeenCalledWith(
      'timecard-456',
      [{
        fieldName: 'status',
        oldValue: 'submitted',
        newValue: 'approved'
      }],
      'admin-123',
      'admin_edit',
      new Date('2024-01-01')
    )
  })

  it('should create status change audit logs for bulk approval (requirement 2.3)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecards = [
      { id: 'timecard-1', status: 'submitted', manually_edited: false },
      { id: 'timecard-2', status: 'submitted', manually_edited: true }
    ]
    const mockFullTimecards = [
      { id: 'timecard-1', status: 'submitted', period_start_date: '2024-01-01' },
      { id: 'timecard-2', status: 'submitted', period_start_date: '2024-01-02' }
    ]

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock profile fetch
    const mockProfileSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }))
    }))

    // Mock global settings fetch (empty)
    const mockSettingsSelect = vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }))

    // Mock bulk timecards fetch
    const mockBulkTimecardSelect = vi.fn(() => ({
      in: vi.fn().mockResolvedValue({
        data: mockTimecards,
        error: null
      })
    }))

    // Mock individual timecard fetches for audit logging
    const mockIndividualSelect1 = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockFullTimecards[0],
          error: null
        })
      }))
    }))

    const mockIndividualSelect2 = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockFullTimecards[1],
          error: null
        })
      }))
    }))

    // Mock successful updates
    const mockUpdate1 = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    const mockUpdate2 = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    // Set up the mock chain for bulk approval
    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockProfileSelect })
      .mockReturnValueOnce({ select: mockSettingsSelect })
      .mockReturnValueOnce({ select: mockBulkTimecardSelect })
      .mockReturnValueOnce({ select: mockIndividualSelect1 })
      .mockReturnValueOnce({ update: mockUpdate1 })
      .mockReturnValueOnce({ select: mockIndividualSelect2 })
      .mockReturnValueOnce({ update: mockUpdate2 })

    const request = new NextRequest('http://localhost/api/timecards/approve?bulk=true', {
      method: 'POST',
      body: JSON.stringify({
        timecardIds: ['timecard-1', 'timecard-2'],
        comments: 'Bulk approved'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.approvedCount).toBe(2)

    // Verify audit log service was called for each timecard
    expect(mockAuditLogService.recordChanges).toHaveBeenCalledTimes(2)
    
    expect(mockAuditLogService.recordChanges).toHaveBeenNthCalledWith(1,
      'timecard-1',
      [{
        fieldName: 'status',
        oldValue: 'submitted',
        newValue: 'approved'
      }],
      'admin-123',
      'admin_edit',
      new Date('2024-01-01')
    )

    expect(mockAuditLogService.recordChanges).toHaveBeenNthCalledWith(2,
      'timecard-2',
      [{
        fieldName: 'status',
        oldValue: 'submitted',
        newValue: 'approved'
      }],
      'admin-123',
      'admin_edit',
      new Date('2024-01-02')
    )
  })

  it('should set old_value to submitted and new_value to approved (requirement 3.3)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      period_start_date: '2024-01-01',
      user_id: 'user-123'
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

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockProfileSelect })
      .mockReturnValueOnce({ select: mockSettingsSelect })
      .mockReturnValueOnce({ select: mockTimecardSelect })
      .mockReturnValueOnce({ update: mockUpdate })

    const request = new NextRequest('http://localhost/api/timecards/approve', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456'
      })
    })

    await POST(request)

    // Verify the status change audit log entry structure
    expect(mockAuditLogService.recordChanges).toHaveBeenCalledWith(
      'timecard-456',
      [{
        fieldName: 'status',
        oldValue: 'submitted',
        newValue: 'approved'
      }],
      'admin-123',
      'admin_edit',
      new Date('2024-01-01')
    )
  })

  it('should continue approval even if audit logging fails (requirement 3.3)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'submitted',
      period_start_date: '2024-01-01',
      user_id: 'user-123'
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

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockProfileSelect })
      .mockReturnValueOnce({ select: mockSettingsSelect })
      .mockReturnValueOnce({ select: mockTimecardSelect })
      .mockReturnValueOnce({ update: mockUpdate })

    // Mock audit logging failure
    mockAuditLogService.recordChanges.mockRejectedValue(new Error('Audit logging failed'))

    const request = new NextRequest('http://localhost/api/timecards/approve', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456'
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
      period_start_date: '2024-01-15',
      user_id: 'user-123'
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

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))

    mockSupabaseClient.from
      .mockReturnValueOnce({ select: mockProfileSelect })
      .mockReturnValueOnce({ select: mockSettingsSelect })
      .mockReturnValueOnce({ select: mockTimecardSelect })
      .mockReturnValueOnce({ update: mockUpdate })

    const request = new NextRequest('http://localhost/api/timecards/approve', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456'
      })
    })

    await POST(request)

    // Verify work_date is included in the audit log call
    expect(mockAuditLogService.recordChanges).toHaveBeenCalledWith(
      'timecard-456',
      [{
        fieldName: 'status',
        oldValue: 'submitted',
        newValue: 'approved'
      }],
      'admin-123',
      'admin_edit',
      new Date('2024-01-15') // work_date should be the timecard period start date
    )
  })
})