import { POST } from '../route'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { vi } from 'vitest'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock Supabase
vi.mock('@supabase/ssr')
vi.mock('next/headers')

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [], error: null }))
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    }))
  }))
}

;(createServerClient as any).mockReturnValue(mockSupabase)

describe('/api/timecards/resolve-breaks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const request = new NextRequest('http://localhost/api/timecards/resolve-breaks', {
      method: 'POST',
      body: JSON.stringify({
        timecardIds: ['1'],
        resolutions: { '1': 'add_break' }
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 when request data is invalid', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    const request = new NextRequest('http://localhost/api/timecards/resolve-breaks', {
      method: 'POST',
      body: JSON.stringify({
        // Missing timecardIds
        resolutions: { '1': 'add_break' }
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
  })

  it('returns 404 when no valid timecards are found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    // Mock empty timecard result
    const mockSelect = vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const request = new NextRequest('http://localhost/api/timecards/resolve-breaks', {
      method: 'POST',
      body: JSON.stringify({
        timecardIds: ['1'],
        resolutions: { '1': 'add_break' }
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('No valid timecards found')
  })

  it('successfully resolves breaks and updates timecards', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    // Mock timecard data
    const mockTimecards = [
      {
        id: '1',
        user_id: 'user1',
        check_in_time: '2024-01-15T08:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        total_hours: 9.0,
        pay_rate: 25,
        total_pay: 225,
        break_duration: 0
      }
    ]

    const mockSelect = vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ data: mockTimecards, error: null }))
        }))
      }))
    }))

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    }))

    mockSupabase.from.mockReturnValue({ 
      select: mockSelect,
      update: mockUpdate
    })

    const request = new NextRequest('http://localhost/api/timecards/resolve-breaks', {
      method: 'POST',
      body: JSON.stringify({
        timecardIds: ['1'],
        resolutions: { '1': 'add_break' }
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.updatedTimecards).toEqual(['1'])
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('handles database errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    // Mock database error
    const mockSelect = vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ data: null, error: new Error('Database error') }))
        }))
      }))
    }))
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const request = new NextRequest('http://localhost/api/timecards/resolve-breaks', {
      method: 'POST',
      body: JSON.stringify({
        timecardIds: ['1'],
        resolutions: { '1': 'add_break' }
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch timecards')
  })

  it('validates user ownership of timecards', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    const mockSelect = vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn((field, value) => {
          // Verify that user_id filter is applied
          expect(field).toBe('user_id')
          expect(value).toBe('user1')
          return {
            eq: vi.fn(() => ({ data: [], error: null }))
          }
        })
      }))
    }))
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const request = new NextRequest('http://localhost/api/timecards/resolve-breaks', {
      method: 'POST',
      body: JSON.stringify({
        timecardIds: ['1'],
        resolutions: { '1': 'add_break' }
      })
    })

    await POST(request)

    expect(mockSelect).toHaveBeenCalled()
  })
})