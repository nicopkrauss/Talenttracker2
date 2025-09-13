import { NextRequest } from 'next/server'
import { DELETE } from '../route'
import { createServerClient } from '@supabase/ssr'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock Supabase
vi.mock('@supabase/ssr')
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' }))
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
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }))
}

;(createServerClient as any).mockReturnValue(mockSupabase)

describe('/api/projects/[id]/assignments/clear-day DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully clear assignments for a specific date', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock project data
    const mockProject = {
      id: 'project-123',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockProject,
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'talent_daily_assignments' || table === 'group_daily_assignments') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                error: null
              })
            }))
          }))
        }
      }
      
      return mockSupabase.from()
    })

    const request = new NextRequest('http://localhost:3000/api/projects/project-123/assignments/clear-day', {
      method: 'DELETE',
      body: JSON.stringify({ date: '2024-01-15' })
    })

    const params = { id: 'project-123' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe('All escort assignments cleared for 2024-01-15')
    expect(data.data.date).toBe('2024-01-15')
    expect(data.data.projectId).toBe('project-123')
  })

  it('should return 401 for unauthenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const request = new NextRequest('http://localhost:3000/api/projects/project-123/assignments/clear-day', {
      method: 'DELETE',
      body: JSON.stringify({ date: '2024-01-15' })
    })

    const params = { id: 'project-123' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(data.code).toBe('UNAUTHORIZED')
  })

  it('should return 400 for invalid date format', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/projects/project-123/assignments/clear-day', {
      method: 'DELETE',
      body: JSON.stringify({ date: 'invalid-date' })
    })

    const params = { id: 'project-123' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should return 404 for non-existent project', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Project not found')
              })
            }))
          }))
        }
      }
      return mockSupabase.from()
    })

    const request = new NextRequest('http://localhost:3000/api/projects/nonexistent/assignments/clear-day', {
      method: 'DELETE',
      body: JSON.stringify({ date: '2024-01-15' })
    })

    const params = { id: 'nonexistent' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Project not found')
    expect(data.code).toBe('PROJECT_NOT_FOUND')
  })

  it('should return 400 for date outside project range', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockProject = {
      id: 'project-123',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockProject,
                error: null
              })
            }))
          }))
        }
      }
      return mockSupabase.from()
    })

    const request = new NextRequest('http://localhost:3000/api/projects/project-123/assignments/clear-day', {
      method: 'DELETE',
      body: JSON.stringify({ date: '2024-02-15' }) // Outside project range
    })

    const params = { id: 'project-123' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Date is outside project range')
    expect(data.code).toBe('DATE_OUT_OF_RANGE')
  })

  it('should handle database errors when deleting talent assignments', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockProject = {
      id: 'project-123',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockProject,
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'talent_daily_assignments') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                error: new Error('Database error')
              })
            }))
          }))
        }
      }
      
      return mockSupabase.from()
    })

    const request = new NextRequest('http://localhost:3000/api/projects/project-123/assignments/clear-day', {
      method: 'DELETE',
      body: JSON.stringify({ date: '2024-01-15' })
    })

    const params = { id: 'project-123' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to clear talent assignments')
    expect(data.code).toBe('DATABASE_ERROR')
  })

  it('should handle database errors when deleting group assignments', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const mockProject = {
      id: 'project-123',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockProject,
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'talent_daily_assignments') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'group_daily_assignments') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                error: new Error('Database error')
              })
            }))
          }))
        }
      }
      
      return mockSupabase.from()
    })

    const request = new NextRequest('http://localhost:3000/api/projects/project-123/assignments/clear-day', {
      method: 'DELETE',
      body: JSON.stringify({ date: '2024-01-15' })
    })

    const params = { id: 'project-123' }
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to clear group assignments')
    expect(data.code).toBe('DATABASE_ERROR')
  })
})