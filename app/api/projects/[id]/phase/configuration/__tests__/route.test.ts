import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      order: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
    upsert: vi.fn(),
    insert: vi.fn(),
  })),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
  })),
}))

describe('/api/projects/[id]/phase/configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return phase configuration for authorized user', async () => {
      const mockUser = { id: 'user-1' }
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        location: 'New York, NY',
        auto_transitions_enabled: true,
        timezone: 'America/New_York',
        phase_updated_at: '2024-03-01T10:00:00Z'
      }
      const mockSettings = {
        auto_transitions_enabled: true,
        archive_month: 4,
        archive_day: 1,
        post_show_transition_hour: 6
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockSettings, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/configuration')
      const params = Promise.resolve({ id: 'project-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual({
        currentPhase: 'prep',
        phaseUpdatedAt: '2024-03-01T10:00:00Z',
        autoTransitionsEnabled: true,
        location: 'New York, NY',
        timezone: 'America/New_York',
        rehearsalStartDate: null,
        showEndDate: null,
        archiveMonth: 4,
        archiveDay: 1,
        postShowTransitionHour: 6
      })
    })

    it('should return default configuration when settings not found', async () => {
      const mockUser = { id: 'user-1' }
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        location: null,
        auto_transitions_enabled: null,
        timezone: null,
        phase_updated_at: '2024-03-01T10:00:00Z'
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/configuration')
      const params = Promise.resolve({ id: 'project-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual({
        currentPhase: 'prep',
        phaseUpdatedAt: '2024-03-01T10:00:00Z',
        autoTransitionsEnabled: true,
        location: null,
        timezone: null,
        rehearsalStartDate: null,
        showEndDate: null,
        archiveMonth: 4,
        archiveDay: 1,
        postShowTransitionHour: 6
      })
    })

    it('should return 401 for unauthorized user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/configuration')
      const params = Promise.resolve({ id: 'project-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent project', async () => {
      const mockUser = { id: 'user-1' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/configuration')
      const params = Promise.resolve({ id: 'project-1' })
      
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Project not found')
    })
  })

  describe('PUT', () => {
    it('should update phase configuration for admin user', async () => {
      const mockUser = { id: 'admin-1' }
      const mockProfile = { role: 'admin' }
      const mockProject = { id: 'project-1', name: 'Test Project', status: 'prep' }
      const updateData = {
        autoTransitionsEnabled: false,
        archiveMonth: 6,
        archiveDay: 15,
        postShowTransitionHour: 8,
        location: 'Los Angeles, CA',
        timezone: 'America/Los_Angeles'
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      }).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null })
      }).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { 
                ...mockProject, 
                location: 'Los Angeles, CA',
                auto_transitions_enabled: false,
                timezone: 'America/Los_Angeles'
              }, 
              error: null 
            })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: {
                auto_transitions_enabled: false,
                archive_month: 6,
                archive_day: 15,
                post_show_transition_hour: 8
              }, 
              error: null 
            })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: [], error: null })
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/configuration', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      const params = Promise.resolve({ id: 'project-1' })
      
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.autoTransitionsEnabled).toBe(false)
      expect(data.data.location).toBe('Los Angeles, CA')
      expect(data.data.timezone).toBe('America/Los_Angeles')
      expect(data.data.archiveMonth).toBe(6)
    })

    it('should return 403 for non-admin user', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = { role: 'talent_escort' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/configuration', {
        method: 'PUT',
        body: JSON.stringify({ autoTransitionsEnabled: false })
      })
      const params = Promise.resolve({ id: 'project-1' })
      
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should validate archive date combination', async () => {
      const mockUser = { id: 'admin-1' }
      const mockProfile = { role: 'admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/configuration', {
        method: 'PUT',
        body: JSON.stringify({ 
          archiveMonth: 2, 
          archiveDay: 31 // Invalid: February 31st
        })
      })
      const params = Promise.resolve({ id: 'project-1' })
      
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid archive date combination')
    })

    it('should validate timezone format', async () => {
      const mockUser = { id: 'admin-1' }
      const mockProfile = { role: 'admin' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          }))
        }))
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/phase/configuration', {
        method: 'PUT',
        body: JSON.stringify({ 
          timezone: 'Invalid/Timezone'
        })
      })
      const params = Promise.resolve({ id: 'project-1' })
      
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid timezone')
    })


  })
})