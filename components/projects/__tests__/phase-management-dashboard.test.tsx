import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhaseManagementDashboard, PhaseManagementWidget } from '../phase-management-dashboard'
import { ProjectPhase } from '@/lib/types/project-phase'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'

// Mock fetch
global.fetch = jest.fn()

const mockPhaseData = {
  projectId: 'test-project',
  currentPhase: ProjectPhase.PREP,
  transitionResult: {
    canTransition: true,
    targetPhase: ProjectPhase.STAFFING,
    blockers: [],
    reason: 'All requirements met'
  },
  lastUpdated: '2024-01-01T12:00:00Z'
}

const mockActionItemsData = {
  actionItems: [
    {
      id: 'prep-roles',
      title: 'Add Project Roles & Pay Rates',
      description: 'Define all roles needed for this project',
      category: 'setup',
      priority: 'high' as const,
      completed: false,
      requiredForTransition: true
    }
  ],
  summary: {
    total: 5,
    completed: 2,
    required: 3,
    requiredCompleted: 1,
    byPriority: {
      high: 2,
      medium: 2,
      low: 1
    },
    byCategory: {
      setup: 3,
      staffing: 2
    }
  }
}

describe('PhaseManagementDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockImplementation((url) => {
      if (url.includes('/phase/action-items')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockActionItemsData })
        } as Response)
      }
      if (url.includes('/phase')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockPhaseData })
        } as Response)
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('renders dashboard with phase information', async () => {
    render(<PhaseManagementDashboard projectId="test-project" />)

    // Should show loading initially
    expect(screen.getByRole('status')).toBeInTheDocument()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Should show phase indicator
    expect(screen.getByText('Preparation')).toBeInTheDocument()
    
    // Should show transition button
    expect(screen.getByText('Advance to Staffing')).toBeInTheDocument()
  })

  it('displays action items summary correctly', async () => {
    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Should show summary stats
    expect(screen.getByText('2')).toBeInTheDocument() // completed
    expect(screen.getByText('3')).toBeInTheDocument() // remaining
    expect(screen.getByText('2')).toBeInTheDocument() // high priority
  })

  it('handles tab switching correctly', async () => {
    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Switch to actions tab
    const actionsTab = screen.getByText('Action Items')
    fireEvent.click(actionsTab)

    await waitFor(() => {
      expect(screen.getByText('Add Project Roles & Pay Rates')).toBeInTheDocument()
    })

    // Switch to progress tab
    const progressTab = screen.getByText('Progress')
    fireEvent.click(progressTab)

    await waitFor(() => {
      expect(screen.getByText('Phase Timeline')).toBeInTheDocument()
    })
  })

  it('refreshes data when refresh button is clicked', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    
    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Clear previous calls
    mockFetch.mockClear()

    // Click refresh button
    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    // Should make new API calls
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/phase')
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/phase/action-items?includeReadiness=true')
    })
  })

  it('handles API errors gracefully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockRejectedValue(new Error('API Error'))

    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load phase data')).toBeInTheDocument()
    })
  })

  it('shows transition status correctly', async () => {
    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Should show ready for transition
    expect(screen.getByText('Ready for next phase!')).toBeInTheDocument()
    expect(screen.getByText(/All requirements have been met/)).toBeInTheDocument()
  })

  it('supports auto-refresh functionality', async () => {
    jest.useFakeTimers()
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>

    render(
      <PhaseManagementDashboard 
        projectId="test-project" 
        autoRefresh={true}
        refreshInterval={5000}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Clear initial calls
    mockFetch.mockClear()

    // Fast-forward time
    jest.advanceTimersByTime(5000)

    // Should make refresh calls
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    jest.useRealTimers()
  })
})

describe('PhaseManagementWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockImplementation((url) => {
      if (url.includes('/phase/action-items')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockActionItemsData })
        } as Response)
      }
      if (url.includes('/phase')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockPhaseData })
        } as Response)
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('renders compact widget correctly', async () => {
    render(<PhaseManagementWidget projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Phase')).toBeInTheDocument()
    })

    // Should show phase indicator
    expect(screen.getByText('Preparation')).toBeInTheDocument()
    
    // Should show compact stats
    expect(screen.getByText('2')).toBeInTheDocument() // completed
    expect(screen.getByText('3')).toBeInTheDocument() // remaining
    
    // Should show ready status
    expect(screen.getByText('✓ Ready to advance')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<PhaseManagementWidget projectId="test-project" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('Responsive Design', () => {
  beforeEach(() => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockImplementation((url) => {
      if (url.includes('/phase/action-items')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockActionItemsData })
        } as Response)
      }
      if (url.includes('/phase')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockPhaseData })
        } as Response)
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('adapts layout for mobile screens', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Should still render all components but with responsive classes
    expect(screen.getByText('Preparation')).toBeInTheDocument()
    expect(screen.getByText('Advance to Staffing')).toBeInTheDocument()
  })

  it('adapts layout for desktop screens', async () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Should render with desktop layout
    expect(screen.getByText('Preparation')).toBeInTheDocument()
  })
})

describe('Accessibility', () => {
  beforeEach(() => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockImplementation((url) => {
      if (url.includes('/phase/action-items')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockActionItemsData })
        } as Response)
      }
      if (url.includes('/phase')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockPhaseData })
        } as Response)
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('has proper ARIA labels and roles', async () => {
    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Should have proper tab roles
    const tabList = screen.getByRole('tablist')
    expect(tabList).toBeInTheDocument()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)

    // Should have proper button roles
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('supports keyboard navigation', async () => {
    render(<PhaseManagementDashboard projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Project Lifecycle')).toBeInTheDocument()
    })

    // Should be able to focus and navigate tabs
    const actionsTab = screen.getByText('Action Items')
    actionsTab.focus()
    expect(actionsTab).toHaveFocus()

    // Press Enter to activate tab
    fireEvent.keyDown(actionsTab, { key: 'Enter', code: 'Enter' })
    
    await waitFor(() => {
      expect(screen.getByText('Add Project Roles & Pay Rates')).toBeInTheDocument()
    })
  })
})