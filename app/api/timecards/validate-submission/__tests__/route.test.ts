import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase)
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(() => ({ value: 'mock-cookie' }))
  }))
}))

describe('/api/timecards/validate-submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const request = new NextRequest('http://localhost/api/timecards/validate-submission', {
      method: 'POST',
      body: JSON.stringify({ timecardIds: ['1'] })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(data.code).toBe('UNAUTHORIZED')
  })

  it('should return 400 for invalid request data', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    const request = new NextRequest('http://localhost/api/timecards/validate-submission', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request data')
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should validate timecards successfully', async () => {
    const mockTimecards = [
      {
        id: '1',
        user_id: 'user1',
        project_id: 'project1',
        date: '2024-01-15',
        total_hours: 6,
        break_duration: 30,
        status: 'draft',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T15:00:00Z',
        break_start_time: '2024-01-15T12:00:00Z',
        break_end_time: '2024-01-15T12:30:00Z',
        pay_rate: 25,
        total_pay: 150,
        manually_edited: false,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      }
    ]

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockTimecards, error: null }))
        }))
      }))
    })

    const request = new NextRequest('http://localhost/api/timecards/validate-submission', {
      method: 'POST',
      body: JSON.stringify({ timecardIds: ['1'] })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canSubmit).toBe(true)
    expect(data.errors).toHaveLength(0)
    expect(data.missingBreaks).toHaveLength(0)
  })

  it('should validate with project start date for show day timing', async () => {
    const mockTimecards = [
      {
        id: '1',
        user_id: 'user1',
        project_id: 'project1',
        date: '2024-01-15',
        total_hours: 6,
        break_duration: 30,
        status: 'draft',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T15:00:00Z',
        break_start_time: '2024-01-15T12:00:00Z',
        break_end_time: '2024-01-15T12:30:00Z',
        pay_rate: 25,
        total_pay: 150,
        manually_edited: false,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      }
    ]

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureStartDate = tomorrow.toISOString().split('T')[0]

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    // Mock timecard fetch
    const timecardQuery = {
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockTimecards, error: null }))
        }))
      }))
    }

    // Mock project fetch
    const projectQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { start_date: futureStartDate }, 
            error: null 
          }))
        }))
      }))
    }

    mockSupabase.from
      .mockReturnValueOnce(timecardQuery)
      .mockReturnValueOnce(projectQuery)

    const request = new NextRequest('http://localhost/api/timecards/validate-submission', {
      method: 'POST',
      body: JSON.stringify({ timecardIds: ['1'], projectId: 'project1' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canSubmit).toBe(false)
    expect(data.errors.some((error: string) => error.includes('Timecard submission is not available until show day begins'))).toBe(true)
  })

  it('should handle missing break validation', async () => {
    const mockTimecards = [
      {
        id: '1',
        user_id: 'user1',
        project_id: 'project1',
        date: '2024-01-15',
        total_hours: 8, // >6 hours
        break_duration: 0, // No break
        status: 'draft',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        break_start_time: null,
        break_end_time: null,
        pay_rate: 25,
        total_pay: 200,
        manually_edited: false,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z'
      }
    ]

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockTimecards, error: null }))
        }))
      }))
    })

    const request = new NextRequest('http://localhost/api/timecards/validate-submission', {
      method: 'POST',
      body: JSON.stringify({ timecardIds: ['1'] })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canSubmit).toBe(false)
    expect(data.errors.some((error: string) => error.includes('missing break information'))).toBe(true)
    expect(data.missingBreaks).toHaveLength(1)
  })
})