import { describe, it, expect, vi, beforeEach } from 'vitest'
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
      })),
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
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

describe('/api/projects/[id]/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return default settings when no settings exist', async () => {
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

      // Mock no settings exist (PGRST116 is "not found" error)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          })),
        })),
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/settings')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual({
        projectId: 'project-1',
        defaultBreakDuration: 30,
        payrollExportFormat: 'csv',
        notificationRules: {
          timecardReminders: true,
          shiftAlerts: true,
          talentArrivalNotifications: false,
          overtimeWarnings: true,
        },
      })
    })

    it('should return existing settings', async () => {
      const mockSettings = {
        project_id: 'project-1',
        default_break_duration: 60,
        payroll_export_format: 'xlsx',
        notification_rules: {
          timecardReminders: false,
          shiftAlerts: true,
          talentArrivalNotifications: true,
          overtimeWarnings: false,
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

      // Mock settings exist
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          })),
        })),
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/settings')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockSettings)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/settings')
      const response = await GET(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('PUT', () => {
    it('should update project settings successfully', async () => {
      const updateData = {
        defaultBreakDuration: 45,
        payrollExportFormat: 'pdf' as const,
        notificationRules: {
          timecardReminders: true,
          shiftAlerts: false,
          talentArrivalNotifications: true,
          overtimeWarnings: true,
        },
      }

      const mockUpdatedSettings = {
        project_id: 'project-1',
        default_break_duration: 45,
        payroll_export_format: 'pdf',
        notification_rules: updateData.notificationRules,
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

      // Mock settings upsert
      mockSupabase.from.mockReturnValueOnce({
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUpdatedSettings,
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

      const request = new NextRequest('http://localhost/api/projects/project-1/settings', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      const response = await PUT(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockUpdatedSettings)
    })

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        defaultBreakDuration: 5, // Too low
        payrollExportFormat: 'invalid',
        notificationRules: {
          timecardReminders: 'not-boolean',
        },
      }

      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/projects/project-1/settings', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
      })
      const response = await PUT(request, { params: { id: 'project-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })
})