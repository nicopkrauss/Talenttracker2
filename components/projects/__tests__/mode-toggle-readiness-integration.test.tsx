import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeToggle } from '../mode-toggle'
import { useProjectMode } from '@/hooks/use-project-mode'

// Mock the readiness context
const mockUseReadiness = vi.fn()
vi.mock('../../../lib/contexts/readiness-context', () => ({
  useReadiness: () => mockUseReadiness()
}))

// Mock the project mode hook
const mockUseProjectMode = vi.fn()
vi.mock('../../../hooks/use-project-mode', () => ({
  useProjectMode: () => mockUseProjectMode()
}))

describe('ModeToggle Readiness Integration', () => {
  const mockSetMode = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default readiness state - not in context
    mockUseReadiness.mockImplementation(() => {
      throw new Error('useReadiness must be used within a ReadinessProvider')
    })

    // Default mode state
    mockUseProjectMode.mockReturnValue({
      currentMode: 'configuration',
      setMode: mockSetMode,
      isConfiguration: true,
      isOperations: false,
      suggestedMode: 'configuration',
      canAccessOperations: true,
      readinessState: {
        isActive: false,
        isSetupComplete: false
      }
    })
  })

  it('should integrate mode toggle with readiness-aware project mode hook', () => {
    // Mock active project state
    mockUseReadiness.mockReturnValue({
      readiness: {
        status: 'active'
      },
      getBlockingIssues: () => []
    })

    mockUseProjectMode.mockReturnValue({
      currentMode: 'configuration',
      setMode: mockSetMode,
      isConfiguration: true,
      isOperations: false,
      suggestedMode: 'operations', // Should suggest operations for active project
      canAccessOperations: true,
      readinessState: {
        isActive: true,
        isSetupComplete: true
      }
    })

    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockSetMode} 
      />
    )

    // Should show readiness indicator for operations mode
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    expect(opsButton).toHaveClass('ring-1', 'ring-green-500/20')
    
    // Should have readiness indicator dot
    const indicator = opsButton.querySelector('.bg-green-500')
    expect(indicator).toBeInTheDocument()
  })

  it('should show different visual states based on readiness', () => {
    // Test setup complete but not active
    mockUseReadiness.mockReturnValue({
      readiness: {
        status: 'ready_for_activation'
      },
      getBlockingIssues: () => []
    })

    const { rerender } = render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockSetMode} 
      />
    )

    let opsButton = screen.getByRole('tab', { name: /operations/i })
    expect(opsButton).toHaveClass('ring-1', 'ring-green-500/20')

    // Test blocking issues state
    mockUseReadiness.mockReturnValue({
      readiness: {
        status: 'incomplete'
      },
      getBlockingIssues: () => ['missing_role_templates']
    })

    rerender(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockSetMode} 
      />
    )

    opsButton = screen.getByRole('tab', { name: /operations/i })
    expect(opsButton).toHaveClass('opacity-75')
    
    const warningIcon = opsButton.querySelector('.text-amber-500')
    expect(warningIcon).toBeInTheDocument()
  })

  it('should work correctly when readiness data is unavailable', () => {
    // Default mock throws error (not in context)
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockSetMode} 
      />
    )

    // Should still render and be functional
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    expect(configButton).toBeInTheDocument()
    expect(opsButton).toBeInTheDocument()
    
    // Should be clickable
    fireEvent.click(opsButton)
    expect(mockSetMode).toHaveBeenCalledWith('operations')
  })

  it('should not show readiness indicators when already in operations mode', () => {
    mockUseReadiness.mockReturnValue({
      readiness: {
        status: 'active'
      },
      getBlockingIssues: () => []
    })

    render(
      <ModeToggle 
        currentMode="operations" 
        onModeChange={mockSetMode} 
      />
    )

    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    // Should not have readiness ring when already in operations mode
    expect(opsButton).not.toHaveClass('ring-1', 'ring-green-500/20')
    
    // Should not have indicator dot
    const indicator = opsButton.querySelector('.bg-green-500')
    expect(indicator).not.toBeInTheDocument()
  })

  it('should maintain accessibility with readiness enhancements', () => {
    mockUseReadiness.mockReturnValue({
      readiness: {
        status: 'active'
      },
      getBlockingIssues: () => []
    })

    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockSetMode} 
      />
    )

    const toggleContainer = screen.getByRole('tablist')
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    const opsButton = screen.getByRole('tab', { name: /operations/i })

    // Should maintain proper ARIA attributes
    expect(toggleContainer).toHaveAttribute('aria-label', 'Project mode selection')
    expect(configButton).toHaveAttribute('aria-selected', 'true')
    expect(opsButton).toHaveAttribute('aria-selected', 'false')
    
    // Should have tooltip trigger for enhanced UX
    expect(opsButton).toHaveAttribute('data-slot', 'tooltip-trigger')
  })
})