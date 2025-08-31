import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        in: vi.fn(() => ({
          eq: vi.fn()
        }))
      })),
      count: 'exact',
      head: true
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}))

describe('/api/projects/[id]/statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return project statistics for authenticated user', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })

    // Mock project data
    const mockProject = {
      id: 'project-1',
      talent_expected: 10
    }

    // Mock database queries
    const mockFromChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockProject,
            error: null
          }),
          count: 'exact',
          head: true
        }))
      }))
    }

    mockSupabase.from.mockReturnValue(mockFromChain)

    // Mock count queries
    const mockCountQueries = [
      { count: 8 }, // talent assigned
      { count: 5 }, // staff assigned
      { count: 4 }, // staff checked in
      { count: 6 }, // talent present
      { count: 3 }  // active escorts
    ]

    let queryIndex = 0
    mockFromChain.select.mockImplementation(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: mockProject,
          error: null
        }),
        count: 'exact',
        head: true,
        in: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue(mockCountQueries[queryIndex++])
        }))
      }))
    }))

    // Mock active shifts for overtime calculation
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'shifts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { check_in_time: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString() }, // 9 hours ago
                    { check_in_time: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString() } // 13 hours ago
                  ],
                  error: null
                })
              }))
            }))
          }))
        }
      }
      return mockFromChain
    })

    const request = new NextRequest('http://localhost/api/projects/project-1/statistics')
    const response = await GET(request, { params: { id: 'project-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual({
      talentExpected: 10,
      talentAssigned: 8,
      staffNeeded: 0, // No project roles in mock
      staffAssigned: 5,
      staffCheckedIn: 4,
      talentPresent: 6,
      activeEscorts: 3,
      staffOvertime: {
        over8Hours: 2,
        over12Hours: 1
      }
    })
  })

  it('should return 401 for unauthenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const request = new NextRequest('http://localhost/api/projects/project-1/statistics')
    const response = await GET(request, { params: { id: 'project-1' } })

    expect(response.status).toBe(401)
  })

  it('should return 404 for non-existent project', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })

    const mockFromChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Project not found')
          })
        }))
      }))
    }

    mockSupabase.from.mockReturnValue(mockFromChain)

    const request = new NextRequest('http://localhost/api/projects/nonexistent/statistics')
    const response = await GET(request, { params: { id: 'nonexistent' } })

    expect(response.status).toBe(404)
  })

  it('should handle database errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })

    mockSupabase.from.mockImplementation(() => {
      throw new Error('Database connection failed')
    })

    const request = new NextRequest('http://localhost/api/projects/project-1/statistics')
    const response = await GET(request, { params: { id: 'project-1' } })

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Internal server error')
  })
})