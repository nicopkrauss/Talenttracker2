import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ProjectDetailLayout } from '../project-detail-layout'

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    userProfile: { role: 'admin' }
  })
}))

// Mock Next.js navigation
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
    toString: () => '',
  }),
  usePathname: () => '/projects/test-project',
}))

// Mock the API calls
global.fetch = vi.fn()

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock the child components to focus on mode toggle functionality
vi.mock('../project-tabs', () => ({
  ProjectTabs: ({ project }: any) => (
    <div data-testid="project-tabs">Configuration Mode - {project.name}</div>
  )
}))

vi.mock('../operations-dashboard', () => ({
  OperationsDashboard: ({ project }: any) => (
    <div data-testid="operations-dashboard">Operations Mode - {project.name}</div>
  )
}))

vi.mock('../project-overview-card', () => ({
  ProjectOverviewCard: () => <div data-testid="project-overview-card">Overview</div>
}))

const mockProject = {
  id: 'test-project',
  name: 'Test Project',
  status: 'active',
  description: 'Test description',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  created_by: 'user-id',
  statistics: {
    talentExpected: 10,
    talentAssigned: 8,
    staffNeeded: 5,
    staffAssigned: 4,
    staffCheckedIn: 3,
    talentPresent: 6,
    activeEscorts: 2,
    staffOvertime: {
      over8Hours: 1,
      over12Hours: 0
    }
  }
}

describe('ProjectDetailLayout Mode Toggle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    
    // Mock successful API response
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockProject })
    })
  })

  it('renders mode toggle in header', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /configuration/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /operations/i })).toBeInTheDocument()
    })
  })

  it('starts in configuration mode by default', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByTestId('project-tabs')).toBeInTheDocument()
      expect(screen.queryByTestId('operations-dashboard')).not.toBeInTheDocument()
    })

    const configButton = screen.getByRole('tab', { name: /configuration/i })
    expect(configButton).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to operations mode when clicked', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByTestId('project-tabs')).toBeInTheDocument()
    })

    const opsButton = screen.getByRole('tab', { name: /operations/i })
    fireEvent.click(opsButton)

    await waitFor(() => {
      expect(screen.getByTestId('operations-dashboard')).toBeInTheDocument()
      expect(screen.queryByTestId('project-tabs')).not.toBeInTheDocument()
    })

    expect(opsButton).toHaveAttribute('aria-selected', 'true')
  })

  it('persists mode selection to localStorage', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /operations/i })).toBeInTheDocument()
    })

    const opsButton = screen.getByRole('tab', { name: /operations/i })
    fireEvent.click(opsButton)

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'project-mode-test-project',
      'operations'
    )
  })

  it('updates URL when mode changes', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /operations/i })).toBeInTheDocument()
    })

    const opsButton = screen.getByRole('tab', { name: /operations/i })
    fireEvent.click(opsButton)

    expect(mockReplace).toHaveBeenCalledWith(
      '/projects/test-project?mode=operations',
      { scroll: false }
    )
  })

  it('shows proper ARIA attributes for accessibility', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /configuration/i })).toBeInTheDocument()
    })

    const configPanel = screen.getByRole('tabpanel')
    expect(configPanel).toHaveAttribute('id', 'configuration-panel')
    expect(configPanel).toHaveAttribute('aria-labelledby', 'configuration-tab')

    // Switch to operations mode
    const opsButton = screen.getByRole('tab', { name: /operations/i })
    fireEvent.click(opsButton)

    await waitFor(() => {
      const opsPanel = screen.getByRole('tabpanel')
      expect(opsPanel).toHaveAttribute('id', 'operations-panel')
      expect(opsPanel).toHaveAttribute('aria-labelledby', 'operations-tab')
    })
  })

  it('handles keyboard shortcuts', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByTestId('project-tabs')).toBeInTheDocument()
    })

    // Simulate Alt+O for operations mode
    fireEvent.keyDown(document, { key: 'o', altKey: true })

    await waitFor(() => {
      expect(screen.getByTestId('operations-dashboard')).toBeInTheDocument()
    })

    // Simulate Alt+C for configuration mode
    fireEvent.keyDown(document, { key: 'c', altKey: true })

    await waitFor(() => {
      expect(screen.getByTestId('project-tabs')).toBeInTheDocument()
    })
  })

  it('shows responsive text on mobile', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument()
      expect(screen.getByText('Config')).toBeInTheDocument()
      expect(screen.getByText('Operations')).toBeInTheDocument()
      expect(screen.getByText('Ops')).toBeInTheDocument()
    })
  })
})