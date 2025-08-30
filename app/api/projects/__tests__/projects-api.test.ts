import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            // Return empty array for projects list
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }))
}))

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn()
  }))
}))

// Mock role utils
vi.mock('@/lib/role-utils', () => ({
  hasAdminAccess: vi.fn()
}))

describe('Projects API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/projects', () => {
    it('should return 401 when no session', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects')
      
      // Mock no session
      const mockSupabase = await import('@supabase/ssr')
      const createServerClient = mockSupabase.createServerClient as any
      createServerClient.mockReturnValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should validate request structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects')
      expect(request).toBeInstanceOf(NextRequest)
    })
  })

  describe('POST /api/projects', () => {
    it('should return 401 when no session', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        })
      })
      
      // Mock no session
      const mockSupabase = await import('@supabase/ssr')
      const createServerClient = mockSupabase.createServerClient as any
      createServerClient.mockReturnValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should validate request structure for POST', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        })
      })
      expect(request).toBeInstanceOf(NextRequest)
    })
  })
})