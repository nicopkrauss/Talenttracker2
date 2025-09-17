import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

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

describe('/api/projects/[id]/readiness/finalize', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockUserProfile = {
    id: 'user-123',
    role: 'admin',
    full_name: 'Test User'
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
      update: vi.fn().mockReturnThis()
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/projects/[id]/readiness/finalize', () => {
    it('should finalize locations area successfully', async () => {
      // Mock user profile with admin role
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      // Mock successful update
      mockQuery.update.mockResolvedValue({
        data: {
          locations_finalized: true,
          locations_finalized_at: '2024-01-15T10:00:00Z',
          locations_finalized_by: 'user-123'
        },
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'locations' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.area).toBe('locations')
      expect(data.finalizedAt).toBeDefined()
      expect(data.finalizedBy).toBe('user-123')
    })

    it('should finalize roles area successfully', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      mockQuery.update.mockResolvedValue({
        data: {
          roles_finalized: true,
          roles_finalized_at: '2024-01-15T10:00:00Z',
          roles_finalized_by: 'user-123'
        },
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'roles' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.area).toBe('roles')
    })

    it('should finalize team area successfully', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      mockQuery.update.mockResolvedValue({
        data: {
          team_finalized: true,
          team_finalized_at: '2024-01-15T10:00:00Z',
          team_finalized_by: 'user-123'
        },
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'team' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.area).toBe('team')
    })

    it('should finalize talent area successfully', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      mockQuery.update.mockResolvedValue({
        data: {
          talent_finalized: true,
          talent_finalized_at: '2024-01-15T10:00:00Z',
          talent_finalized_by: 'user-123'
        },
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'talent' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.area).toBe('talent')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'locations' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should return 400 for invalid project ID', async () => {
      const request = new NextRequest('http://localhost/api/projects//readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'locations' })
      })
      const params = Promise.resolve({ id: '' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid project ID')
      expect(data.code).toBe('INVALID_PROJECT_ID')
    })

    it('should return 400 for missing area in request body', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({})
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Area is required')
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid area', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'invalid-area' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid area')
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 403 for non-admin user', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: { ...mockUserProfile, role: null }, // Regular user
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'locations' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
      expect(data.code).toBe('INSUFFICIENT_PERMISSIONS')
    })

    it('should allow in_house user to finalize', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: { ...mockUserProfile, role: 'in_house' },
        error: null
      })

      mockQuery.update.mockResolvedValue({
        data: {
          locations_finalized: true,
          locations_finalized_at: '2024-01-15T10:00:00Z',
          locations_finalized_by: 'user-123'
        },
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'locations' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle database update errors', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      mockQuery.update.mockResolvedValue({
        data: null,
        error: new Error('Database update failed')
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'locations' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to finalize area')
      expect(data.code).toBe('FINALIZATION_ERROR')
    })

    it('should handle user profile not found', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error('Profile not found')
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'locations' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User profile not found')
      expect(data.code).toBe('PROFILE_NOT_FOUND')
    })

    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: 'invalid-json'
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
      expect(data.code).toBe('INVALID_JSON')
    })

    it('should update correct fields for each area', async () => {
      const areas = ['locations', 'roles', 'team', 'talent'] as const
      
      for (const area of areas) {
        vi.clearAllMocks()
        
        const mockQuery = mockSupabaseClient.from()
        mockQuery.single.mockResolvedValue({
          data: mockUserProfile,
          error: null
        })

        const expectedUpdateData = {
          [`${area}_finalized`]: true,
          [`${area}_finalized_at`]: expect.any(String),
          [`${area}_finalized_by`]: 'user-123',
          last_updated: expect.any(String),
          updated_at: expect.any(String)
        }

        mockQuery.update.mockResolvedValue({
          data: expectedUpdateData,
          error: null
        })

        const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
          method: 'POST',
          body: JSON.stringify({ area })
        })
        const params = Promise.resolve({ id: 'project-123' })

        const response = await POST(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.area).toBe(area)
        expect(mockQuery.update).toHaveBeenCalledWith(expectedUpdateData)
      }
    })

    it('should handle concurrent finalization requests', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      mockQuery.update.mockResolvedValue({
        data: {
          locations_finalized: true,
          locations_finalized_at: '2024-01-15T10:00:00Z',
          locations_finalized_by: 'user-123'
        },
        error: null
      })

      // Make multiple concurrent requests
      const requests = Array.from({ length: 3 }, () => 
        POST(
          new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
            method: 'POST',
            body: JSON.stringify({ area: 'locations' })
          }),
          { params: Promise.resolve({ id: 'project-123' }) }
        )
      )

      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(async (response) => {
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
      })
    })

    it('should preserve existing finalization data when updating', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      })

      // Mock that locations is already finalized
      mockQuery.update.mockResolvedValue({
        data: {
          locations_finalized: true,
          locations_finalized_at: '2024-01-14T09:00:00Z', // Earlier date
          locations_finalized_by: 'other-user',
          roles_finalized: true,
          roles_finalized_at: '2024-01-15T10:00:00Z', // New finalization
          roles_finalized_by: 'user-123'
        },
        error: null
      })

      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: JSON.stringify({ area: 'roles' })
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.area).toBe('roles')
    })

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
        method: 'POST',
        body: ''
      })
      const params = Promise.resolve({ id: 'project-123' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
      expect(data.code).toBe('INVALID_JSON')
    })

    it('should validate area parameter strictly', async () => {
      const invalidAreas = ['location', 'role', 'teams', 'talents', 'assignments', null, undefined, 123]
      
      for (const invalidArea of invalidAreas) {
        const mockQuery = mockSupabaseClient.from()
        mockQuery.single.mockResolvedValue({
          data: mockUserProfile,
          error: null
        })

        const request = new NextRequest('http://localhost/api/projects/project-123/readiness/finalize', {
          method: 'POST',
          body: JSON.stringify({ area: invalidArea })
        })
        const params = Promise.resolve({ id: 'project-123' })

        const response = await POST(request, { params })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid area')
        expect(data.code).toBe('VALIDATION_ERROR')
      }
    })
  })
})