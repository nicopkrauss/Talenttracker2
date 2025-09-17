import React from 'react'
import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useFeatureAvailability } from '../use-feature-availability'
import { ReadinessProvider } from '@/lib/contexts/readiness-context'

// Mock the readiness context
const mockUseReadiness = vi.fn()
vi.mock('@/lib/contexts/readiness-context', () => ({
  useReadiness: () => mockUseReadiness(),
  ReadinessProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('useFeatureAvailability Context Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should work when used within ReadinessProvider context', () => {
    const mockReadiness = {
      project_id: 'test-project',
      status: 'active' as const,
      features: {
        team_management: true,
        talent_tracking: true,
        scheduling: true,
        time_tracking: true
      },
      blocking_issues: [],
      calculated_at: '2024-01-01T00:00:00Z'
    }

    mockUseReadiness.mockReturnValue({
      readiness: mockReadiness,
      isLoading: false,
      error: null
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        {children}
      </ReadinessProvider>
    )

    const { result } = renderHook(() => useFeatureAvailability('test-project'), { wrapper })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.features.timeTracking.available).toBe(true)
    expect(result.current.features.assignments.available).toBe(true)
  })

  it('should gracefully handle being used outside ReadinessProvider context', () => {
    // Mock the context error that would be thrown
    mockUseReadiness.mockImplementation(() => {
      throw new Error('useReadiness must be used within a ReadinessProvider')
    })

    // Render without ReadinessProvider wrapper
    const { result } = renderHook(() => useFeatureAvailability('test-project'))

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    
    // All features should be unavailable when no context is available
    expect(result.current.features.timeTracking.available).toBe(false)
    expect(result.current.features.assignments.available).toBe(false)
    expect(result.current.features.locationTracking.available).toBe(false)
    expect(result.current.features.talentManagement.available).toBe(false)
    
    // Should have appropriate fallback messages
    expect(result.current.features.timeTracking.requirement).toBe('Project setup required')
    expect(result.current.features.timeTracking.guidance).toBe('Complete project setup to access this feature')
    expect(result.current.features.timeTracking.actionRoute).toBe('/info')
  })

  it('should re-throw non-context errors', () => {
    // Mock a different error that should be re-thrown
    const otherError = new Error('Some other error')
    mockUseReadiness.mockImplementation(() => {
      throw otherError
    })

    expect(() => {
      renderHook(() => useFeatureAvailability('test-project'))
    }).toThrow('Some other error')
  })

  it('should handle loading state from context', () => {
    mockUseReadiness.mockReturnValue({
      readiness: null,
      isLoading: true,
      error: null
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReadinessProvider projectId="test-project">
        {children}
      </ReadinessProvider>
    )

    const { result } = renderHook(() => useFeatureAvailability('test-project'), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBe(null)
    
    // All features should be unavailable when loading
    expect(result.current.features.timeTracking.available).toBe(false)
    expect(result.current.features.assignments.available).toBe(false)
  })

  it('should handle error state from context', () => {
    const contextError = new Error('Context error')
    mockUseReadiness.mockReturnValue({
      readiness: null,
      isLoading: false,
      error: contextError
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReadinessProvider projectId="test-project">
        {children}
      </ReadinessProvider>
    )

    const { result } = renderHook(() => useFeatureAvailability('test-project'), { wrapper })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Context error')
    
    // All features should be unavailable when there's an error
    expect(result.current.features.timeTracking.available).toBe(false)
    expect(result.current.features.assignments.available).toBe(false)
  })
})