import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock dependencies
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))

vi.mock('@/lib/services/phase-engine', () => ({
  PhaseEngine: vi.fn()
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
  }))
}

const mockPhaseEngine = {
  getCurrentPhase: vi.fn(),
  evaluateTransition: vi.fn()
}

describe('/api/projects/[id]/phase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    const { createServerClient } = require('@supabase/ssr')
    const { cookies } = require('next/headers')
    const { PhaseEngine } = require('@/lib/services/phase-engine')
    
    vi.mocked(createServerClient).mockReturnValue(mockSupabase)
    cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: 'mock-session' }))
    })
    vi.mocked(PhaseEngine).mockImplementation(() => mockPhaseEngine)
  })

  describe('GET', () => {
    it('should return current phase for authenticated user with project access', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock project exists
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', status: 'prep', created_by: 'user-1' },
              error: null
            })
          }))
        }))
      })

      // Mock user profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      })

      // Mock phase engine responses
      mockPhaseEngine.getCurrentPhase.mockResolvedValue('prep')
      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: 'staffing',
        blockers: [],
        scheduledAt: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual({
        projectId: 'project-1',
        currentPhase: 'prep',
        transitionResult: {
          canTransition: true,
          targetPhase: 'staffing',
          blockers: [],
          scheduledAt: null
        },
        lastUpdated: expect.any(String)
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should return 404 for non-existent project', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Project not found' }
            })
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/nonexistent/phase')
      const response = await GET(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Project not found')
      expect(data.code).toBe('PROJECT_NOT_FOUND')
    })

    it('should return 403 for user without project access', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-2', email: 'test@example.com' } },
        error: null
      })

      // Mock project exists but user is not creator
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', status: 'prep', created_by: 'user-1' },
              error: null
            })
          }))
        }))
      })

      // Mock user profile (not admin)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: null },
              error: null
            })
          }))
        }))
      })

      // Mock no team assignment
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
      expect(data.code).toBe('ACCESS_DENIED')
    })

    it('should handle phase engine errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', status: 'prep', created_by: 'user-1' },
              error: null
            })
          }))
        }))
      })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      })

      mockPhaseEngine.getCurrentPhase.mockRejectedValue(new Error('Phase engine error'))

      const request = new NextRequest('http://localhost/api/projects/project-1/phase')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.code).toBe('INTERNAL_ERROR')
    })
  })
})