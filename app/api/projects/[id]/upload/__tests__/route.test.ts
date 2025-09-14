import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    })),
  },
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
  })),
}))

describe('/api/projects/[id]/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should upload file successfully', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      // Mock project exists
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', created_by: 'user-1' },
              error: null,
            }),
          })),
        })),
      })

      // Mock storage upload
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'project-1/123456_test.pdf' },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.pdf' },
        }),
        remove: vi.fn(),
      })

      // Mock database insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'attachment-1',
                name: 'test.pdf',
                type: 'file',
                file_url: 'https://example.com/file.pdf',
                file_size: 1024,
                mime_type: 'application/pdf',
                created_by_user: {
                  id: 'user-1',
                  full_name: 'John Doe',
                },
              },
              error: null,
            }),
          })),
        })),
      })

      // Mock audit log insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      // Create form data with file
      const formData = new FormData()
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost/api/projects/project-1/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('File uploaded successfully')
      expect(data.data.name).toBe('test.pdf')
    })

    it('should reject files that are too large', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      // Mock project exists
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', created_by: 'user-1' },
              error: null,
            }),
          })),
        })),
      })

      // Create form data with large file
      const formData = new FormData()
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost/api/projects/project-1/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File too large. Maximum size is 10MB')
      expect(data.code).toBe('FILE_TOO_LARGE')
    })

    it('should reject invalid file types', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      // Mock project exists
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', created_by: 'user-1' },
              error: null,
            }),
          })),
        })),
      })

      // Create form data with invalid file type
      const formData = new FormData()
      const file = new File(['test content'], 'test.exe', { type: 'application/x-executable' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost/api/projects/project-1/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File type not allowed')
      expect(data.code).toBe('INVALID_FILE_TYPE')
    })

    it('should return 400 when no file is provided', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      // Mock project exists
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'project-1', created_by: 'user-1' },
              error: null,
            }),
          })),
        })),
      })

      const formData = new FormData()
      // No file added

      const request = new NextRequest('http://localhost/api/projects/project-1/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
      expect(data.code).toBe('NO_FILE')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const formData = new FormData()
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost/api/projects/project-1/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'project-1' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})