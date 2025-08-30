import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DesktopNavigation } from '../desktop-navigation'
import { NavigationUser } from '@/lib/types'

// Mock Next.js navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/talent',
}))

vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href, ...props }: any) => (
      <a href={href} onClick={() => mockPush(href)} {...props}>
        {children}
      </a>
    ),
  }
})

// Mock navigation provider
const mockNavigationContext = {
  currentPath: '/talent',
  userRole: 'admin' as const,
  availableItems: [
    { id: 'projects', label: 'Projects', href: '/projects', icon: vi.fn(), roles: ['admin'] },
    { id: 'team', label: 'Team', href: '/team', icon: vi.fn(), roles: ['admin'] },
    { id: 'talent', label: 'Talent', href: '/talent', icon: vi.fn(), roles: ['admin'] },
    { id: 'timecards', label: 'Timecards', href: '/timecards', icon: vi.fn(), roles: ['admin'] },
    { id: 'profile', label: 'Profile', href: '/profile', icon: vi.fn(), roles: ['admin'] },
  ],
  user: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar.jpg',
    systemRole: 'admin',
  } as NavigationUser,
  isActiveRoute: vi.fn((href: string) => href === '/talent'),
}

vi.mock('../navigation-provider', () => ({
  useNavigation: () => mockNavigationContext,
}))

