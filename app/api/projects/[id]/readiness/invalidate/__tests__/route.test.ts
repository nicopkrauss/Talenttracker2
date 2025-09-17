import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
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

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  })),
  rpc: vi.fn()
}

describe('/api/projects/[id]/readiness/invalidate - Readiness Invalidation API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServerClient as any).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/projects/[id]/readiness/invalidate', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    }

    const mockProject = {
      id: 'project-123',
      status: 'prep'
    }

    const mockReadinessData = {
      project_id: 'project-123',
      readiness_status: 'ready_for_activation',
      team_management_available: true,
      talent_tracking_available: false,
      scheduling_available: true,
      time_tracking_available: false,
      blocking_issues: ['missing_talent_roster'],
      available_features: ['team_management', 'scheduling'],
      role_template_count: 2,
      team_assignment_count: 3,
      location_count: 4,
      talent_count: 0,
      calculated_at: '2024-01-01T00:00:00Z'
    }

    it('should successfully invalidate readiness and return updated data', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          }))
        }))
      })

      mockSupabase.rpc.mockResolvedValue({
        data: [mockReadinessData],
        error: null
      })

      const requestBody = {
        reason: 'team_assignment_change',
        optimistic_state: {
          status: 'ready_for_activation',
          features: {
            scheduling: true
          }
        }
      }

      const request = new NextRequest('http://localhost:3000/api/projects/project-123/readiness/invalidate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data).toMatchObject({
        readiness: {
          status: 'ready_for_activation',
          features: {
            team_management: true,
            talent_tracking: false,
            scheduling: true,
            time_tracking: false
          },
          blocking_issues: ['missing_talent_roster'],
          available_features: ['team_management', 'scheduling'],
          counts: {
            role_templates: 2,
            team_assignments: 3,
            locations: 4,
            talent: 0
          }
        },
        reason: 'team_assignment_change',
        optimistic_state: requestBody.optimistic_state
      })

      // Verify readiness data was fetched
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_project_readiness', { p_project_id: 'project-123' })
    })

    it('should handle RPC errors gracefully', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          }))
        }))
      })

      // Mock RPC call failure
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC call failed' }
      })

      const requestBody = {
        reason: 'role_template_change'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/project-123/readiness/invalidate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const responseData = await response.json()

      // Should return error when RPC fails
      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to fetch updated readiness')
      expect(responseData.code).toBe('READINESS_FETCH_ERROR')
    })

    it('should return 400 for invalid request body', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          }))
        }))
      })

      const invalidRequestBody = {
        reason: 'invalid_reason', // Invalid enum value
        optimistic_state: {
          invalid_field: true
        }
      }

      const request = new NextRequest('http://localhost:3000/api/projects/project-123/readiness/invalidate', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Validation failed')
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.details).toBeDefined()
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const requestBody = {
        reason: 'team_assignment_change'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/project-123/readiness/invalidate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
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

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          }))
        }))
      })

      const requestBody = {
        reason: 'team_assignment_change'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/nonexistent/readiness/invalidate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await POST(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Project not found')
      expect(responseData.code).toBe('PROJECT_NOT_FOUND')
    })

    it('should return 404 when readiness data is not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockProject,
              error: null
            })
          }))
        }))
      })

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      })

      const requestBody = {
        reason: 'team_assignment_change'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/project-123/readiness/invalidate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Readiness data not found')
      expect(responseData.code).toBe('READINESS_NOT_FOUND')
    })

    it('should return 400 for invalid project ID', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const requestBody = {
        reason: 'team_assignment_change'
      }

      const request = new NextRequest('http://localhost:3000/api/projects//readiness/invalidate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: '' })

      const response = await POST(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid project ID')
      expect(responseData.code).toBe('INVALID_PROJECT_ID')
    })
  })

  describe('Other HTTP Methods', () => {
    it('should return 405 for GET requests', async () => {
      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(405)
      expect(responseData.error).toBe('Method not allowed. Use POST to invalidate readiness.')
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      const requestBody = {
        reason: 'team_assignment_change'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/project-123/readiness/invalidate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
      expect(responseData.code).toBe('INTERNAL_ERROR')
      expect(responseData.details).toBe('Database connection failed')
    })

    it('should handle JSON parsing errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/projects/project-123/readiness/invalidate', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
      expect(responseData.code).toBe('INTERNAL_ERROR')
    })
  })
})