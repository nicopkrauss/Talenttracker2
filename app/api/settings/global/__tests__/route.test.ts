import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      })),
      in: vi.fn()
    })),
    upsert: vi.fn()
  }))
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient)
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' }))
  }))
}))

describe('/api/settings/global', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for non-admin users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null
      })

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'in_house' },
            error: null
          })
        }))
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden - Admin access required')
    })

    it('should return settings for admin users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null
      })

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        })
        .mockReturnValueOnce({
          single: vi.fn().mockResolvedValue({
            data: {
              id: '00000000-0000-0000-0000-000000000001',
              default_escort_break_minutes: 30,
              default_staff_break_minutes: 60,
              timecard_reminder_frequency_days: 1,
              submission_opens_on_show_day: true,
              max_hours_before_stop: 20,
              overtime_warning_hours: 12,
              archive_date_month: 12,
              archive_date_day: 31,
              post_show_transition_time: '06:00:00',
              in_house_can_approve_timecards: true,
              in_house_can_initiate_checkout: true,
              in_house_can_manage_projects: true,
              supervisor_can_approve_timecards: false,
              supervisor_can_initiate_checkout: true,
              coordinator_can_approve_timecards: false,
              coordinator_can_initiate_checkout: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              updated_by: null
            },
            error: null
          })
        })

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.settings).toBeDefined()
      expect(data.data.permissions).toBeDefined()
      expect(data.data.settings.breakDurations.defaultEscortMinutes).toBe(30)
      expect(data.data.settings.breakDurations.defaultStaffMinutes).toBe(60)
    })
  })

  describe('PUT', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = new NextRequest('http://localhost/api/settings/global', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {},
          permissions: {}
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid request body', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null
      })

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null
          })
        }))
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      })

      const request = new NextRequest('http://localhost/api/settings/global', {
        method: 'PUT',
        body: JSON.stringify({
          settings: null
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing settings or permissions data')
    })

    it('should successfully update settings for admin users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null
      })

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null
          })
        }))
      }))

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      })

      const testSettings = {
        breakDurations: {
          defaultEscortMinutes: 45,
          defaultStaffMinutes: 90
        },
        timecardNotifications: {
          reminderFrequencyDays: 2,
          submissionOpensOnShowDay: false
        },
        shiftLimits: {
          maxHoursBeforeStop: 18,
          overtimeWarningHours: 10
        },
        systemSettings: {
          archiveDate: {
            month: 6,
            day: 15
          },
          postShowTransitionTime: "07:00"
        }
      }

      const testPermissions = {
        inHouse: {
          canApproveTimecards: false,
          canInitiateCheckout: true,
          canManageProjects: false
        },
        supervisor: {
          canApproveTimecards: true,
          canInitiateCheckout: true
        },
        coordinator: {
          canApproveTimecards: false,
          canInitiateCheckout: false
        }
      }

      const request = new NextRequest('http://localhost/api/settings/global', {
        method: 'PUT',
        body: JSON.stringify({
          settings: testSettings,
          permissions: testPermissions
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Global settings updated successfully')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })
  })
})