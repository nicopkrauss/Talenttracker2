import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

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
  evaluateTransition: vi.fn(),
  executeTransition: vi.fn()
}

describe('/api/projects/[id]/phase/transition', () => {
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

  describe('POST', () => {
    it('should execute valid transition for admin user', async () => {
      // Mock authenticated admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
      })

      // Mock admin profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin', full_name: 'Admin User' },
              error: null
            })
          }))
        }))
      })

      // Mock project exists
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', status: 'prep' },
              error: null
            })
          }))
        }))
      })

      // Mock phase engine responses
      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: 'staffing',
        blockers: []
      })
      mockPhaseEngine.getCurrentPhase
        .mockResolvedValueOnce('prep') // Before transition
        .mockResolvedValueOnce('staffing') // After transition
      mockPhaseEngine.executeTransition.mockResolvedValue(undefined)

      const requestBody = {
        targetPhase: 'staffing',
        reason: 'Manual transition for testing'
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/transition', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual({
        projectId: 'project-1',
        previousPhase: 'prep',
        currentPhase: 'staffing',
        transitionResult: expect.any(Object),
        transitionedAt: expect.any(String),
        transitionedBy: {
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com'
        },
        reason: 'Manual transition for testing',
        forced: false
      })

      expect(mockPhaseEngine.executeTransition).toHaveBeenCalledWith(
        'project-1', 
        'staffing', 
        'manual',
        'admin-1',
        'Manual transition for testing'
      )
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const requestBody = { targetPhase: 'staffing' }
      const request = new NextRequest('http://localhost/api/projects/project-1/phase/transition', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 for non-admin user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
        error: null
      })

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

      const requestBody = { targetPhase: 'staffing' }
      const request = new NextRequest('http://localhost/api/projects/project-1/phase/transition', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required for manual transitions')
      expect(data.code).toBe('ADMIN_REQUIRED')
    })

    it('should return 400 for invalid request body', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
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

      const requestBody = { targetPhase: 'invalid_phase' }
      const request = new NextRequest('http://localhost/api/projects/project-1/phase/transition', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid transition without force', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
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
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', status: 'prep' },
              error: null
            })
          }))
        }))
      })

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: false,
        targetPhase: null,
        blockers: ['Missing required setup']
      })
      mockPhaseEngine.getCurrentPhase.mockResolvedValue('prep')

      const requestBody = { targetPhase: 'active' }
      const request = new NextRequest('http://localhost/api/projects/project-1/phase/transition', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid transition')
      expect(data.code).toBe('INVALID_TRANSITION')
      expect(data.details.blockers).toEqual(['Missing required setup'])
    })

    it('should allow forced transition even when invalid', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
      })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin', full_name: 'Admin User' },
              error: null
            })
          }))
        }))
      })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', name: 'Test Project', status: 'prep' },
              error: null
            })
          }))
        }))
      })

      mockPhaseEngine.getCurrentPhase
        .mockResolvedValueOnce('prep')
        .mockResolvedValueOnce('active')
      mockPhaseEngine.executeTransition.mockResolvedValue(undefined)
      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: false,
        targetPhase: null,
        blockers: []
      })

      const requestBody = {
        targetPhase: 'active',
        force: true,
        reason: 'Emergency activation'
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/transition', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.forced).toBe(true)
      expect(data.data.reason).toBe('Emergency activation')
      expect(mockPhaseEngine.executeTransition).toHaveBeenCalledWith(
        'project-1', 
        'active', 
        'manual',
        'admin-1',
        'Emergency activation'
      )
    })
  })
})