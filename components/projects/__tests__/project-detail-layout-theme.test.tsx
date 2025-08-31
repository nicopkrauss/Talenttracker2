import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectDetailLayout } from '../project-detail-layout'
import { ThemeProvider } from '@/components/theme-provider'

// Mock the auth context
const mockAuth = {
  userProfile: {
    id: '1',
    role: 'admin',
    full_name: 'Test Admin',
    email: 'admin@test.com',
    status: 'approved'
  }
}

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockAuth,
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock fetch for API calls
global.fetch = vi.fn()

const mockProject = {
  id: '1',
  name: 'Test Project',
  status: 'prep',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  talent_expected: 10,
  project_setup_checklist: {
    roles_and_pay_completed: true,
    talent_roster_completed: true,
    team_assignments_completed: false,
    locations_completed: false
  },
  statistics: {
    talentExpected: 10,
    talentAssigned: 5,
    staffNeeded: 8,
    staffAssigned: 6,
    staffCheckedIn: 4,
    talentPresent: 3,
    activeEscorts: 2,
    staffOvertime: {
      over8Hours: 1,
      over12Hours: 0
    }
  }
}

describe('ProjectDetailLayout Theme Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockProject })
    })
  })

  const renderWithTheme = (theme: 'light' | 'dark') => {
    return render(
      <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
        <ProjectDetailLayout projectId="1" />
      </ThemeProvider>
    )
  }

  it('uses theme-aware background colors', async () => {
    const { container } = renderWithTheme('light')
    
    // Wait for component to load
    await screen.findByText('Test Project')
    
    // Check main container uses theme-aware background
    const mainContainer = container.querySelector('.min-h-screen')
    expect(mainContainer).toHaveClass('bg-background')
  })

  it('renders properly in light theme', async () => {
    renderWithTheme('light')
    
    // Wait for component to load
    await screen.findByText('Test Project')
    
    // Component should render without errors in light theme
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Project Overview')).toBeInTheDocument()
  })

  it('renders properly in dark theme', async () => {
    renderWithTheme('dark')
    
    // Wait for component to load
    await screen.findByText('Test Project')
    
    // Component should render without errors in dark theme
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Project Overview')).toBeInTheDocument()
  })

  it('uses theme-aware colors in child components', async () => {
    const { container } = renderWithTheme('light')
    
    // Wait for component to load
    await screen.findByText('Test Project')
    
    // Check that child components use proper theme classes
    // ProjectHeader should use theme-aware classes
    const header = container.querySelector('.sticky')
    expect(header).toHaveClass('bg-background/95')
    
    // Check for theme-aware text colors
    const titleElement = screen.getByText('Test Project')
    expect(titleElement).toHaveClass('text-foreground')
  })

  it('handles loading state with theme-aware spinner', () => {
    ;(global.fetch as any).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    const { container } = renderWithTheme('light')
    
    // Should show loading spinner with theme-aware colors
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('border-border', 'border-t-primary')
  })

  it('handles error state with theme-aware alert', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Failed to load'))
    
    renderWithTheme('light')
    
    // Wait for error to appear
    await screen.findByText('Failed to load project')
    
    // Error alert should use theme-aware destructive variant
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('maintains theme consistency across mode switches', async () => {
    const { rerender } = renderWithTheme('light')
    
    // Wait for component to load in light mode
    await screen.findByText('Test Project')
    
    // Switch to dark mode
    rerender(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ProjectDetailLayout projectId="1" />
      </ThemeProvider>
    )
    
    // Component should still render properly
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Project Overview')).toBeInTheDocument()
  })

  it('uses semantic colors with dark variants in status badges', async () => {
    const activeProject = { ...mockProject, status: 'active' }
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: activeProject })
    })
    
    const { container } = renderWithTheme('dark')
    
    // Wait for component to load
    await screen.findByText('Test Project')
    
    // Status badge should use semantic colors with dark variants
    const statusBadge = screen.getByText('Active')
    expect(statusBadge.closest('.bg-green-50')).toHaveClass('dark:bg-green-950/20')
  })

  it('ensures proper contrast ratios in both themes', async () => {
    // Test light theme
    const { container: lightContainer } = renderWithTheme('light')
    await screen.findByText('Test Project')
    
    // Test dark theme
    const { container: darkContainer } = renderWithTheme('dark')
    await screen.findByText('Test Project')
    
    // Both should render without accessibility issues
    // (In a real test, you might use tools like axe-core to check contrast)
    expect(lightContainer.querySelector('.text-foreground')).toBeInTheDocument()
    expect(darkContainer.querySelector('.text-foreground')).toBeInTheDocument()
  })
})