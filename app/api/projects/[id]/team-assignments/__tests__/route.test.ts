import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          // Return this for chaining
        }))
      })),
      not: vi.fn(() => ({
        order: vi.fn()
      })),
      order: vi.fn()
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}))

describe('/api/projects/[id]/team-assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = new NextRequest('http://localhost/api/projects/123/team-assignments')
      const response = await GET(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user lacks permissions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'talent_escort' },
              error: null
            })
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn()
            }))
          }))
        }
      })

      const request = new NextRequest('http://localhost/api/projects/123/team-assignments')
      const response = await GET(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should return team assignments for authorized admin user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null
      })

      const mockAssignments = [
        {
          id: 'assignment-1',
          user_id: 'user-1',
          role: 'supervisor',
          pay_rate: 300,
          schedule_notes: 'Day shift',
          created_at: '2024-01-01T00:00:00Z',
          profiles: {
            id: 'user-1',
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '555-0123',
            nearest_major_city: 'Los Angeles, CA',
            willing_to_fly: true
          }
        }
      ]

      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      }

      const mockAssignmentsQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockAssignments,
              error: null
            })
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery
        if (table === 'team_assignments') return mockAssignmentsQuery
        return { select: vi.fn() }
      })

      const request = new NextRequest('http://localhost/api/projects/123/team-assignments')
      const response = await GET(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.assignments).toEqual(mockAssignments)
    })
  })

  describe('POST', () => {
    it('should create team assignment for authorized user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      }

      const mockAssignment = {
        id: 'assignment-1',
        user_id: 'user-1',
        role: 'supervisor',
        pay_rate: 350,
        schedule_notes: null,
        created_at: '2024-01-01T00:00:00Z',
        profiles: {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '555-0123',
          nearest_major_city: 'Los Angeles, CA',
          willing_to_fly: true
        }
      }

      const mockInsertQuery = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockAssignment,
              error: null
            })
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery
        if (table === 'team_assignments') return mockInsertQuery
        return { select: vi.fn() }
      })

      const requestBody = {
        user_id: 'user-1',
        role: 'supervisor',
        pay_rate: 350
      }

      const request = new NextRequest('http://localhost/api/projects/123/team-assignments', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.assignment).toEqual(mockAssignment)
    })

    it('should return 400 for invalid role', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery
        return { select: vi.fn() }
      })

      const requestBody = {
        user_id: 'user-1',
        role: 'invalid_role'
      }

      const request = new NextRequest('http://localhost/api/projects/123/team-assignments', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request, { params: { id: '123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid role')
    })
  })
})