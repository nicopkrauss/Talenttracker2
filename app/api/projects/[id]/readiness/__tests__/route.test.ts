import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

const mockCreateServerClient = vi.fn(() => mockSupabaseClient)

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient
}))

// Mock cookies
const mockCookies = vi.fn()
vi.mock('next/headers', () => ({
  cookies: mockCookies
}))

describe('/api/projects/[id]/readiness', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockProjectReadiness = {
    project_id: 'project-123',
    has_default_locations: true,
    custom_location_count: 2,
    locations_finalized: false,
    locations_status: 'configured',
    has_default_roles: true,
    custom_role_count: 1,
    roles_finalized: false,
    roles_status: 'configured',
    total_staff_assigned: 5,
    supervisor_count: 1,
    escort_count: 3,
    coordinator_count: 1,
    team_finalized: false,
    team_status: 'partial',
    total_talent: 8,
    talent_finalized: false,
    talent_status: 'partial',
    assignments_status: 'partial',
    urgent_assignment_issues: 2,
    overall_status: 'operational',
    last_updated: '2024-01-15T10:00:00Z'
  }

  const mockProject = {
    start_date: '2024-01-15',
    end_date: '2024-01-20'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock cookies
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'mock-cookie' })
    })

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock database queries
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/projects/[id]/readiness', () => {
    it('should return readiness data for valid project', async () => {
      // Mock readiness data exists
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValueOnce({
        data: mockProjectReadiness,
        error: null
      })

      // Mock project data
      mockQuery.single.mockResolvedValueOnce({
        data: mockProject,
        error: null
      })

      // Mock talent and group counts
      mockQuery.single.mockResolvedValue({ data: [], error: null })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.project_id).toBe('project-123')
      expect(data.data.overall_status).toBe('operational')
      expect(data.data.todoItems).toBeDefined()
      expect(data.data.featureAvailability).toBeDefined()
      expect(data.data.assignmentProgress).toBeDefined()
    })

    it('should create readiness record if it does not exist', async () => {
      // Mock readiness data does not exist
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' } // Not found
        })
        .mockResolvedValueOnce({
          data: { ...mockProjectReadiness, project_id: 'project-123' },
          error: null
        })

      // Mock successful insert
      mockQuery.insert.mockResolvedValue({
        data: { ...mockProjectReadiness, project_id: 'project-123' },
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.project_id).toBe('project-123')
      expect(mockQuery.insert).toHaveBeenCalledWith({ project_id: 'project-123' })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should return 400 for invalid project ID', async () => {
      const request = new NextRequest('http://localhost/api/projects/invalid/readiness')
      const params = Promise.resolve({ id: '' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid project ID')
      expect(data.code).toBe('INVALID_PROJECT_ID')
    })

    it('should handle database errors gracefully', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch project readiness')
      expect(data.code).toBe('FETCH_ERROR')
    })

    it('should return cached data when available', async () => {
      // First request - should fetch from database
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockProjectReadiness,
        error: null
      })

      const request1 = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params1 = Promise.resolve({ id: 'project-123' })

      const response1 = await GET(request1, { params: params1 })
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1.cached).toBe(false)

      // Second request - should return cached data
      const request2 = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params2 = Promise.resolve({ id: 'project-123' })

      const response2 = await GET(request2, { params: params2 })
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.cached).toBe(true)
    })

    it('should bypass cache with refresh parameter', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockProjectReadiness,
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness?refresh=true')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cached).toBe(false)
    })

    it('should generate correct todo items based on project state', async () => {
      // Mock project with no staff assigned
      const readinessWithoutStaff = {
        ...mockProjectReadiness,
        total_staff_assigned: 0,
        escort_count: 0,
        supervisor_count: 0
      }

      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: readinessWithoutStaff,
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const todoItems = data.data.todoItems
      expect(todoItems).toBeDefined()
      
      // Should have critical todo for assigning team
      const assignTeamTodo = todoItems.find((item: any) => item.id === 'assign-team')
      expect(assignTeamTodo).toBeDefined()
      expect(assignTeamTodo.priority).toBe('critical')
    })

    it('should calculate feature availability correctly', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockProjectReadiness,
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const featureAvailability = data.data.featureAvailability
      expect(featureAvailability).toBeDefined()
      
      // Time tracking should be available (staff assigned)
      expect(featureAvailability.timeTracking.available).toBe(true)
      
      // Assignments should be available (talent and escorts assigned)
      expect(featureAvailability.assignments.available).toBe(true)
      
      // Supervisor checkout should be available (supervisor and escorts assigned)
      expect(featureAvailability.supervisorCheckout.available).toBe(true)
    })

    it('should calculate assignment progress with project dates', async () => {
      const mockQuery = mockSupabaseClient.from()
      
      // Mock readiness data
      mockQuery.single
        .mockResolvedValueOnce({
          data: mockProjectReadiness,
          error: null
        })
        // Mock project data
        .mockResolvedValueOnce({
          data: mockProject,
          error: null
        })

      // Mock talent and group counts
      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          length: 5 // 5 talent assigned
        })
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const assignmentProgress = data.data.assignmentProgress
      expect(assignmentProgress).toBeDefined()
      expect(assignmentProgress.totalEntities).toBeDefined()
      expect(assignmentProgress.projectDays).toBeDefined()
    })

    it('should handle missing project data gracefully', async () => {
      const mockQuery = mockSupabaseClient.from()
      
      // Mock readiness data exists
      mockQuery.single
        .mockResolvedValueOnce({
          data: mockProjectReadiness,
          error: null
        })
        // Mock project not found
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Project not found')
        })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const assignmentProgress = data.data.assignmentProgress
      expect(assignmentProgress.error).toBe('Project not found')
      expect(assignmentProgress.totalAssignments).toBe(0)
    })

    it('should recalculate metrics when requested', async () => {
      const mockQuery = mockSupabaseClient.from()
      
      // Mock initial readiness data
      mockQuery.single.mockResolvedValueOnce({
        data: mockProjectReadiness,
        error: null
      })

      // Mock updated readiness data after recalculation
      mockQuery.single.mockResolvedValueOnce({
        data: { ...mockProjectReadiness, total_staff_assigned: 6 },
        error: null
      })

      // Mock update operation
      mockQuery.update.mockResolvedValue({
        data: null,
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockQuery.update).toHaveBeenCalled()
    })

    it('should handle recalculation errors gracefully', async () => {
      const mockQuery = mockSupabaseClient.from()
      
      // Mock readiness data exists
      mockQuery.single.mockResolvedValue({
        data: mockProjectReadiness,
        error: null
      })

      // Mock update operation fails
      mockQuery.update.mockResolvedValue({
        data: null,
        error: new Error('Update failed')
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      // Should still return data even if recalculation fails
      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
    })

    it('should handle urgent assignment issues correctly', async () => {
      const readinessWithUrgentIssues = {
        ...mockProjectReadiness,
        urgent_assignment_issues: 5
      }

      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: readinessWithUrgentIssues,
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
      const params = Promise.resolve({ id: 'project-123' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      const todoItems = data.data.todoItems
      const urgentTodo = todoItems.find((item: any) => item.id === 'urgent-assignments')
      
      expect(urgentTodo).toBeDefined()
      expect(urgentTodo.priority).toBe('critical')
      expect(urgentTodo.description).toContain('5 assignments')
    })

    it('should handle different overall status values', async () => {
      const statusTests = [
        { status: 'getting-started', expectedAvailable: false },
        { status: 'operational', expectedAvailable: true },
        { status: 'production-ready', expectedAvailable: true }
      ]

      for (const { status, expectedAvailable } of statusTests) {
        const readinessWithStatus = {
          ...mockProjectReadiness,
          overall_status: status
        }

        const mockQuery = mockSupabaseClient.from()
        mockQuery.single.mockResolvedValue({
          data: readinessWithStatus,
          error: null
        })

        const request = new NextRequest('http://localhost/api/projects/project-123/readiness')
        const params = Promise.resolve({ id: 'project-123' })

        const response = await GET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.featureAvailability.projectOperations.available).toBe(expectedAvailable)
      }
    })
  })
})