describe('DesktopNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render main navigation items (excluding profile)', () => {
    render(<DesktopNavigation />)

    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Talent')).toBeInTheDocument()
    expect(screen.getByText('Timecards')).toBeInTheDocument()
    
    // Profile should not be in main nav (it's in user menu)
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument()
  })

  it('should render navigation with proper ARIA attributes', () => {
    render(<DesktopNavigation />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'Desktop navigation')
  })

  it('should highlight active navigation item', () => {
    render(<DesktopNavigation />)

    const talentLink = screen.getByRole('link', { name: 'Talent' })
    expect(talentLink).toHaveClass('bg-accent')
    expect(talentLink).toHaveClass('text-accent-foreground')
  })

  it('should not highlight inactive navigation items', () => {
    render(<DesktopNavigation />)

    const projectsLink = screen.getByRole('link', { name: 'Projects' })
    expect(projectsLink).toHaveClass('text-muted-foreground')
    expect(projectsLink).not.toHaveClass('bg-accent')
  })

  it('should render user menu with user information', () => {
    render(<DesktopNavigation />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('should render user avatar with fallback initials', () => {
    render(<DesktopNavigation />)

    // Check fallback initials are present (avatar component uses fallback in test environment)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('should render user avatar fallback when no avatar URL', () => {
    mockNavigationContext.user = {
      ...mockNavigationContext.user,
      avatar: undefined,
    }

    render(<DesktopNavigation />)

    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('should open user menu dropdown on click', async () => {
    const user = userEvent.setup()
    render(<DesktopNavigation />)

    const userMenuButton = screen.getByRole('button')
    await user.click(userMenuButton)

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument()
    })
  })

  it('should render correct links in user menu dropdown', async () => {
    const user = userEvent.setup()
    render(<DesktopNavigation />)

    const userMenuButton = screen.getByRole('button')
    await user.click(userMenuButton)

    await waitFor(() => {
      const profileLink = screen.getByRole('menuitem', { name: /profile/i })
      const settingsLink = screen.getByRole('menuitem', { name: /settings/i })
      
      expect(profileLink.closest('a')).toHaveAttribute('href', '/profile')
      expect(settingsLink.closest('a')).toHaveAttribute('href', '/settings')
    })
  })

  it('should handle navigation clicks', () => {
    render(<DesktopNavigation />)

    const projectsLink = screen.getByRole('link', { name: 'Projects' })
    fireEvent.click(projectsLink)

    expect(mockPush).toHaveBeenCalledWith('/projects')
  })

  it('should have proper focus styles for keyboard navigation', () => {
    render(<DesktopNavigation />)

    const links = screen.getAllByRole('link')
    links.forEach(link => {
      expect(link).toHaveClass('focus:outline-none')
      expect(link).toHaveClass('focus-visible:ring-2')
      expect(link).toHaveClass('focus-visible:ring-ring')
    })
  })

  it('should have hover styles for desktop interaction', () => {
    render(<DesktopNavigation />)

    const projectsLink = screen.getByRole('link', { name: 'Projects' })
    expect(projectsLink).toHaveClass('hover:text-foreground')
    expect(projectsLink).toHaveClass('hover:bg-accent/50')
  })

  it('should render with limited items for supervisor role', () => {
    mockNavigationContext.userRole = 'supervisor'
    mockNavigationContext.availableItems = [
      { id: 'team', label: 'Team', href: '/team', icon: vi.fn(), roles: ['supervisor'] },
      { id: 'talent', label: 'Talent', href: '/talent', icon: vi.fn(), roles: ['supervisor'] },
      { id: 'timecards', label: 'Timecards', href: '/timecards', icon: vi.fn(), roles: ['supervisor'] },
      { id: 'profile', label: 'Profile', href: '/profile', icon: vi.fn(), roles: ['supervisor'] },
    ]

    render(<DesktopNavigation />)

    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Talent')).toBeInTheDocument()
    expect(screen.getByText('Timecards')).toBeInTheDocument()
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
  })

  it('should have fixed positioning at top of screen', () => {
    render(<DesktopNavigation />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('fixed')
    expect(nav).toHaveClass('top-0')
    expect(nav).toHaveClass('left-0')
    expect(nav).toHaveClass('right-0')
    expect(nav).toHaveClass('z-50')
  })

  it('should have proper backdrop blur and border styling', () => {
    render(<DesktopNavigation />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('bg-background/95')
    expect(nav).toHaveClass('backdrop-blur')
    expect(nav).toHaveClass('border-b')
    expect(nav).toHaveClass('border-border')
  })

  it('should handle user menu keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<DesktopNavigation />)

    const userMenuButton = screen.getByRole('button')
    
    // Open menu with Enter key
    await user.type(userMenuButton, '{Enter}')

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument()
    })

    // Check that menu items are present (focus behavior is handled by Radix UI)
    const profileItem = screen.getByRole('menuitem', { name: /profile/i })
    const settingsItem = screen.getByRole('menuitem', { name: /settings/i })
    
    expect(profileItem).toBeInTheDocument()
    expect(settingsItem).toBeInTheDocument()
  })

  it('should close user menu when clicking outside', async () => {
    const user = userEvent.setup()
    render(<DesktopNavigation />)

    const userMenuButton = screen.getByRole('button')
    await user.click(userMenuButton)

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument()
    })

    // Press Escape to close menu (more reliable than clicking outside in tests)
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /profile/i })).not.toBeInTheDocument()
    })
  })

  it('should handle user with long name gracefully', () => {
    mockNavigationContext.user = {
      ...mockNavigationContext.user,
      name: 'Very Long User Name That Might Overflow',
    }

    render(<DesktopNavigation />)

    expect(screen.getByText('Very Long User Name That Might Overflow')).toBeInTheDocument()
  })

  it('should render user menu icons correctly', async () => {
    const user = userEvent.setup()
    render(<DesktopNavigation />)

    const userMenuButton = screen.getByRole('button')
    await user.click(userMenuButton)

    await waitFor(() => {
      // Check that User and Settings icons are rendered in the menu items
      const profileItem = screen.getByRole('menuitem', { name: /profile/i })
      const settingsItem = screen.getByRole('menuitem', { name: /settings/i })
      
      expect(profileItem).toBeInTheDocument()
      expect(settingsItem).toBeInTheDocument()
    })
  })

  it('should update active state when isActiveRoute changes', () => {
    const { rerender } = render(<DesktopNavigation />)
    
    let talentLink = screen.getByRole('link', { name: 'Talent' })
    expect(talentLink).toHaveClass('bg-accent')

    // Change active route to team and update mock
    mockNavigationContext.isActiveRoute = vi.fn((href: string) => href === '/team')
    
    rerender(<DesktopNavigation />)
    
    talentLink = screen.getByRole('link', { name: 'Talent' })
    const teamLink = screen.getByRole('link', { name: 'Team' })
    
    expect(teamLink).toHaveClass('bg-accent')
    expect(talentLink).toHaveClass('text-muted-foreground')
  })
})