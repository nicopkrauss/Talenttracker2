import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModeToggle } from '../mode-toggle'

// Mock the readiness context
const mockUseReadiness = vi.fn()
vi.mock('../../../lib/contexts/readiness-context', () => ({
  useReadiness: () => mockUseReadiness()
}))

describe('ModeToggle', () => {
  const mockOnModeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Default to not in context (throws error)
    mockUseReadiness.mockImplementation(() => {
      throw new Error('useReadiness must be used within a ReadinessProvider')
    })
  })

  it('should render both mode options', () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    expect(screen.getByText('Configuration')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
  })

  it('should show configuration mode as active by default', () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    expect(configButton).toHaveAttribute('aria-selected', 'true')
    expect(opsButton).toHaveAttribute('aria-selected', 'false')
  })

  it('should show operations mode as active when selected', () => {
    render(
      <ModeToggle 
        currentMode="operations" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    expect(opsButton).toHaveAttribute('aria-selected', 'true')
    expect(configButton).toHaveAttribute('aria-selected', 'false')
  })

  it('should call onModeChange when configuration button is clicked', async () => {
    render(
      <ModeToggle 
        currentMode="operations" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    fireEvent.click(configButton)
    
    await waitFor(() => {
      expect(mockOnModeChange).toHaveBeenCalledWith('configuration')
    })
  })

  it('should call onModeChange when operations button is clicked', async () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    fireEvent.click(opsButton)
    
    await waitFor(() => {
      expect(mockOnModeChange).toHaveBeenCalledWith('operations')
    })
  })

  it('should display icons for each mode', () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    // Check for Settings icon in Configuration button
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    expect(configButton.querySelector('svg')).toBeInTheDocument()
    
    // Check for Activity icon in Operations button
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    expect(opsButton.querySelector('svg')).toBeInTheDocument()
  })

  it('should be keyboard accessible', async () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    // Tab to first button
    configButton.focus()
    expect(configButton).toHaveFocus()
    
    // Tab to second button
    fireEvent.keyDown(configButton, { key: 'Tab' })
    opsButton.focus()
    expect(opsButton).toHaveFocus()
    
    // Enter should trigger click
    fireEvent.keyDown(opsButton, { key: 'Enter' })
    
    await waitFor(() => {
      expect(mockOnModeChange).toHaveBeenCalledWith('operations')
    })
  })

  it('should handle space key for activation', async () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    opsButton.focus()
    
    fireEvent.keyDown(opsButton, { key: ' ' })
    
    await waitFor(() => {
      expect(mockOnModeChange).toHaveBeenCalledWith('operations')
    })
  })

  it('should work normally even when readiness is loading', () => {
    // Default mock throws error (not in context)
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    // Buttons should still be functional
    expect(configButton).not.toBeDisabled()
    expect(opsButton).not.toBeDisabled()
  })

  it('should have proper ARIA attributes', () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    expect(configButton).toHaveAttribute('aria-selected', 'true')
    expect(opsButton).toHaveAttribute('aria-selected', 'false')
  })

  it('should update ARIA attributes when mode changes', () => {
    const { rerender } = render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    // Initially configuration is active
    let configButton = screen.getByRole('tab', { name: /configuration/i })
    let opsButton = screen.getByRole('tab', { name: /operations/i })
    
    expect(configButton).toHaveAttribute('aria-selected', 'true')
    expect(opsButton).toHaveAttribute('aria-selected', 'false')
    
    // Change to operations mode
    rerender(
      <ModeToggle 
        currentMode="operations" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    configButton = screen.getByRole('tab', { name: /configuration/i })
    opsButton = screen.getByRole('tab', { name: /operations/i })
    
    expect(configButton).toHaveAttribute('aria-selected', 'false')
    expect(opsButton).toHaveAttribute('aria-selected', 'true')
  })

  it('should have proper role for screen readers', () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const toggleGroup = screen.getByRole('tablist')
    expect(toggleGroup).toHaveAttribute('aria-label', 'Project mode selection')
  })

  it('should call onModeChange even when clicking already active button', async () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const configButton = screen.getByRole('tab', { name: /configuration/i })
    fireEvent.click(configButton)
    
    // Should still call onModeChange - parent can decide whether to ignore
    expect(mockOnModeChange).toHaveBeenCalledWith('configuration')
  })

  it('should handle rapid mode switching', async () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    // Rapid clicks
    fireEvent.click(opsButton)
    fireEvent.click(opsButton)
    fireEvent.click(opsButton)
    
    // Should call onModeChange for each click - parent handles debouncing
    await waitFor(() => {
      expect(mockOnModeChange).toHaveBeenCalledTimes(3)
      expect(mockOnModeChange).toHaveBeenCalledWith('operations')
    })
  })

  it('should maintain focus after mode change', async () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    opsButton.focus()
    
    fireEvent.click(opsButton)
    
    await waitFor(() => {
      expect(opsButton).toHaveFocus()
    })
  })

  it('should have proper styling for mobile', () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const toggleContainer = screen.getByRole('tablist')
    
    // Check for responsive classes
    expect(toggleContainer).toHaveClass('inline-flex')
    expect(toggleContainer).toHaveClass('rounded-lg')
    expect(toggleContainer).toHaveClass('border')
  })

  it('should handle touch events on mobile', async () => {
    render(
      <ModeToggle 
        currentMode="configuration" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    
    // Touch events should trigger click
    fireEvent.click(opsButton)
    
    await waitFor(() => {
      expect(mockOnModeChange).toHaveBeenCalledWith('operations')
    })
  })

  describe('Readiness-based behavior', () => {
    it('should show readiness indicator when project is ready for operations', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'ready_for_activation'
        },
        getBlockingIssues: () => []
      })

      render(
        <ModeToggle 
          currentMode="configuration" 
          onModeChange={mockOnModeChange} 
        />
      )

      const opsButton = screen.getByRole('tab', { name: /operations/i })
      
      // Should have visual indicator for readiness
      expect(opsButton).toHaveClass('ring-1', 'ring-green-500/20')
      
      // Should have readiness indicator dot
      const indicator = opsButton.querySelector('.bg-green-500')
      expect(indicator).toBeInTheDocument()
    })

    it('should show active project indicator', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'active'
        },
        getBlockingIssues: () => []
      })

      render(
        <ModeToggle 
          currentMode="configuration" 
          onModeChange={mockOnModeChange} 
        />
      )

      const opsButton = screen.getByRole('tab', { name: /operations/i })
      
      // Should have visual indicator for active project
      expect(opsButton).toHaveClass('ring-1', 'ring-green-500/20')
    })

    it('should show blocking issues indicator', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'incomplete'
        },
        getBlockingIssues: () => ['missing_role_templates', 'missing_locations']
      })

      render(
        <ModeToggle 
          currentMode="configuration" 
          onModeChange={mockOnModeChange} 
        />
      )

      const opsButton = screen.getByRole('tab', { name: /operations/i })
      
      // Should have reduced opacity for blocking issues
      expect(opsButton).toHaveClass('opacity-75')
      
      // Should have warning indicator
      const warningIcon = opsButton.querySelector('.text-amber-500')
      expect(warningIcon).toBeInTheDocument()
    })

    it('should not show indicators when in operations mode', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'active'
        },
        getBlockingIssues: () => []
      })

      render(
        <ModeToggle 
          currentMode="operations" 
          onModeChange={mockOnModeChange} 
        />
      )

      const opsButton = screen.getByRole('tab', { name: /operations/i })
      
      // Should not have readiness ring when already in operations mode
      expect(opsButton).not.toHaveClass('ring-1', 'ring-green-500/20')
      
      // Should not have indicator dot
      const indicator = opsButton.querySelector('.bg-green-500')
      expect(indicator).not.toBeInTheDocument()
    })

    it('should have tooltip trigger for operations button', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'active'
        },
        getBlockingIssues: () => []
      })

      render(
        <ModeToggle 
          currentMode="configuration" 
          onModeChange={mockOnModeChange} 
        />
      )

      const opsButton = screen.getByRole('tab', { name: /operations/i })
      
      // Should have tooltip trigger attribute
      expect(opsButton).toHaveAttribute('data-slot', 'tooltip-trigger')
    })

    it('should show readiness state in button styling', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'ready_for_activation'
        },
        getBlockingIssues: () => []
      })

      render(
        <ModeToggle 
          currentMode="configuration" 
          onModeChange={mockOnModeChange} 
        />
      )

      const opsButton = screen.getByRole('tab', { name: /operations/i })
      
      // Should have readiness styling
      expect(opsButton).toHaveClass('ring-1', 'ring-green-500/20')
    })

    it('should show blocking issues in button styling', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          status: 'incomplete'
        },
        getBlockingIssues: () => ['missing_role_templates', 'missing_locations']
      })

      render(
        <ModeToggle 
          currentMode="configuration" 
          onModeChange={mockOnModeChange} 
        />
      )

      const opsButton = screen.getByRole('tab', { name: /operations/i })
      
      // Should have reduced opacity for blocking issues
      expect(opsButton).toHaveClass('opacity-75')
      
      // Should have warning icon
      const warningIcon = opsButton.querySelector('.text-amber-500')
      expect(warningIcon).toBeInTheDocument()
    })

    it('should work gracefully when not in ReadinessProvider context', () => {
      // Default mock throws error (not in context)
      render(
        <ModeToggle 
          currentMode="configuration" 
          onModeChange={mockOnModeChange} 
        />
      )

      const opsButton = screen.getByRole('tab', { name: /operations/i })
      
      // Should still render and be functional without readiness data
      expect(opsButton).toBeInTheDocument()
      expect(opsButton).not.toHaveClass('ring-1', 'ring-green-500/20')
      expect(opsButton).not.toHaveClass('opacity-75')
    })
  })
})