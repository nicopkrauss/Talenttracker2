import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProjectReadiness } from '../use-project-readiness'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  channel: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
}

const mockCreateClient = vi.fn(() => mockSupabaseClient)

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('useProjectReadiness Real-time Updates', () => {
  const mockProjectId = 'test-project-123'
  
  const mockReadinessData = {
    project_id: mockProjectId,
    overall_status: 'getting-started',
    total_staff_assigned: 0,
    total_talent: 0,
    escort_count: 0,
    locations_status: 'default-only',
    roles_status: 'default-only',
    team_status: 'none',
    talent_status: 'none',
    todoItems: [],
    featureAvailability: {},
    assignmentProgress: {}
  }

  let mockChannel: any
  let mockSubscription: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockReadinessData })
    })

    // Mock Supabase channel and subscription
    mockSubscription = {
      unsubscribe: vi.fn()
    }

    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue(mockSubscription)
    }

    mockSupabaseClient.channel.mockReturnValue(mockChannel)
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should establish real-time subscription on mount', async () => {
    renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(`project-readiness-${mockProjectId}`)
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_readiness',
          filter: `project_id=eq.${mockProjectId}`
        },
        expect.any(Function)
      )
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })
  })

  it('should update readiness data when real-time event is received', async () => {
    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate real-time update
    const updatedData = {
      ...mockReadinessData,
      total_staff_assigned: 3,
      overall_status: 'operational'
    }

    // Get the callback function passed to channel.on
    const realtimeCallback = mockChannel.on.mock.calls[0][2]

    act(() => {
      realtimeCallback({
        eventType: 'UPDATE',
        new: updatedData,
        old: mockReadinessData
      })
    })

    await waitFor(() => {
      expect(result.current.readiness?.total_staff_assigned).toBe(3)
      expect(result.current.readiness?.overall_status).toBe('operational')
    })
  })

  it('should handle INSERT events for new readiness records', async () => {
    // Mock initial fetch returning no data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: null })
    })

    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result.current.readiness).toBeNull()
    })

    // Simulate real-time INSERT event
    const realtimeCallback = mockChannel.on.mock.calls[0][2]

    act(() => {
      realtimeCallback({
        eventType: 'INSERT',
        new: mockReadinessData,
        old: null
      })
    })

    await waitFor(() => {
      expect(result.current.readiness).toEqual(mockReadinessData)
    })
  })

  it('should handle DELETE events', async () => {
    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result.current.readiness).toEqual(mockReadinessData)
    })

    // Simulate real-time DELETE event
    const realtimeCallback = mockChannel.on.mock.calls[0][2]

    act(() => {
      realtimeCallback({
        eventType: 'DELETE',
        new: null,
        old: mockReadinessData
      })
    })

    await waitFor(() => {
      expect(result.current.readiness).toBeNull()
    })
  })

  it('should subscribe to related table changes', async () => {
    renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      // Should subscribe to multiple tables that affect readiness
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(`project-readiness-${mockProjectId}`)
      
      // Check for subscriptions to related tables
      const channelCalls = mockChannel.on.mock.calls
      const tableSubscriptions = channelCalls.map(call => call[1].table)
      
      expect(tableSubscriptions).toContain('project_readiness')
      expect(tableSubscriptions).toContain('team_assignments')
      expect(tableSubscriptions).toContain('talent_project_assignments')
      expect(tableSubscriptions).toContain('project_locations')
      expect(tableSubscriptions).toContain('project_role_templates')
    })
  })

  it('should refresh data when related tables change', async () => {
    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock updated API response
    const updatedData = {
      ...mockReadinessData,
      total_staff_assigned: 2
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: updatedData })
    })

    // Find the team_assignments subscription callback
    const teamAssignmentsCallback = mockChannel.on.mock.calls.find(
      call => call[1].table === 'team_assignments'
    )?.[2]

    expect(teamAssignmentsCallback).toBeDefined()

    // Simulate team assignment change
    act(() => {
      teamAssignmentsCallback({
        eventType: 'INSERT',
        new: { project_id: mockProjectId, user_id: 'user-456', role: 'supervisor' },
        old: null
      })
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/readiness?refresh=true`,
        expect.any(Object)
      )
      expect(result.current.readiness?.total_staff_assigned).toBe(2)
    })
  })

  it('should handle real-time connection errors gracefully', async () => {
    // Mock subscription failure
    mockChannel.subscribe.mockReturnValue({
      unsubscribe: vi.fn(),
      error: new Error('Connection failed')
    })

    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      // Should still load initial data even if real-time fails
      expect(result.current.readiness).toEqual(mockReadinessData)
      expect(result.current.error).toBeNull()
    })
  })

  it('should unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    unmount()

    expect(mockSubscription.unsubscribe).toHaveBeenCalled()
  })

  it('should handle multiple simultaneous updates', async () => {
    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const realtimeCallback = mockChannel.on.mock.calls[0][2]

    // Simulate rapid updates
    const updates = [
      { ...mockReadinessData, total_staff_assigned: 1 },
      { ...mockReadinessData, total_staff_assigned: 2 },
      { ...mockReadinessData, total_staff_assigned: 3 }
    ]

    act(() => {
      updates.forEach((update, index) => {
        setTimeout(() => {
          realtimeCallback({
            eventType: 'UPDATE',
            new: update,
            old: index === 0 ? mockReadinessData : updates[index - 1]
          })
        }, index * 10)
      })
    })

    await waitFor(() => {
      expect(result.current.readiness?.total_staff_assigned).toBe(3)
    })
  })

  it('should debounce rapid real-time updates', async () => {
    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const realtimeCallback = mockChannel.on.mock.calls[0][2]
    let updateCount = 0

    // Mock state setter to count updates
    const originalSetState = result.current.readiness
    vi.spyOn(result.current, 'readiness', 'set').mockImplementation(() => {
      updateCount++
    })

    // Simulate many rapid updates
    act(() => {
      for (let i = 0; i < 10; i++) {
        realtimeCallback({
          eventType: 'UPDATE',
          new: { ...mockReadinessData, total_staff_assigned: i },
          old: mockReadinessData
        })
      }
    })

    await waitFor(() => {
      // Should debounce to fewer updates than the number of events
      expect(updateCount).toBeLessThan(10)
    })
  })

  it('should handle cross-tab synchronization', async () => {
    const { result: result1 } = renderHook(() => useProjectReadiness(mockProjectId))
    const { result: result2 } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result1.current.loading).toBe(false)
      expect(result2.current.loading).toBe(false)
    })

    // Both hooks should receive the same real-time update
    const realtimeCallback1 = mockChannel.on.mock.calls[0][2]
    const realtimeCallback2 = mockChannel.on.mock.calls[1][2]

    const updatedData = {
      ...mockReadinessData,
      overall_status: 'operational'
    }

    act(() => {
      realtimeCallback1({
        eventType: 'UPDATE',
        new: updatedData,
        old: mockReadinessData
      })
      realtimeCallback2({
        eventType: 'UPDATE',
        new: updatedData,
        old: mockReadinessData
      })
    })

    await waitFor(() => {
      expect(result1.current.readiness?.overall_status).toBe('operational')
      expect(result2.current.readiness?.overall_status).toBe('operational')
    })
  })

  it('should handle finalization real-time updates', async () => {
    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock finalization API call
    const mockFinalize = vi.fn().mockResolvedValue({
      success: true,
      area: 'locations',
      finalizedAt: '2024-01-15T10:00:00Z',
      finalizedBy: 'user-123'
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockFinalize()
    })

    // Call finalize function
    await act(async () => {
      await result.current.finalize('locations')
    })

    // Simulate real-time update for finalization
    const realtimeCallback = mockChannel.on.mock.calls[0][2]
    const finalizedData = {
      ...mockReadinessData,
      locations_finalized: true,
      locations_finalized_at: '2024-01-15T10:00:00Z',
      locations_finalized_by: 'user-123'
    }

    act(() => {
      realtimeCallback({
        eventType: 'UPDATE',
        new: finalizedData,
        old: mockReadinessData
      })
    })

    await waitFor(() => {
      expect(result.current.readiness?.locations_finalized).toBe(true)
      expect(result.current.readiness?.locations_finalized_at).toBe('2024-01-15T10:00:00Z')
    })
  })

  it('should handle network reconnection', async () => {
    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate network disconnection
    mockChannel.subscribe.mockReturnValue({
      unsubscribe: vi.fn(),
      error: new Error('Network disconnected')
    })

    // Simulate reconnection by creating new subscription
    const newMockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({
        unsubscribe: vi.fn()
      })
    }

    mockSupabaseClient.channel.mockReturnValue(newMockChannel)

    // Trigger reconnection (this would normally happen automatically)
    act(() => {
      // Simulate browser online event or Supabase reconnection
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => {
      expect(newMockChannel.subscribe).toHaveBeenCalled()
    })
  })

  it('should validate real-time data before updating state', async () => {
    const { result } = renderHook(() => useProjectReadiness(mockProjectId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const realtimeCallback = mockChannel.on.mock.calls[0][2]

    // Simulate invalid real-time data
    act(() => {
      realtimeCallback({
        eventType: 'UPDATE',
        new: { invalid: 'data' }, // Missing required fields
        old: mockReadinessData
      })
    })

    await waitFor(() => {
      // Should not update state with invalid data
      expect(result.current.readiness).toEqual(mockReadinessData)
    })
  })
})