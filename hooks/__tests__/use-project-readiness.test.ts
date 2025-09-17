import { renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useProjectReadiness, useFeatureAvailability } from '../use-project-readiness'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock fetch
global.fetch = vi.fn()

const mockFetch = fetch as any

describe('useProjectReadiness', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  const mockReadinessData = {
    project_id: 'test-project-id',
    has_default_locations: true,
    custom_location_count: 2,
    locations_finalized: false,
    locations_status: 'configured',
    has_default_roles: true,
    custom_role_count: 1,
    roles_finalized: false,
    roles_status: 'configured',
    total_staff_assigned: 3,
    supervisor_count: 1,
    escort_count: 2,
    coordinator_count: 0,
    team_finalized: false,
    team_status: 'partial',
    total_talent: 5,
    talent_finalized: false,
    talent_status: 'partial',
    assignments_status: 'partial',
    urgent_assignment_issues: 2,
    overall_status: 'operational',
    last_updated: '2024-01-01T00:00:00Z',
    todoItems: [
      {
        id: 'urgent-assignments',
        area: 'assignments',
        priority: 'critical',
        title: 'Complete urgent assignments',
        description: '2 assignments needed for tomorrow',
        actionText: 'Go to Assignments',
        actionRoute: '/assignments'
      }
    ],
    featureAvailability: {
      timeTracking: {
        available: true,
        requirement: 'At least one staff member assigned',
        guidance: undefined,
        actionRoute: undefined
      },
      assignments: {
        available: true,
        requirement: 'Both talent and escorts assigned',
        guidance: undefined,
        actionRoute: undefined
      },
      talentManagement: {
        available: true,
        requirement: 'At least one talent assigned',
        guidance: undefined,
        actionRoute: undefined
      }
    },
    assignmentProgress: {
      totalAssignments: 10,
      completedAssignments: 8,
      urgentIssues: 2,
      upcomingDeadlines: [],
      assignmentRate: 80
    }
  }

  it('fetches readiness data on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockReadinessData })
    } as Response)

    const { result } = renderHook(() => useProjectReadiness('test-project-id'))

    expect(result.current.loading).toBe(true)
    expect(result.current.readiness).toBe(null)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.readiness).toEqual(mockReadinessData)
    expect(result.current.error).toBe(null)
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project-id/readiness')
  })

  it('handles fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    } as Response)

    const { result } = renderHook(() => useProjectReadiness('test-project-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.readiness).toBe(null)
    expect(result.current.error).toBe('Server error')
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useProjectReadiness('test-project-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.readiness).toBe(null)
    expect(result.current.error).toBe('Network error')
  })

  it('does not fetch when disabled', () => {
    renderHook(() => useProjectReadiness('test-project-id', { enabled: false }))

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does not fetch when projectId is empty', () => {
    renderHook(() => useProjectReadiness(''))

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refreshes data when refresh is called', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockReadinessData })
    } as Response)

    const { result } = renderHook(() => useProjectReadiness('test-project-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    mockFetch.mockClear()

    await result.current.refresh()

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project-id/readiness')
  })

  it('finalizes areas successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockReadinessData })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, area: 'team' })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ...mockReadinessData, team_finalized: true } })
      } as Response)

    const { result } = renderHook(() => useProjectReadiness('test-project-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const success = await result.current.finalize('team')

    expect(success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project-id/readiness/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ area: 'team' }),
    })
  })

  it('handles finalization errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockReadinessData })
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Cannot finalize' })
      } as Response)

    const { result } = renderHook(() => useProjectReadiness('test-project-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const success = await result.current.finalize('team')

    expect(success).toBe(false)
    expect(result.current.error).toBe('Cannot finalize')
  })
})

describe('useFeatureAvailability', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('returns feature availability for specific feature', async () => {
    const mockReadinessData = {
      featureAvailability: {
        timeTracking: {
          available: true,
          requirement: 'At least one staff member assigned',
          guidance: undefined,
          actionRoute: undefined
        }
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockReadinessData })
    } as Response)

    const { result } = renderHook(() => useFeatureAvailability('test-project-id', 'timeTracking'))

    await waitFor(() => {
      expect(result.current.available).toBe(true)
    })

    expect(result.current.requirement).toBe('At least one staff member assigned')
    expect(result.current.guidance).toBe(undefined)
    expect(result.current.actionRoute).toBe(undefined)
  })

  it('returns loading state when readiness is not loaded', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { result } = renderHook(() => useFeatureAvailability('test-project-id', 'timeTracking'))

    expect(result.current.available).toBe(false)
    expect(result.current.requirement).toBe('Loading...')
    expect(result.current.guidance).toBe('Please wait while we check feature availability')
  })
})