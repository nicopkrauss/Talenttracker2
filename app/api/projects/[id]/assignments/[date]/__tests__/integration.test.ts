import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

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

describe('POST and GET /api/projects/[id]/assignments/[date] Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })
  })

  it('should create assignments via POST and retrieve them via GET', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000'
    const date = '2024-06-15'
    const talentId = '550e8400-e29b-41d4-a716-446655440001'
    const escortId = '550e8400-e29b-41d4-a716-446655440002'

    // Mock successful operations for POST
    const mockFromPost = vi.fn((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: projectId,
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
                data: [{ talent_id: talentId }],
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
                data: [{ user_id: escortId }],
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
    
    mockSupabase.from = mockFromPost

    // Create assignment via POST
    const postRequest = new NextRequest(`http://localhost/api/projects/${projectId}/assignments/${date}`, {
      method: 'POST',
      body: JSON.stringify({
        talents: [
          {
            talentId: talentId,
            escortIds: [escortId]
          }
        ],
        groups: []
      })
    })

    const postResponse = await POST(postRequest, {
      params: { id: projectId, date: date }
    })

    expect(postResponse.status).toBe(200)
    const postData = await postResponse.json()
    expect(postData.success).toBe(true)
    expect(postData.data.assignmentsCreated.talents).toBe(1)

    // Mock successful operations for GET
    const mockFromGet = vi.fn((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: projectId,
                  start_date: '2024-01-01',
                  end_date: '2024-12-31'
                },
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'talent_daily_assignments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'assignment-123',
                    talent_id: talentId,
                    escort_id: escortId,
                    talent: {
                      id: talentId,
                      first_name: 'John',
                      last_name: 'Doe'
                    },
                    escort: {
                      id: escortId,
                      full_name: 'Jane Smith'
                    }
                  }
                ],
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'group_daily_assignments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [],
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
                data: [{ talent_id: talentId, display_order: 1 }],
                error: null
              })
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
    
    mockSupabase.from = mockFromGet

    // Retrieve assignments via GET
    const getRequest = new NextRequest(`http://localhost/api/projects/${projectId}/assignments/${date}`, {
      method: 'GET'
    })

    const getResponse = await GET(getRequest, {
      params: { id: projectId, date: date }
    })

    expect(getResponse.status).toBe(200)
    const getData = await getResponse.json()
    expect(getData.data.assignments).toHaveLength(1)
    expect(getData.data.assignments[0].talentId).toBe(talentId)
    expect(getData.data.assignments[0].escortId).toBe(escortId)
    expect(getData.data.assignments[0].talentName).toBe('John Doe')
    expect(getData.data.assignments[0].escortName).toBe('Jane Smith')
  })
})