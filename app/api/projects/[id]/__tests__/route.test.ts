import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'
import { createServerClient } from '@supabase/ssr'

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}))

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => ({ value: 'mock-cookie-value' }))
  }))
}))

// Mock role utils
vi.mock('@/lib/role-utils', () => ({
  hasAdminAccess: vi.fn()
}))

import { hasAdminAccess } from '@/lib/role-utils'

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}

describe('/api/projects/[id] - Enhanced Project API with Readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServerClient as any).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/projects/[id]', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    }

    const mockUserProfile = {
      id: 'user-123',
      role: 'admin',
      status: 'active'
    }

    const mockProject = {
      id: 'project-123',
      name: 'Test Project',
      description: 'Test Description',
      status: 'prep',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-123',
      created_by_profile: { full_name: 'Test User' },
      project_role_templates: [
        {
          id: 'template-1',
          role: 'supervisor',
          display_name: 'Supervisor',
          base_pay_rate: 25,
          time_type: 'hourly',
          is_active: true,
          sort_order: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
    }

    const mockReadinessData = {
      project_id: 'project-123',
      project_name: 'Test Project',
      project_status: 'prep',
      readiness_status: 'setup_required',
      has_role_templates: true,
      has_team_assignments: false,
      has_locations: true,
      has_talent_roster: false,
      team_management_available: true,
      talent_tracking_available: false,
      scheduling_available: false,
      time_tracking_available: false,
      blocking_issues: ['missing_team_assignments', 'missing_talent_roster'],
      available_features: ['team_management'],
      role_template_count: 1,
      team_assignment_count: 0,
      location_count: 3,
      talent_count: 0,
      calculated_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should return project with embedded readiness data', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(hasAdminAccess as any).mockReturnValue(true)

      const mockProjectQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          }))
        }))
      }

      const mockReadinessQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockReadinessData,
              error: null
            })
          }))
        }))
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockUserProfile,
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce(mockProjectQuery)
        .mockReturnValueOnce(mockReadinessQuery)

      const request = new NextRequest('http://localhost:3000/api/projects/project-123')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data).toMatchObject({
        id: 'project-123',
        name: 'Test Project',
        readiness: {
          status: 'setup_required',
          features: {
            team_management: true,
            talent_tracking: false,
            scheduling: false,
            time_tracking: false
          },
          blocking_issues: ['missing_team_assignments', 'missing_talent_roster'],
          available_features: ['team_management'],
          counts: {
            role_templates: 1,
            team_assignments: 0,
            locations: 3,
            talent: 0
          }
        }
      })
    })

    it('should handle missing readiness data gracefully', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(hasAdminAccess as any).mockReturnValue(true)

      const mockProjectQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          }))
        }))
      }

      const mockReadinessQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          }))
        }))
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockUserProfile,
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce(mockProjectQuery)
        .mockReturnValueOnce(mockReadinessQuery)

      const request = new NextRequest('http://localhost:3000/api/projects/project-123')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data).toMatchObject({
        id: 'project-123',
        name: 'Test Project',
        readiness: null,
        readiness_error: 'READINESS_NOT_CALCULATED'
      })
    })

    it('should handle materialized view errors gracefully', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(hasAdminAccess as any).mockReturnValue(true)

      const mockProjectQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          }))
        }))
      }

      const mockReadinessQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST000', message: 'Database error' }
            })
          }))
        }))
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockUserProfile,
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce(mockProjectQuery)
        .mockReturnValueOnce(mockReadinessQuery)

      const request = new NextRequest('http://localhost:3000/api/projects/project-123')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data).toMatchObject({
        id: 'project-123',
        name: 'Test Project',
        readiness: null,
        readiness_error: 'READINESS_FETCH_ERROR'
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/projects/project-123')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
      expect(responseData.code).toBe('UNAUTHORIZED')
    })

    it('should return 404 for non-existent projects', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockUserProfile,
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            }))
          }))
        })

      const request = new NextRequest('http://localhost:3000/api/projects/nonexistent')
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await GET(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Project not found')
      expect(responseData.code).toBe('PROJECT_NOT_FOUND')
    })

    it('should return 400 for invalid project ID', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUserProfile,
              error: null
            })
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/projects/')
      const params = Promise.resolve({ id: '' })

      const response = await GET(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid project ID')
      expect(responseData.code).toBe('INVALID_PROJECT_ID')
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/projects/project-123')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
      expect(responseData.code).toBe('INTERNAL_ERROR')
      expect(responseData.details).toBe('Database connection failed')
    })

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.auth.getUser.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = new NextRequest('http://localhost:3000/api/projects/project-123')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
      expect(responseData.code).toBe('INTERNAL_ERROR')
    })
  })
})