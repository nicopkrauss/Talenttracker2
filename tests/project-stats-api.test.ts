import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' }))
  }))
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      })),
      filter: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient)
}))

describe('Project Statistics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Mock unauthenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing!' }
      })

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 when user profile is not found', async () => {
      // Mock authenticated user but no profile
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' }
            })
          }))
        }))
      })

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('User profile not found')
      expect(data.code).toBe('PROFILE_NOT_FOUND')
    })

    it('should return 403 when user account is not active', async () => {
      // Mock authenticated user with pending status
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-123', role: null, status: 'pending' },
              error: null
            })
          }))
        }))
      })

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Account not active')
      expect(data.code).toBe('ACCOUNT_NOT_ACTIVE')
    })
  })

  describe('Project Statistics Aggregation', () => {
    it('should aggregate timecard statistics for admin users', async () => {
      // Mock authenticated admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      })

      // Mock user profile query
      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'admin-123', role: 'admin', status: 'active' },
              error: null
            })
          }))
        }))
      }

      // Mock projects query
      const mockProjectsQuery = {
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'project-1',
              name: 'Test Project 1',
              description: 'Test Description',
              production_company: 'Test Company',
              timecard_headers: [
                {
                  id: 'tc-1',
                  user_id: 'user-1',
                  status: 'draft',
                  total_hours: 8,
                  total_pay: 200,
                  submitted_at: null,
                  approved_at: null,
                  created_at: '2024-01-01T10:00:00Z',
                  updated_at: '2024-01-01T10:00:00Z'
                },
                {
                  id: 'tc-2',
                  user_id: 'user-2',
                  status: 'approved',
                  total_hours: 10,
                  total_pay: 300,
                  submitted_at: '2024-01-02T09:00:00Z',
                  approved_at: '2024-01-02T11:00:00Z',
                  created_at: '2024-01-02T08:00:00Z',
                  updated_at: '2024-01-02T11:00:00Z'
                },
                {
                  id: 'tc-3',
                  user_id: 'user-3',
                  status: 'submitted',
                  total_hours: 6,
                  total_pay: 150,
                  submitted_at: '2024-01-03T10:00:00Z',
                  approved_at: null,
                  created_at: '2024-01-03T09:00:00Z',
                  updated_at: '2024-01-03T10:00:00Z'
                }
              ]
            }
          ],
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockProfileQuery)
        .mockReturnValueOnce(mockProjectsQuery)

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      
      const projectStats = data.data[0]
      expect(projectStats.projectId).toBe('project-1')
      expect(projectStats.projectName).toBe('Test Project 1')
      expect(projectStats.totalTimecards).toBe(3)
      expect(projectStats.statusBreakdown).toEqual({
        draft: 1,
        submitted: 1,
        approved: 1,
        rejected: 0
      })
      expect(projectStats.totalHours).toBe(24) // 8 + 10 + 6
      expect(projectStats.totalApprovedPay).toBe(300) // Only approved timecard
      expect(projectStats.pendingApprovals).toBe(1) // Admin-specific field
      expect(projectStats.lastActivity).toBe('2024-01-03T10:00:00Z')
    })

    it('should filter projects for regular users', async () => {
      // Mock authenticated regular user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null
      })

      // Mock user profile query
      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-123', role: null, status: 'active' },
              error: null
            })
          }))
        }))
      }

      // Mock projects query with eq filter applied
      const mockProjectsQuery = {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'project-1',
                name: 'User Project',
                description: 'User Description',
                production_company: 'User Company',
                timecard_headers: [
                  {
                    id: 'tc-1',
                    user_id: 'user-123',
                    status: 'draft',
                    total_hours: 8,
                    total_pay: 200,
                    submitted_at: null,
                    approved_at: null,
                    created_at: '2024-01-01T10:00:00Z',
                    updated_at: '2024-01-01T10:00:00Z'
                  }
                ]
              }
            ],
            error: null
          })
        }))
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockProfileQuery)
        .mockReturnValueOnce(mockProjectsQuery)

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      
      const projectStats = data.data[0]
      expect(projectStats.projectId).toBe('project-1')
      expect(projectStats.totalTimecards).toBe(1)
      expect(projectStats.pendingApprovals).toBeUndefined() // Not admin
      expect(projectStats.overdueSubmissions).toBeUndefined() // Not admin
    })

    it('should skip projects with no timecards', async () => {
      // Mock authenticated admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      })

      // Mock user profile query
      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'admin-123', role: 'admin', status: 'active' },
              error: null
            })
          }))
        }))
      }

      // Mock projects query with empty timecards
      const mockProjectsQuery = {
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'project-1',
              name: 'Empty Project',
              description: 'No timecards',
              production_company: 'Test Company',
              timecard_headers: [] // No timecards
            }
          ],
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockProfileQuery)
        .mockReturnValueOnce(mockProjectsQuery)

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(0) // Should skip projects with no timecards
      expect(data.count).toBe(0)
    })

    it('should calculate overdue submissions for admin users', async () => {
      // Mock authenticated admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      })

      // Mock user profile query
      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'admin-123', role: 'admin', status: 'active' },
              error: null
            })
          }))
        }))
      }

      // Create a date 10 days ago for overdue submission
      const overdueDate = new Date()
      overdueDate.setDate(overdueDate.getDate() - 10)

      // Mock projects query with overdue submission
      const mockProjectsQuery = {
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'project-1',
              name: 'Test Project',
              description: 'Test Description',
              production_company: 'Test Company',
              timecard_headers: [
                {
                  id: 'tc-1',
                  user_id: 'user-1',
                  status: 'submitted',
                  total_hours: 8,
                  total_pay: 200,
                  submitted_at: overdueDate.toISOString(),
                  approved_at: null,
                  created_at: overdueDate.toISOString(),
                  updated_at: overdueDate.toISOString()
                }
              ]
            }
          ],
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockProfileQuery)
        .mockReturnValueOnce(mockProjectsQuery)

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      
      const projectStats = data.data[0]
      expect(projectStats.pendingApprovals).toBe(1)
      expect(projectStats.overdueSubmissions).toBe(1) // Should detect overdue submission
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })

      // Mock user profile query
      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-123', role: 'admin', status: 'active' },
              error: null
            })
          }))
        }))
      }

      // Mock projects query with database error
      const mockProjectsQuery = {
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed', code: 'DB_ERROR' }
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockProfileQuery)
        .mockReturnValueOnce(mockProjectsQuery)

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch project statistics')
      expect(data.code).toBe('FETCH_ERROR')
      expect(data.details).toBe('Database connection failed')
    })

    it('should handle unexpected errors', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })

      // Mock user profile query that throws an error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { GET } = await import('../app/api/timecards/projects/stats/route')
      const request = new NextRequest('http://localhost:3000/api/timecards/projects/stats')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.code).toBe('INTERNAL_ERROR')
      expect(data.details).toBe('Unexpected error')
    })
  })
})