import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhaseTransitionButton, PhaseTransitionButtonCompact, PhaseTransitionButtonFull } from '../phase-transition-button'
import { ProjectPhase, TransitionResult } from '@/lib/types/project-phase'
import { useAuth } from '@/lib/auth-context'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
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
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn()
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    }
  }))
}))

// Mock fetch
global.fetch = jest.fn()

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('PhaseTransitionButton', () => {
  const mockTransitionResult: TransitionResult = {
    canTransition: true,
    targetPhase: ProjectPhase.STAFFING,
    blockers: [],
    reason: 'All requirements met'
  }

  const mockBlockedTransitionResult: TransitionResult = {
    canTransition: false,
    targetPhase: ProjectPhase.STAFFING,
    blockers: ['Project roles must be finalized', 'Project locations must be defined'],
    reason: 'Requirements not met'
  }

  const mockScheduledTransitionResult: TransitionResult = {
    canTransition: false,
    targetPhase: ProjectPhase.ACTIVE,
    blockers: ['Scheduled to activate at midnight'],
    scheduledAt: new Date('2024-12-01T00:00:00Z'),
    reason: 'Waiting for rehearsal start date'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'admin' },
      loading: false,
      signOut: jest.fn()
    } as any)
  })

  it('renders transition button when transition is available', () => {
    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
      />
    )

    expect(screen.getByText('Advance to Staffing')).toBeInTheDocument()
  })

  it('shows blocked state when transition is not available', () => {
    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockBlockedTransitionResult}
        showBlockers={true}
      />
    )

    expect(screen.getByText('Transition Blocked')).toBeInTheDocument()
    expect(screen.getByText('Project roles must be finalized')).toBeInTheDocument()
    expect(screen.getByText('Project locations must be defined')).toBeInTheDocument()
  })

  it('shows scheduled transition info', () => {
    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PRE_SHOW}
        transitionResult={mockScheduledTransitionResult}
      />
    )

    expect(screen.getByText(/Scheduled:/)).toBeInTheDocument()
    expect(screen.getByText(/12\/1\/2024/)).toBeInTheDocument()
  })

  it('disables button for non-admin users', () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'talent_escort' },
      loading: false,
      signOut: jest.fn()
    } as any)

    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
      />
    )

    const button = screen.getByText('Advance to Staffing')
    expect(button).toBeDisabled()
    expect(screen.getByText('Manual phase transitions require administrator privileges.')).toBeInTheDocument()
  })

  it('opens confirmation dialog when clicked', async () => {
    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
      />
    )

    const button = screen.getByText('Advance to Staffing')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Confirm Phase Transition')).toBeInTheDocument()
      expect(screen.getByText(/from Preparation to Staffing/)).toBeInTheDocument()
    })
  })

  it('calls API when transition is confirmed', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response)

    const onTransitionComplete = jest.fn()

    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
        onTransitionComplete={onTransitionComplete}
      />
    )

    // Open dialog
    const button = screen.getByText('Advance to Staffing')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Confirm Phase Transition')).toBeInTheDocument()
    })

    // Confirm transition
    const confirmButton = screen.getByText('Confirm Transition')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/phase/transition',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetPhase: ProjectPhase.STAFFING,
            trigger: 'manual',
            reason: 'Manual transition by administrator'
          })
        })
      )
    })

    await waitFor(() => {
      expect(onTransitionComplete).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Transition failed' })
    } as Response)

    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
      />
    )

    // Open dialog and confirm
    const button = screen.getByText('Advance to Staffing')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Confirm Phase Transition')).toBeInTheDocument()
    })

    const confirmButton = screen.getByText('Confirm Transition')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText('Transition failed')).toBeInTheDocument()
    })
  })

  it('returns null when no target phase is available', () => {
    const noTransitionResult: TransitionResult = {
      canTransition: false,
      targetPhase: null,
      blockers: ['Project is already archived']
    }

    const { container } = render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.ARCHIVED}
        transitionResult={noTransitionResult}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})

describe('PhaseTransitionButtonCompact', () => {
  it('renders with compact styling', () => {
    const mockTransitionResult: TransitionResult = {
      canTransition: true,
      targetPhase: ProjectPhase.STAFFING,
      blockers: []
    }

    render(
      <PhaseTransitionButtonCompact
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
      />
    )

    const button = screen.getByText('Advance to Staffing')
    expect(button).toHaveClass('h-8') // Small size
  })
})

describe('PhaseTransitionButtonFull', () => {
  it('renders with full styling and shows blockers', () => {
    const mockBlockedTransitionResult: TransitionResult = {
      canTransition: false,
      targetPhase: ProjectPhase.STAFFING,
      blockers: ['Project roles must be finalized']
    }

    render(
      <PhaseTransitionButtonFull
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockBlockedTransitionResult}
      />
    )

    expect(screen.getByText('Transition Blocked')).toBeInTheDocument()
    expect(screen.getByText('Project roles must be finalized')).toBeInTheDocument()
  })
})

describe('Accessibility', () => {
  it('has proper ARIA attributes', () => {
    const mockTransitionResult: TransitionResult = {
      canTransition: true,
      targetPhase: ProjectPhase.STAFFING,
      blockers: []
    }

    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
      />
    )

    const button = screen.getByRole('button', { name: /Advance to Staffing/ })
    expect(button).toBeInTheDocument()
  })

  it('supports keyboard navigation', async () => {
    const mockTransitionResult: TransitionResult = {
      canTransition: true,
      targetPhase: ProjectPhase.STAFFING,
      blockers: []
    }

    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
      />
    )

    const button = screen.getByText('Advance to Staffing')
    
    // Focus the button
    button.focus()
    expect(button).toHaveFocus()

    // Press Enter to open dialog
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Confirm Phase Transition')).toBeInTheDocument()
    })
  })
})

describe('Loading States', () => {
  it('shows loading state during transition', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    const mockTransitionResult: TransitionResult = {
      canTransition: true,
      targetPhase: ProjectPhase.STAFFING,
      blockers: []
    }

    render(
      <PhaseTransitionButton
        projectId="test-project"
        currentPhase={ProjectPhase.PREP}
        transitionResult={mockTransitionResult}
      />
    )

    // Open dialog and confirm
    const button = screen.getByText('Advance to Staffing')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Confirm Phase Transition')).toBeInTheDocument()
    })

    const confirmButton = screen.getByText('Confirm Transition')
    fireEvent.click(confirmButton)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Transitioning...')).toBeInTheDocument()
    })
  })
})