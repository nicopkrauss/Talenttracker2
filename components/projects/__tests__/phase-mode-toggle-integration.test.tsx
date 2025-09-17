import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ProjectDetailLayout } from '../project-detail-layout'
import { useAuth } from '@/lib/auth-context'
import { ProjectPhase } from '@/lib/types/project-phase'
import { vi } from 'vitest'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }))
}))

// Mock the auth context
vi.mock('@/lib/auth-context')
const mockUseAuth = useAuth as any

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => '')
  }),
  usePathname: () => '/projects/test-project'
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('Phase Mode Toggle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      userProfile: {
        id: 'user-1',
        role: 'admin',
        full_name: 'Test Admin'
      },
      loading: false,
      error: null
    })

    // Mock project API response
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/projects/test-project')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              id: 'test-project',
              name: 'Test Project',
              status: 'prep',
              start_date: '2024-01-01',
              end_date: '2024-01-31',
              statistics: {
                talentExpected: 10,
                talentAssigned: 5,
                staffNeeded: 3,
                staffAssigned: 2,
                staffCheckedIn: 0,
                talentPresent: 0,
                activeEscorts: 0,
                staffOvertime: { over8Hours: 0, over12Hours: 0 }
              },
              project_setup_checklist: {
                roles_and_pay_completed: true,
                talent_roster_completed: false,
                team_assignments_completed: false,
                locations_completed: true
              }
            }
          })
        })
      }
      
      if (url.includes('/api/projects/test-project/phase')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              projectId: 'test-project',
              currentPhase: ProjectPhase.PREP,
              transitionResult: {
                canTransition: false,
                targetPhase: null,
                blockers: ['Complete talent roster', 'Complete team assignments'],
                scheduledAt: null
              },
              lastUpdated: new Date().toISOString()
            }
          })
        })
      }

      if (url.includes('/api/projects/test-project/phase/action-items')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              summary: {
                total: 4,
                completed: 2,
                required: 2,
                requiredCompleted: 1,
                byPriority: { high: 1, medium: 2, low: 1 },
                byCategory: { setup: 2, configuration: 2 }
              }
            }
          })
        })
      }

      return Promise.reject(new Error(`Unhandled URL: ${url}`))
    })
  })

  it('should render project detail layout with phase system', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    // Wait for project data to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Should show phase indicator instead of old status badge
    await waitFor(() => {
      expect(screen.getByText('Preparation')).toBeInTheDocument()
    })
  })

  it('should show phase management widget instead of activate button', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Should show phase management widget
    await waitFor(() => {
      expect(screen.getByText('Project Phase')).toBeInTheDocument()
    })

    // Should NOT show old activate button
    expect(screen.queryByText('Set Project to Active')).not.toBeInTheDocument()
  })

  it('should use phase-aware mode toggle', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Should show mode toggle with phase awareness
    await waitFor(() => {
      expect(screen.getByText('Setup')).toBeInTheDocument()
      expect(screen.getByText('Operations')).toBeInTheDocument()
    })

    // Configuration mode should be recommended for prep phase
    await waitFor(() => {
      expect(screen.getByText('Recommended')).toBeInTheDocument()
    })
  })

  it('should handle mode switching with phase context', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Find and click operations mode button
    const operationsButton = await screen.findByText('Operations')
    fireEvent.click(operationsButton)

    // Should switch to operations mode
    await waitFor(() => {
      // The operations mode should be active (though may show limited functionality for prep phase)
      expect(operationsButton.closest('button')).toHaveClass('bg-background')
    })
  })

  it('should show phase-appropriate guidance', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Should show setup progress instead of old checklist
    await waitFor(() => {
      expect(screen.getByText('Setup Progress')).toBeInTheDocument()
      expect(screen.getByText('50% Complete')).toBeInTheDocument()
    })
  })
})

describe('Phase System Requirements Compliance', () => {
  it('should meet requirement 2.1 - display current phase prominently', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      // Phase should be displayed prominently in header
      expect(screen.getByText('Preparation')).toBeInTheDocument()
    })
  })

  it('should meet requirement 2.2 - show phase-appropriate action items', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      // Should show phase management widget with action items
      expect(screen.getByText('Project Phase')).toBeInTheDocument()
    })
  })

  it('should meet requirement 2.8 - replace activation with phase transitions', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Should NOT show old activate button
    expect(screen.queryByText('Set Project to Active')).not.toBeInTheDocument()
    expect(screen.queryByText('Archive Project')).not.toBeInTheDocument()

    // Should show phase management instead
    await waitFor(() => {
      expect(screen.getByText('Project Phase')).toBeInTheDocument()
    })
  })
})