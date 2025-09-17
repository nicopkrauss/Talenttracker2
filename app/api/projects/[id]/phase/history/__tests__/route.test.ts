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

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          order: vi.fn()
        }))
      }))
    }))
  }))
}

describe('/api/projects/[id]/phase/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    const { createServerClient } = require('@supabase/ssr')
    const { cookies } = require('next/headers')
    
    vi.mocked(createServerClient).mockReturnValue(mockSupabase)
    cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: 'mock-session' }))
    })
  })

  describe('GET', () => {
    it('should return phase transition history for authorized user', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      // Mock project exists and user is creator
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', created_by: 'user-1' },
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

      // Mock audit log history
      const mockHistory = [
        {
          id: 'log-1',
          action_type: 'phase_transition',
          old_values: { status: 'prep' },
          new_values: { status: 'staffing' },
          metadata: { 
            trigger: 'manual',
            reason: 'Setup completed'
          },
          created_at: '2024-01-15T10:00:00Z',
          user_id: 'user-1',
          user: { full_name: 'Test User', email: 'test@example.com' }
        },
        {
          id: 'log-2',
          action_type: 'phase_transition',
          old_values: { status: 'staffing' },
          new_values: { status: 'active' },
          metadata: { 
            trigger: 'automatic',
            reason: 'Rehearsal start time reached'
          },
          created_at: '2024-01-20T00:00:00Z',
          user_id: 'system',
          user: { full_name: 'System', email: null }
        }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/history')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual({
        projectId: 'project-1',
        history: [
          {
            id: 'log-1',
            transitionedAt: '2024-01-15T10:00:00Z',
            transitionedBy: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com'
            },
            fromPhase: 'prep',
            toPhase: 'staffing',
            trigger: 'manual',
            reason: 'Setup completed',
            metadata: {
              trigger: 'manual',
              reason: 'Setup completed'
            }
          },
          {
            id: 'log-2',
            transitionedAt: '2024-01-20T00:00:00Z',
            transitionedBy: {
              id: 'system',
              name: 'System',
              email: null
            },
            fromPhase: 'staffing',
            toPhase: 'active',
            trigger: 'automatic',
            reason: 'Rehearsal start time reached',
            metadata: {
              trigger: 'automatic',
              reason: 'Rehearsal start time reached'
            }
          }
        ],
        totalTransitions: 2
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/history')
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

      const request = new NextRequest('http://localhost/api/projects/nonexistent/phase/history')
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
              data: { id: 'project-1', name: 'Test Project', created_by: 'user-1' },
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

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/history')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
      expect(data.code).toBe('ACCESS_DENIED')
    })

    it('should return empty history when no transitions exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', created_by: 'user-1' },
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

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/history')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual({
        projectId: 'project-1',
        history: [],
        totalTransitions: 0
      })
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', created_by: 'user-1' },
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

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/history')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch transition history')
      expect(data.code).toBe('HISTORY_FETCH_ERROR')
    })
  })
})