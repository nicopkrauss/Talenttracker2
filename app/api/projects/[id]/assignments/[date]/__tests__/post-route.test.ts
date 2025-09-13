import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        in: vi.fn()
      })),
      in: vi.fn()
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    insert: vi.fn()
  }))
}

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn()
  }))
}))

// Mock Supabase client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase)
}))

describe('POST /api/projects/[id]/assignments/[date]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const request = new NextRequest('http://localhost/api/projects/123/assignments/2024-01-15', {
      method: 'POST',
      body: JSON.stringify({
        talents: [],
        groups: []
      })
    })

    const response = await POST(request, {
      params: { id: '123', date: '2024-01-15' }
    })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.code).toBe('UNAUTHORIZED')
  })

  it('should return 400 for invalid date format', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const request = new NextRequest('http://localhost/api/projects/123/assignments/invalid-date', {
      method: 'POST',
      body: JSON.stringify({
        talents: [],
        groups: []
      })
    })

    const response = await POST(request, {
      params: { id: '123', date: 'invalid-date' }
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.code).toBe('INVALID_DATE')
  })

  it('should return 400 for validation errors in request body', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const request = new NextRequest('http://localhost/api/projects/123/assignments/2024-01-15', {
      method: 'POST',
      body: JSON.stringify({
        talents: [
          {
            talentId: 'invalid-uuid',
            escortIds: ['also-invalid']
          }
        ],
        groups: []
      })
    })

    const response = await POST(request, {
      params: { id: '123', date: '2024-01-15' }
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data.details).toBeDefined()
  })

  it('should return 404 if project is not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock project not found
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Project not found')
          })
        }))
      }))
    })

    const request = new NextRequest('http://localhost/api/projects/123/assignments/2024-01-15', {
      method: 'POST',
      body: JSON.stringify({
        talents: [],
        groups: []
      })
    })

    const response = await POST(request, {
      params: { id: '123', date: '2024-01-15' }
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.code).toBe('PROJECT_NOT_FOUND')
  })

  it('should return 400 if date is outside project range', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock project with date range
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: '123',
              start_date: '2024-02-01',
              end_date: '2024-02-28'
            },
            error: null
          })
        }))
      }))
    })

    const request = new NextRequest('http://localhost/api/projects/123/assignments/2025-03-15', {
      method: 'POST',
      body: JSON.stringify({
        talents: [],
        groups: []
      })
    })

    const response = await POST(request, {
      params: { id: '123', date: '2025-03-15' }
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.code).toBe('DATE_OUT_OF_RANGE')
  })

  it('should successfully create assignments for valid request', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock successful project lookup and validations
    const mockFrom = vi.fn((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '550e8400-e29b-41d4-a716-446655440000',
                  start_date: '2024-01-01',
                  end_date: '2024-12-31'
                },
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'talent_project_assignments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: [{ talent_id: '550e8400-e29b-41d4-a716-446655440001' }],
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'team_assignments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: [{ user_id: '550e8400-e29b-41d4-a716-446655440002' }],
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'talent_daily_assignments') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          })),
          insert: vi.fn().mockResolvedValue({ error: null })
        }
      }
      
      if (table === 'group_daily_assignments') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          }))
        }
      }
      
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: [], error: null })
          }))
        }))
      }
    })
    
    mockSupabase.from = mockFrom

    const request = new NextRequest('http://localhost/api/projects/550e8400-e29b-41d4-a716-446655440000/assignments/2024-06-15', {
      method: 'POST',
      body: JSON.stringify({
        talents: [
          {
            talentId: '550e8400-e29b-41d4-a716-446655440001',
            escortIds: ['550e8400-e29b-41d4-a716-446655440002']
          }
        ],
        groups: []
      })
    })

    const response = await POST(request, {
      params: { id: '550e8400-e29b-41d4-a716-446655440000', date: '2024-06-15' }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.assignmentsCreated.talents).toBe(1)
    expect(data.data.assignmentsCreated.total).toBe(1)
  })
})