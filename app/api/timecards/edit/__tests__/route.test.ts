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

describe('/api/timecards/edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should edit a timecard with admin note (requirement 5.3)', async () => {
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

    // Mock timecard fetch
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { 
              id: 'timecard-1', 
              total_hours: 8.0,
              pay_rate: 25.00,
              status: 'submitted'
            },
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

    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        edits: {
          total_hours: 7.5,
        },
        adminNote: 'Corrected hours based on security footage',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.message).toBe('Timecard edited successfully and returned to user for re-approval')
    expect(result.changes).toEqual([{ field: 'total_hours', newValue: 7.5 }])
  })

  it('should require admin note when editing (requirement 5.3)', async () => {
    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        edits: {
          total_hours: 7.5,
        },
        adminNote: '', // Empty admin note should fail validation
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(400)
    expect(result.error).toBe('Validation failed')
    expect(result.details.adminNote).toContain('Admin note is required when editing a timecard')
  })

  it('should only allow admins to edit timecards', async () => {
    // Mock authenticated non-admin user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    // Mock user profile without admin role
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'supervisor' },
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        edits: {
          total_hours: 7.5,
        },
        adminNote: 'Correction needed',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(403)
    expect(result.error).toBe('Insufficient permissions to edit timecards')
  })

  it('should require authentication', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        edits: { total_hours: 7.5 },
        adminNote: 'Correction needed',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(401)
    expect(result.error).toBe('Unauthorized')
  })

  it('should validate timecard exists', async () => {
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

    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'nonexistent-timecard',
        edits: { total_hours: 7.5 },
        adminNote: 'Correction needed',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(404)
    expect(result.error).toBe('Timecard not found')
  })

  it('should handle no changes detected', async () => {
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

    // Mock timecard fetch with same values
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { 
              id: 'timecard-1', 
              total_hours: 8.0,
              pay_rate: 25.00,
            },
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: 'timecard-1',
        edits: {
          total_hours: 8.0, // Same value, no change
        },
        adminNote: 'No actual changes',
      }),
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(400)
    expect(result.error).toBe('No changes detected')
  })
})