import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import TimecardsPage from '../page'
import { useAuth } from '@/lib/auth-context'
import { vi } from 'vitest'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/components/timecards/timecard-project-hub', () => ({
  TimecardProjectHub: ({ userRole, onSelectProject }: any) => (
    <div data-testid="timecard-project-hub">
      Project Hub for {userRole}
    </div>
  ),
}))

const mockRouter = {
  push: vi.fn(),
}

const mockUseRouter = useRouter as ReturnType<typeof vi.fn>
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

describe('TimecardsPage Role-Based Routing', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter as any)
    vi.clearAllMocks()
  })

  it('shows TimecardProjectHub for admin users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      userProfile: { role: 'admin', full_name: 'Admin User', email: 'admin@test.com' },
      loading: false,
      authLoading: false,
      isAuthenticated: true,
    } as any)

    render(<TimecardsPage />)

    expect(screen.getByTestId('timecard-project-hub')).toBeInTheDocument()
    expect(screen.getByText('Project Hub for admin')).toBeInTheDocument()
  })

  it('shows TimecardProjectHub for in_house users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2' },
      userProfile: { role: 'in_house', full_name: 'In House User', email: 'inhouse@test.com' },
      loading: false,
      authLoading: false,
      isAuthenticated: true,
    } as any)

    render(<TimecardsPage />)

    expect(screen.getByTestId('timecard-project-hub')).toBeInTheDocument()
    expect(screen.getByText('Project Hub for in_house')).toBeInTheDocument()
  })

  it('shows regular timecard interface for supervisor users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-3' },
      userProfile: { role: 'supervisor', full_name: 'Supervisor User', email: 'supervisor@test.com' },
      loading: false,
      authLoading: false,
      isAuthenticated: true,
    } as any)

    render(<TimecardsPage />)

    // Should not show the project hub
    expect(screen.queryByTestId('timecard-project-hub')).not.toBeInTheDocument()
    
    // Should show the regular timecard tabs
    expect(screen.getByText('My Timecards')).toBeInTheDocument()
  })

  it('shows regular timecard interface for talent_escort users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-4' },
      userProfile: { role: 'talent_escort', full_name: 'Escort User', email: 'escort@test.com' },
      loading: false,
      authLoading: false,
      isAuthenticated: true,
    } as any)

    render(<TimecardsPage />)

    // Should not show the project hub
    expect(screen.queryByTestId('timecard-project-hub')).not.toBeInTheDocument()
    
    // Should show the regular timecard tabs
    expect(screen.getByText('My Timecards')).toBeInTheDocument()
  })

  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      userProfile: null,
      loading: true,
      authLoading: true,
      isAuthenticated: false,
    } as any)

    render(<TimecardsPage />)

    // Should show loading skeleton
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      userProfile: null,
      loading: false,
      authLoading: false,
      isAuthenticated: false,
    } as any)

    render(<TimecardsPage />)

    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })
})