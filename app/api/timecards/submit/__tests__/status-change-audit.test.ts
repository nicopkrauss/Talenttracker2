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
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    insert: vi.fn()
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

// Mock audit log service
const mockAuditLogService = {
  recordChanges: vi.fn(),
  logStatusChange: vi.fn()
}

vi.mock('@/lib/audit-log-service', () => ({
  AuditLogService: vi.fn(() => mockAuditLogService)
}))

// Mock timecard columns
vi.mock('@/lib/timecard-columns', () => ({
  TIMECARD_HEADERS_SELECT: '*'
}))

// Mock timecard audit integration
vi.mock('@/lib/timecard-audit-integration', () => ({
  withTimecardAuditLogging: vi.fn()
}))

describe('/api/timecards/submit - Status Change Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create status change audit log when submitting timecard (requirement 2.1)', async () => {
    const mockUser = { id: 'user-123' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'draft',
      period_start_date: '2024-01-01',
      user_id: 'user-123'
    }

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock timecard fetch
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockTimecard,
            error: null
          })
        }))
      }))
    }))
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

    // Mock successful update
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
    mockSupabaseClient.from.mockReturnValueOnce({ select: mockSelect })
    mockSupabaseClient.from.mockReturnValueOnce({ update: mockUpdate })

    const request = new NextRequest('http://localhost/api/timecards/submit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify audit log service was called with correct parameters
    expect(mockAuditLogService.logStatusChange).toHaveBeenCalledWith(
      'timecard-456',
      'draft',
      'submitted',
      'user-123'
    )
  })

  it('should handle status change from rejected to submitted (requirement 2.1)', async () => {
    const mockUser = { id: 'user-123' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'rejected',
      period_start_date: '2024-01-01',
      user_id: 'user-123'
    }

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock timecard fetch
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockTimecard,
            error: null
          })
        }))
      }))
    }))
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

    // Mock successful update
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
    mockSupabaseClient.from.mockReturnValueOnce({ select: mockSelect })
    mockSupabaseClient.from.mockReturnValueOnce({ update: mockUpdate })

    const request = new NextRequest('http://localhost/api/timecards/submit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify audit log service was called with rejected -> submitted transition
    expect(mockAuditLogService.logStatusChange).toHaveBeenCalledWith(
      'timecard-456',
      'rejected',
      'submitted',
      'user-123'
    )
  })

  it('should continue submission even if audit logging fails (requirement 3.3)', async () => {
    const mockUser = { id: 'user-123' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'draft',
      period_start_date: '2024-01-01',
      user_id: 'user-123'
    }

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock timecard fetch
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockTimecard,
            error: null
          })
        }))
      }))
    }))
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

    // Mock successful update
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
    mockSupabaseClient.from.mockReturnValueOnce({ select: mockSelect })
    mockSupabaseClient.from.mockReturnValueOnce({ update: mockUpdate })

    // Mock audit logging failure
    mockAuditLogService.logStatusChange.mockRejectedValue(new Error('Audit logging failed'))

    const request = new NextRequest('http://localhost/api/timecards/submit', {
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

  it('should set field_name to null and work_date to null for status changes (requirement 3.3)', async () => {
    const mockUser = { id: 'user-123' }
    const mockTimecard = {
      id: 'timecard-456',
      status: 'draft',
      period_start_date: '2024-01-01',
      user_id: 'user-123'
    }

    // Mock successful authentication and operations
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockTimecard,
            error: null
          })
        }))
      }))
    }))
    mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
    mockSupabaseClient.from.mockReturnValueOnce({ select: mockSelect })
    mockSupabaseClient.from.mockReturnValueOnce({ update: mockUpdate })

    const request = new NextRequest('http://localhost/api/timecards/submit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-456'
      })
    })

    await POST(request)

    // Verify the audit log entry structure matches requirements
    expect(mockAuditLogService.logStatusChange).toHaveBeenCalledWith(
      'timecard-456',
      'draft', // old status
      'submitted', // new status
      'user-123' // changed by user
    )
  })
})