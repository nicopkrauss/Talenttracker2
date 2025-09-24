import { renderHook, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTimeTracking } from '../use-time-tracking'
import { useAuth } from '@/lib/auth-context'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Mock dependencies
vi.mock('@/lib/auth-context')
vi.mock('@supabase/auth-helpers-nextjs')

const mockUseAuth = vi.mocked(useAuth)
const mockCreateClient = vi.mocked(createClientComponentClient)

// Mock Supabase client methods
const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockUpdateSingle = vi.fn()
const mockInsertSingle = vi.fn()

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
              single: mockSingle
            }))
          }))
        }))
      })),
      single: mockSingle
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockUpdateSingle
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: mockInsertSingle
      }))
    }))
  }))
}

// Mock user profile
const mockUserProfile = {
  id: 'user-123',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'talent_escort' as const,
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Mock global settings
const mockGlobalSettings = {
  id: 'settings-123',
  default_escort_break_minutes: 30,
  default_staff_break_minutes: 60,
  max_hours_before_stop: 20,
  overtime_warning_hours: 12,
  timecard_reminder_frequency_days: 1,
  submission_opens_on_show_day: true
}

// Mock timecard record
const createMockTimecard = (overrides = {}) => ({
  id: 'timecard-123',
  user_id: 'user-123',
  project_id: 'project-123',
  date: '2024-01-15',
  check_in_time: null,
  check_out_time: null,
  break_start_time: null,
  break_end_time: null,
  total_hours: 0,
  break_duration: 0,
  pay_rate: 25.00,
  total_pay: 0,
  status: 'draft' as const,
  manually_edited: false,
  edit_comments: null,
  submitted_at: null,
  approved_at: null,
  approved_by: null,
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2024-01-15T08:00:00Z',
  ...overrides
})

describe('useTimeTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))

    // Reset mock functions
    mockMaybeSingle.mockReset()
    mockSingle.mockReset()
    mockUpdateSingle.mockReset()
    mockInsertSingle.mockReset()

    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      userProfile: mockUserProfile,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn()
    })

    mockCreateClient.mockReturnValue(mockSupabase as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial State', () => {
    it('should initialize with checked_out state when no timecard exists', async () => {
      // Mock no existing timecard
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null
      })

      // Mock global settings
      mockSingle.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort',
          scheduledStartTime: '9:00 AM'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('checked_out')
        expect(result.current.currentState.nextAction).toBe('check_in')
        expect(result.current.contextInfo).toContain('Shift starts at 9:00 AM')
      })
    })

    it('should derive state from existing timecard record', async () => {
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z'
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('checked_in')
        expect(result.current.currentState.nextAction).toBe('start_break')
      })
    })
  })

  describe('Check In Flow', () => {
    it('should check in successfully', async () => {
      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const updatedTimecard = createMockTimecard({
        check_in_time: '2024-01-15T10:00:00Z'
      })

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: updatedTimecard,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('checked_out')
      })

      await act(async () => {
        await result.current.checkIn()
      })

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          check_in_time: '2024-01-15T10:00:00.000Z'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('checked_in')
        expect(result.current.currentState.nextAction).toBe('start_break')
      })
    })

    it('should not allow check in when already checked in', async () => {
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z'
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('checked_in')
      })

      await act(async () => {
        await result.current.checkIn()
      })

      // Should not call insert or update since already checked in
      expect(mockSupabase.from().insert).not.toHaveBeenCalled()
      expect(mockSupabase.from().update).not.toHaveBeenCalled()
    })
  })

  describe('Break Flow', () => {
    it('should start break successfully', async () => {
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z'
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const updatedTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z',
        break_start_time: '2024-01-15T10:00:00Z'
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedTimecard,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('checked_in')
      })

      await act(async () => {
        await result.current.startBreak()
      })

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          break_start_time: '2024-01-15T10:00:00.000Z'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('on_break')
        expect(result.current.currentState.nextAction).toBe('end_break')
      })
    })

    it('should enforce break duration for escorts (30 minutes)', async () => {
      const breakStartTime = '2024-01-15T10:00:00Z'
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z',
        break_start_time: breakStartTime
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      // Set current time to 20 minutes after break start (before minimum)
      vi.setSystemTime(new Date('2024-01-15T10:20:00Z'))

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('on_break')
        expect(result.current.currentState.canEndBreak).toBe(false)
        expect(result.current.contextInfo).toContain('10 min remaining')
      })

      // Move time to after minimum break duration
      vi.setSystemTime(new Date('2024-01-15T10:35:00Z'))

      await act(async () => {
        await result.current.refreshState()
      })

      await waitFor(() => {
        expect(result.current.currentState.canEndBreak).toBe(true)
        expect(result.current.contextInfo).toContain('30 min minimum met')
      })
    })

    it('should enforce break duration for staff (60 minutes)', async () => {
      const breakStartTime = '2024-01-15T10:00:00Z'
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z',
        break_start_time: breakStartTime
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      // Set current time to 30 minutes after break start (before minimum for staff)
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'))

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'supervisor' // Staff role
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('on_break')
        expect(result.current.currentState.canEndBreak).toBe(false)
        expect(result.current.contextInfo).toContain('30 min remaining')
      })
    })

    it('should apply grace period logic when ending break', async () => {
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z',
        break_start_time: '2024-01-15T10:00:00Z'
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      // Set time to 3 minutes after minimum (within 5-minute grace period)
      vi.setSystemTime(new Date('2024-01-15T10:33:00Z'))

      const updatedTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z',
        break_start_time: '2024-01-15T10:00:00Z',
        break_end_time: '2024-01-15T10:30:00Z' // Should use exact minimum
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedTimecard,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('on_break')
      })

      await act(async () => {
        await result.current.endBreak()
      })

      // Should use exact minimum time (10:30) due to grace period
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          break_end_time: '2024-01-15T10:30:00.000Z'
        })
      )
    })
  })

  describe('Role-Specific Behavior', () => {
    it('should complete workflow for escorts after break', async () => {
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z',
        break_start_time: '2024-01-15T10:00:00Z',
        break_end_time: '2024-01-15T10:30:00Z'
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('break_ended')
        expect(result.current.currentState.nextAction).toBe('complete')
        expect(result.current.contextInfo).toContain('checkout handled by supervisor')
      })
    })

    it('should allow checkout for supervisors after break', async () => {
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-15T09:00:00Z',
        break_start_time: '2024-01-15T10:00:00Z',
        break_end_time: '2024-01-15T11:00:00Z'
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'supervisor'
        })
      )

      await waitFor(() => {
        expect(result.current.currentState.status).toBe('break_ended')
        expect(result.current.currentState.nextAction).toBe('check_out')
        expect(result.current.contextInfo).toContain('Expected check out')
      })
    })
  })

  describe('Overtime Monitoring', () => {
    it('should detect overtime after 12 hours', async () => {
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-14T22:00:00Z' // 12 hours before current time
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.isOvertime).toBe(true)
        expect(result.current.shiftDuration).toBe(12)
      })
    })

    it('should trigger automatic checkout at 20-hour limit', async () => {
      const mockOnShiftLimitExceeded = vi.fn()
      
      const existingTimecard = createMockTimecard({
        check_in_time: '2024-01-14T14:00:00Z' // 20 hours before current time
      })

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: existingTimecard,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const updatedTimecard = createMockTimecard({
        check_in_time: '2024-01-14T14:00:00Z',
        check_out_time: '2024-01-15T10:00:00Z'
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedTimecard,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort',
          onShiftLimitExceeded: mockOnShiftLimitExceeded
        })
      )

      await waitFor(() => {
        expect(result.current.shiftDuration).toBe(20)
      })

      // Fast-forward timer to trigger monitoring
      await act(async () => {
        vi.advanceTimersByTime(60000) // 1 minute
      })

      await waitFor(() => {
        expect(mockOnShiftLimitExceeded).toHaveBeenCalled()
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining({
            check_out_time: expect.any(String)
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockRejectedValue(
        new Error('Database connection failed')
      )

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load timecard data')
      })
    })

    it('should handle missing global settings', async () => {
      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' }
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort'
        })
      )

      await waitFor(() => {
        // Should use default settings
        expect(result.current.currentState.status).toBe('checked_out')
      })
    })
  })

  describe('State Change Callbacks', () => {
    it('should call onStateChange when state updates', async () => {
      const mockOnStateChange = vi.fn()

      mockSupabase.from().select().eq().eq().eq().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      })

      mockSupabase.from().select().single.mockResolvedValue({
        data: mockGlobalSettings,
        error: null
      })

      const { result } = renderHook(() =>
        useTimeTracking({
          projectId: 'project-123',
          userRole: 'talent_escort',
          onStateChange: mockOnStateChange
        })
      )

      await waitFor(() => {
        expect(mockOnStateChange).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'checked_out',
            nextAction: 'check_in'
          })
        )
      })
    })
  })
})