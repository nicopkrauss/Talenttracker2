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
  canApproveTimecardsWithSettings: vi.fn(() => true)
}))

// Mock timecard columns
vi.mock('@/lib/timecard-columns', () => ({
  TIMECARD_HEADERS_SELECT: '*'
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
  withTimecardAuditLogging: vi.fn((supabase, context, callback) => callback())
}))

describe('/api/timecards/edit - Status Change Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create status change audit log when admin edits draft timecard (requirement 3.4)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'draft',
      period_start_date: '2024-01-01',
      user_id: 'user-123' // Different from admin user
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
              data: mockProfile,
              error: null
            })
          }))
        }))
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
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

    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: '550e8400-e29b-41d4-a716-446655440000',
        updates: {
          check_in_time: '09:00:00'
        },
        editComment: 'Admin adjustment'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify audit log service was called with status change
    expect(mockAuditLogService.recordChanges).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      [{
        fieldName: 'status',
        oldValue: 'draft',
        newValue: 'edited_draft'
      }],
      'admin-123',
      'admin_edit',
      new Date('2024-01-01')
    )
  })

  it('should set old_value to draft and new_value to edited_draft (requirement 3.4)', async () => {
    const mockUser = { id: 'admin-123' }
    const mockProfile = { role: 'admin' }
    const mockTimecard = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'draft',
      period_start_date: '2024-01-01',
      user_id: 'user-123'
    }

    // Mock successful authentication and operations
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    mockSupabaseClient.from
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
              data: mockProfile,
              error: null
            })
          }))
        }))
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
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

    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: '550e8400-e29b-41d4-a716-446655440000',
        updates: {
          check_in_time: '09:00:00'
        }
      })
    })

    await POST(request)

    // Verify the status change audit log entry structure
    expect(mockAuditLogService.recordChanges).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      [{
        fieldName: 'status',
        oldValue: 'draft',
        newValue: 'edited_draft'
      }],
      'admin-123',
      'admin_edit',
      new Date('2024-01-01')
    )
  })

  it('should not create status change audit log when user edits their own draft timecard', async () => {
    const mockUser = { id: 'user-123' }
    const mockProfile = { role: null }
    const mockTimecard = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'draft',
      period_start_date: '2024-01-01',
      user_id: 'user-123' // Same as the editing user
    }

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    mockSupabaseClient.from
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
              data: mockProfile,
              error: null
            })
          }))
        }))
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
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

    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: '550e8400-e29b-41d4-a716-446655440000',
        updates: {
          check_in_time: '09:00:00'
        }
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Should not create status change audit log for user editing their own timecard
    expect(mockAuditLogService.recordChanges).not.toHaveBeenCalled()
  })
})