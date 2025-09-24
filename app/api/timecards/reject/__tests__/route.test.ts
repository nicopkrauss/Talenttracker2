import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
  })),
}))

describe('/api/timecards/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject a timecard with required comments', async () => {
    // Mock authenticated admin user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id' } },
      error: null,
    })

    // Mock user profile
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        })),
      })),
    })

    // Mock global settings
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { in_house_can_approve_timecards: true },
          error: null,
        }),
      })),
    })

    // Mock timecard fetch
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'timecard-1', status: 'submitted', user_id: 'user-1' },
            error: null,
          }),
        })),
      })),
    })

    // Mock timecard update
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      })),
    })

    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        comments: 'Hours do not match scheduled time',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.message).toBe('Timecard rejected successfully')
  })

  it('should require comments when rejecting (requirement 5.4)', async () => {
    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        comments: '', // Empty comments should fail validation
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(400)
    expect(result.error).toBe('Validation failed')
    expect(result.details.comments).toContain('Comments are required when rejecting a timecard')
  })

  it('should require authentication', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        comments: 'Rejection reason',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(401)
    expect(result.error).toBe('Unauthorized')
  })

  it('should check approval permissions', async () => {
    // Mock authenticated user without approval permissions
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    // Mock user profile without admin role
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'talent_escort' },
            error: null,
          }),
        })),
      })),
    })

    // Mock global settings
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { 
            in_house_can_approve_timecards: false,
            supervisor_can_approve_timecards: false,
            coordinator_can_approve_timecards: false
          },
          error: null,
        }),
      })),
    })

    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        comments: 'Rejection reason',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(403)
    expect(result.error).toBe('Insufficient permissions to reject timecards')
  })

  it('should validate timecard exists and is in submitted status', async () => {
    // Mock authenticated admin user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id' } },
      error: null,
    })

    // Mock user profile
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        })),
      })),
    })

    // Mock global settings
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { in_house_can_approve_timecards: true },
          error: null,
        }),
      })),
    })

    // Mock timecard not found
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Not found'),
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'nonexistent-timecard',
        comments: 'Rejection reason',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(404)
    expect(result.error).toBe('Timecard not found')
  })
})