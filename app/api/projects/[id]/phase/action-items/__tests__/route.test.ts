import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { ProjectPhase } from '@/lib/types/project-phase'

// Mock the dependencies
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({ data: { user: { id: 'test-user' } }, error: null }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockProject, error: null }))
        }))
      }))
    }))
  }))
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'test-cookie' }))
  }))
}))

// Mock the PhaseActionItemsService
vi.mock('@/lib/services/phase-action-items-service', () => ({
  PhaseActionItemsService: vi.fn(() => ({
    getActionItems: vi.fn(() => Promise.resolve(mockActionItemsResult)),
    markItemCompleted: vi.fn(() => Promise.resolve())
  }))
}))

const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  status: 'prep'
}

const mockActionItemsResult = {
  phaseItems: [
    {
      id: 'prep-roles',
      title: 'Add Project Roles & Pay Rates',
      description: 'Define all roles needed for this project',
      category: 'setup',
      priority: 'high',
      completed: false,
      requiredForTransition: true
    }
  ],
  readinessItems: [
    {
      id: 'readiness-assign-team',
      title: 'Assign team members',
      description: 'No staff assigned to this project',
      category: 'setup',
      priority: 'high',
      completed: false,
      requiredForTransition: true
    }
  ],
  combinedItems: [
    {
      id: 'prep-roles',
      title: 'Add Project Roles & Pay Rates',
      description: 'Define all roles needed for this project',
      category: 'setup',
      priority: 'high',
      completed: false,
      requiredForTransition: true
    },
    {
      id: 'readiness-assign-team',
      title: 'Assign team members',
      description: 'No staff assigned to this project',
      category: 'setup',
      priority: 'high',
      completed: false,
      requiredForTransition: true
    }
  ],
  summary: {
    total: 2,
    completed: 0,
    pending: 2,
    required: 2,
    byPhase: { prep: 2 },
    byPriority: { high: 2, medium: 0, low: 0 },
    byCategory: { setup: 2 }
  }
}

describe('/api/projects/[id]/phase/action-items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return action items for a project', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.projectId).toBe('test-project-id')
      expect(data.data.projectName).toBe('Test Project')
      expect(data.data.currentPhase).toBe('prep')
      expect(data.data.actionItems).toHaveLength(2)
      expect(data.data.phaseItems).toHaveLength(1)
      expect(data.data.readinessItems).toHaveLength(1)
      expect(data.data.summary).toBeDefined()
    })

    it('should handle phase parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items?phase=staffing')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.requestedPhase).toBe('staffing')
    })

    it('should handle category filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items?category=setup')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.filters.category).toBe('setup')
    })

    it('should handle priority filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items?priority=high')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.filters.priority).toBe('high')
    })

    it('should handle required filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items?required=true')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.filters.requiredOnly).toBe(true)
    })

    it('should handle includeReadiness parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items?includeReadiness=false')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.filters.includeReadiness).toBe(false)
    })

    it('should include metadata about integration', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.metadata).toBeDefined()
      expect(data.data.metadata.integrationEnabled).toBe(true)
      expect(data.data.metadata.phaseItemCount).toBe(1)
      expect(data.data.metadata.readinessItemCount).toBe(1)
      expect(data.data.metadata.totalItemCount).toBe(2)
    })

    it('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      const mockSupabase = {
        auth: {
          getUser: vi.fn(() => ({ data: { user: null }, error: new Error('Not authenticated') }))
        }
      }
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase)

      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent project', async () => {
      // Mock project not found
      const mockSupabase = {
        auth: {
          getUser: vi.fn(() => ({ data: { user: { id: 'test-user' } }, error: null }))
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: new Error('Not found') }))
            }))
          }))
        }))
      }
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase)

      const request = new NextRequest('http://localhost:3000/api/projects/invalid-id/phase/action-items')
      const params = Promise.resolve({ id: 'invalid-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Project not found')
    })
  })

  describe('POST', () => {
    it('should mark an action item as completed', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items', {
        method: 'POST',
        body: JSON.stringify({
          itemId: 'test-item-id',
          action: 'complete'
        })
      })
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      expect(data.data.projectId).toBe('test-project-id')
      expect(data.data.itemId).toBe('test-item-id')
      expect(data.data.action).toBe('complete')
    })

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items', {
        method: 'POST',
        body: JSON.stringify({
          itemId: 'test-item-id'
          // missing action
        })
      })
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      const mockSupabase = {
        auth: {
          getUser: vi.fn(() => ({ data: { user: null }, error: new Error('Not authenticated') }))
        }
      }
      
      vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase)

      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items', {
        method: 'POST',
        body: JSON.stringify({
          itemId: 'test-item-id',
          action: 'complete'
        })
      })
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock service error
      const mockService = {
        getActionItems: vi.fn(() => Promise.reject(new Error('Service error')))
      }
      
      vi.mocked(require('@/lib/services/phase-action-items-service').PhaseActionItemsService).mockImplementation(() => mockService)

      const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/phase/action-items')
      const params = Promise.resolve({ id: 'test-project-id' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.details).toBe('Service error')
    })
  })
})