import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, beforeEach, expect } from 'vitest'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useProjectMode } from '../use-project-mode'

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(),
}))

// Mock the readiness context
const mockUseReadiness = vi.fn()
vi.mock('../../lib/contexts/readiness-context', () => ({
  useReadiness: () => mockUseReadiness()
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('useProjectMode', () => {
  const mockReplace = vi.fn()
  const mockSearchParams = {
    get: vi.fn(),
    toString: vi.fn(() => ''),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      replace: mockReplace,
    })
    ;(useSearchParams as any).mockReturnValue(mockSearchParams)
    ;(usePathname as any).mockReturnValue('/projects/123')
    mockLocalStorage.getItem.mockReturnValue(null)
    mockSearchParams.get.mockReturnValue(null)
    
    // Default readiness state - mock to throw error (not in context)
    mockUseReadiness.mockImplementation(() => {
      throw new Error('useReadiness must be used within a ReadinessProvider')
    })
  })

  it('initializes with default mode', () => {
    const { result } = renderHook(() =>
      useProjectMode({ projectId: 'test-project' })
    )

    expect(result.current.currentMode).toBe('configuration')
    expect(result.current.isConfiguration).toBe(true)
    expect(result.current.isOperations).toBe(false)
  })

  it('initializes with custom default mode', () => {
    const { result } = renderHook(() =>
      useProjectMode({ 
        projectId: 'test-project', 
        defaultMode: 'operations' 
      })
    )

    expect(result.current.currentMode).toBe('operations')
    expect(result.current.isOperations).toBe(true)
  })

  it('prioritizes URL params over localStorage', () => {
    mockSearchParams.get.mockReturnValue('operations')
    mockLocalStorage.getItem.mockReturnValue('configuration')

    const { result } = renderHook(() =>
      useProjectMode({ projectId: 'test-project' })
    )

    expect(result.current.currentMode).toBe('operations')
  })

  it('falls back to localStorage when no URL params', () => {
    mockSearchParams.get.mockReturnValue(null)
    mockLocalStorage.getItem.mockReturnValue('operations')

    const { result } = renderHook(() =>
      useProjectMode({ projectId: 'test-project' })
    )

    expect(result.current.currentMode).toBe('operations')
  })

  it('updates mode and persists to localStorage and URL', () => {
    const { result } = renderHook(() =>
      useProjectMode({ projectId: 'test-project' })
    )

    act(() => {
      result.current.setMode('operations')
    })

    expect(result.current.currentMode).toBe('operations')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'project-mode-test-project',
      'operations'
    )
    expect(mockReplace).toHaveBeenCalledWith(
      '/projects/123?mode=operations',
      { scroll: false }
    )
  })

  it('preserves existing URL params when updating mode', () => {
    mockSearchParams.toString.mockReturnValue('tab=info&other=value')

    const { result } = renderHook(() =>
      useProjectMode({ projectId: 'test-project' })
    )

    act(() => {
      result.current.setMode('operations')
    })

    expect(mockReplace).toHaveBeenCalledWith(
      '/projects/123?tab=info&other=value&mode=operations',
      { scroll: false }
    )
  })

  it('handles keyboard shortcuts', () => {
    const { result } = renderHook(() =>
      useProjectMode({ projectId: 'test-project' })
    )

    // Simulate Alt+O for operations mode
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'o',
        altKey: true,
      })
      document.dispatchEvent(event)
    })

    expect(result.current.currentMode).toBe('operations')

    // Simulate Alt+C for configuration mode
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        altKey: true,
      })
      document.dispatchEvent(event)
    })

    expect(result.current.currentMode).toBe('configuration')
  })

  it('ignores invalid modes from URL and localStorage', () => {
    mockSearchParams.get.mockReturnValue('invalid-mode')
    mockLocalStorage.getItem.mockReturnValue('another-invalid-mode')

    const { result } = renderHook(() =>
      useProjectMode({ projectId: 'test-project' })
    )

    expect(result.current.currentMode).toBe('configuration')
  })

  describe('Readiness-based intelligent defaults', () => {
    it('suggests operations mode for active projects', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'active'
        }
      })

      const { result } = renderHook(() =>
        useProjectMode({ projectId: 'test-project' })
      )

      expect(result.current.suggestedMode).toBe('operations')
      expect(result.current.readinessState.isActive).toBe(true)
    })

    it('suggests configuration mode for setup complete but not active projects', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'ready_for_activation'
        }
      })

      const { result } = renderHook(() =>
        useProjectMode({ projectId: 'test-project' })
      )

      expect(result.current.suggestedMode).toBe('configuration')
      expect(result.current.readinessState.isSetupComplete).toBe(true)
    })

    it('defaults to configuration mode for incomplete setup', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'incomplete'
        }
      })

      const { result } = renderHook(() =>
        useProjectMode({ projectId: 'test-project' })
      )

      expect(result.current.suggestedMode).toBe('configuration')
      expect(result.current.readinessState.isSetupComplete).toBe(false)
    })

    it('uses intelligent default when no stored preference exists', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'active'
        }
      })

      // No URL params or localStorage
      mockSearchParams.get.mockReturnValue(null)
      mockLocalStorage.getItem.mockReturnValue(null)

      const { result } = renderHook(() =>
        useProjectMode({ projectId: 'test-project' })
      )

      // Should use intelligent default (operations for active project)
      expect(result.current.currentMode).toBe('operations')
    })

    it('prioritizes URL params over intelligent defaults', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'active'
        }
      })

      // URL explicitly sets configuration mode
      mockSearchParams.get.mockReturnValue('configuration')

      const { result } = renderHook(() =>
        useProjectMode({ projectId: 'test-project' })
      )

      // Should respect URL param despite intelligent default suggesting operations
      expect(result.current.currentMode).toBe('configuration')
    })

    it('prioritizes localStorage over intelligent defaults', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'active'
        }
      })

      // localStorage has configuration mode
      mockSearchParams.get.mockReturnValue(null)
      mockLocalStorage.getItem.mockReturnValue('configuration')

      const { result } = renderHook(() =>
        useProjectMode({ projectId: 'test-project' })
      )

      // Should respect localStorage despite intelligent default suggesting operations
      expect(result.current.currentMode).toBe('configuration')
    })

    it('provides readiness state information', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'active'
        }
      })

      const { result } = renderHook(() =>
        useProjectMode({ projectId: 'test-project' })
      )

      expect(result.current.readinessState).toEqual({
        isActive: true,
        isSetupComplete: true
      })
      expect(result.current.canAccessOperations).toBe(true)
    })

    it('handles gracefully when not in ReadinessProvider context', () => {
      // Mock throwing error (not in context)
      mockUseReadiness.mockImplementation(() => {
        throw new Error('useReadiness must be used within a ReadinessProvider')
      })

      const { result } = renderHook(() =>
        useProjectMode({ projectId: 'test-project' })
      )

      // Should use defaults when readiness context is not available
      expect(result.current.suggestedMode).toBe('configuration')
      expect(result.current.readinessState).toEqual({
        isActive: false,
        isSetupComplete: false
      })
      expect(result.current.canAccessOperations).toBe(true)
    })
  })
})