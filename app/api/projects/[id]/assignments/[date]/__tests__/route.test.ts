import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
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

describe('GET /api/projects/[id]/assignments/[date]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const request = new NextRequest('http://localhost:3000/api/projects/123/assignments/2024-01-15')
    const params = { id: '123', date: '2024-01-15' }

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(data.code).toBe('UNAUTHORIZED')
  })

  it('should return 400 for invalid date format', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/projects/123/assignments/invalid-date')
    const params = { id: '123', date: 'invalid-date' }

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid date format')
    expect(data.code).toBe('INVALID_DATE')
  })

  it('should return 404 when project is not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Project not found')
          })
        })
      })
    })
    mockSupabase.from.mockImplementation(mockFrom)

    const request = new NextRequest('http://localhost:3000/api/projects/123/assignments/2024-01-15')
    const params = { id: '123', date: '2024-01-15' }

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
    expect(data.code).toBe('PROJECT_NOT_FOUND')
  })

  it('should return assignments for valid request', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock project query
    const mockProjectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'project-123',
              start_date: '2024-01-01',
              end_date: '2024-01-31'
            },
            error: null
          })
        })
      })
    }

    // Mock talent assignments query
    const mockTalentQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{
              id: 'assignment-1',
              talent_id: 'talent-1',
              escort_id: 'escort-1',
              talent: {
                id: 'talent-1',
                first_name: 'John',
                last_name: 'Doe'
              },
              escort: {
                id: 'escort-1',
                full_name: 'Jane Smith'
              }
            }],
            error: null
          })
        })
      })
    }

    // Mock group assignments query
    const mockGroupQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    }

    // Mock display order queries
    const mockDisplayOrderQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{
              talent_id: 'talent-1',
              display_order: 1
            }],
            error: null
          })
        })
      })
    }

    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++
      if (table === 'projects') return mockProjectQuery
      if (table === 'talent_daily_assignments') return mockTalentQuery
      if (table === 'group_daily_assignments') return mockGroupQuery
      if (table === 'talent_project_assignments' || table === 'talent_groups') return mockDisplayOrderQuery
      return mockProjectQuery
    })

    const request = new NextRequest('http://localhost:3000/api/projects/123/assignments/2024-01-15')
    const params = { id: '123', date: '2024-01-15' }

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.date).toBe('2024-01-15')
    expect(data.data.assignments).toHaveLength(1)
    expect(data.data.assignments[0]).toMatchObject({
      talentId: 'talent-1',
      talentName: 'John Doe',
      isGroup: false,
      escortId: 'escort-1',
      escortName: 'Jane Smith'
    })
  })

  it('should handle multiple escorts for talent groups correctly', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock project query
    const mockProjectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'project-123',
              start_date: '2024-01-01',
              end_date: '2024-01-31'
            },
            error: null
          })
        })
      })
    }

    // Mock talent assignments query (empty)
    const mockTalentQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    }

    // Mock group assignments query with multiple escorts
    const mockGroupQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'assignment-1',
                group_id: 'group-1',
                escort_id: 'escort-1',
                group: {
                  id: 'group-1',
                  group_name: 'VIP Group'
                },
                escort: {
                  id: 'escort-1',
                  full_name: 'Jane Smith'
                }
              },
              {
                id: 'assignment-2',
                group_id: 'group-1',
                escort_id: 'escort-2',
                group: {
                  id: 'group-1',
                  group_name: 'VIP Group'
                },
                escort: {
                  id: 'escort-2',
                  full_name: 'Bob Johnson'
                }
              }
            ],
            error: null
          })
        })
      })
    }

    // Mock display order queries
    const mockDisplayOrderQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{
              id: 'group-1',
              display_order: 2
            }],
            error: null
          })
        })
      })
    }

    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++
      if (table === 'projects') return mockProjectQuery
      if (table === 'talent_daily_assignments') return mockTalentQuery
      if (table === 'group_daily_assignments') return mockGroupQuery
      if (table === 'talent_project_assignments' || table === 'talent_groups') return mockDisplayOrderQuery
      return mockProjectQuery
    })

    const request = new NextRequest('http://localhost:3000/api/projects/123/assignments/2024-01-15')
    const params = { id: '123', date: '2024-01-15' }

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.assignments).toHaveLength(1)
    
    const groupAssignment = data.data.assignments[0]
    expect(groupAssignment).toMatchObject({
      talentId: 'group-1',
      talentName: 'VIP Group',
      isGroup: true,
      escortId: 'escort-1',
      escortName: 'Jane Smith'
    })
    
    // Should have both escorts in escortAssignments array
    expect(groupAssignment.escortAssignments).toHaveLength(2)
    expect(groupAssignment.escortAssignments).toEqual([
      { escortId: 'escort-1', escortName: 'Jane Smith' },
      { escortId: 'escort-2', escortName: 'Bob Johnson' }
    ])
  })

  it('should handle date outside project range', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'project-123',
              start_date: '2024-01-01',
              end_date: '2024-01-31'
            },
            error: null
          })
        })
      })
    })
    mockSupabase.from.mockImplementation(mockFrom)

    const request = new NextRequest('http://localhost:3000/api/projects/123/assignments/2024-02-15')
    const params = { id: '123', date: '2024-02-15' }

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Date is outside project range')
    expect(data.code).toBe('DATE_OUT_OF_RANGE')
  })}
)