import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(),
      })),
      order: vi.fn(),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
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

describe('/api/projects/[id]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return project attachments', async () => {
      const mockAttachments = [
        {
          id: 'attachment-1',
          name: 'project_contract.pdf',
          type: 'file',
          content: null,
          file_url: 'https://example.com/file.pdf',
          file_size: 1024000,
          mime_type: 'application/pdf',
          created_at: '2024-01-15T10:30:00Z',
          created_by_user: {
            id: 'user-1',
            full_name: 'John Doe',
          },
        },
        {
          id: 'attachment-2',
          name: 'Note - 1/15/2024',
          type: 'note',
          content: 'Remember to check catering requirements',
          file_url: null,
          file_size: null,
          mime_type: null,
          created_at: '2024-01-15T11:00:00Z',
          created_by_user: {
            id: 'user-2',
            full_name: 'Jane Smith',
          },
        },
      ]

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

      // Mock attachments
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockAttachments,
              error: null,
            }),
          })),
        })),
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/attachments')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockAttachments)
    })

    it('should return empty array when no attachments exist', async () => {
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

      // Mock empty attachments
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          })),
        })),
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/attachments')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
    })
  })

  describe('POST', () => {
    it('should create a note attachment successfully', async () => {
      const noteData = {
        name: 'Important Note',
        type: 'note' as const,
        content: 'This is an important note about the project',
      }

      const mockCreatedAttachment = {
        id: 'attachment-1',
        name: noteData.name,
        type: noteData.type,
        content: noteData.content,
        file_url: null,
        file_size: null,
        mime_type: null,
        created_at: '2024-01-15T10:30:00Z',
        created_by_user: {
          id: 'user-1',
          full_name: 'John Doe',
        },
      }

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

      // Mock attachment creation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedAttachment,
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

      const request = new NextRequest('http://localhost/api/projects/project-1/attachments', {
        method: 'POST',
        body: JSON.stringify(noteData),
      })
      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockCreatedAttachment)
    })

    it('should create a file attachment successfully', async () => {
      const fileData = {
        name: 'contract.pdf',
        type: 'file' as const,
        fileUrl: 'https://example.com/contract.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
      }

      const mockCreatedAttachment = {
        id: 'attachment-1',
        name: fileData.name,
        type: fileData.type,
        content: null,
        file_url: fileData.fileUrl,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        created_at: '2024-01-15T10:30:00Z',
        created_by_user: {
          id: 'user-1',
          full_name: 'John Doe',
        },
      }

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

      // Mock attachment creation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedAttachment,
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

      const request = new NextRequest('http://localhost/api/projects/project-1/attachments', {
        method: 'POST',
        body: JSON.stringify(fileData),
      })
      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockCreatedAttachment)
    })

    it('should return 400 for invalid attachment data', async () => {
      const invalidData = {
        name: '', // Empty name
        type: 'invalid',
      }

      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/attachments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })
      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/attachments', {
        method: 'POST',
        body: JSON.stringify({ name: 'test', type: 'note', content: 'test' }),
      })
      const response = await POST(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})