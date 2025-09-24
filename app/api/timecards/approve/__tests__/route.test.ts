import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
  })),
}))

describe('/api/timecards/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should approve a single timecard successfully', async () => {
    // Mock authenticated admin user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id' } },
      error: null,
    })

    // Mock user profile query
    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      }),
    }

    // Mock global settings query
    const mockSettingsQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { in_house_can_approve_timecards: true },
        error: null,
      }),
    }

    // Mock timecard fetch query
    const mockTimecardQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'timecard-1', status: 'submitted' },
        error: null,
      }),
    }

    // Mock timecard update query
    const mockUpdateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    }

    mockSupabase.from
      .mockReturnValueOnce(mockProfileQuery)
      .mockReturnValueOnce(mockSettingsQuery)
      .mockReturnValueOnce(mockTimecardQuery)
      .mockReturnValueOnce(mockUpdateQuery)

    const request = new NextRequest('http://localhost/api/timecards/approve', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        comments: 'Approved by admin',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.message).toBe('Timecard approved successfully')
  })

  it('should require authentication', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const request = new NextRequest('http://localhost/api/timecards/approve', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
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
          data: { in_house_can_approve_timecards: false },
          error: null,
        }),
      })),
    })

    const request = new NextRequest('http://localhost/api/timecards/approve', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(403)
    expect(result.error).toBe('Insufficient permissions to approve timecards')
  })

  it('should validate timecard status before approval', async () => {
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

    // Mock timecard with invalid status
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'timecard-1', status: 'approved' },
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/api/timecards/approve', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(400)
    expect(result.error).toBe('Timecard is not in submitted status')
  })

  it('should handle bulk approval with validation', async () => {
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

    // Mock timecards fetch for bulk approval
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'timecard-1', status: 'submitted', manually_edited: false },
            { id: 'timecard-2', status: 'submitted', manually_edited: true },
          ],
          error: null,
        }),
      })),
    })

    // Mock bulk update
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          error: null,
        }),
      })),
    })

    const request = new NextRequest('http://localhost/api/timecards/approve?bulk=true', {
      method: 'POST',
      body: JSON.stringify({
        timecardIds: ['timecard-1', 'timecard-2'],
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.approvedCount).toBe(2)
    expect(result.manuallyEditedCount).toBe(1)
  })
})