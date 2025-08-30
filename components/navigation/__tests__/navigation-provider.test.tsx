import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavigationProvider, useNavigation, useActiveNavItem, useHasAccess } from '../navigation-provider'
import { NavigationUser } from '@/lib/types'

// Mock Next.js navigation
const mockPathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

// Mock role utilities
vi.mock('@/lib/role-utils', () => ({
  getEffectiveUserRole: vi.fn((systemRole, projectRole) => {
    if (systemRole) return systemRole
    if (projectRole) return projectRole
    return 'talent_escort'
  }),
}))

// Mock navigation config
vi.mock('@/lib/navigation-config', () => ({
  getNavigationItemsForRole: vi.fn((role) => {
    const allItems = [
      { id: 'projects', label: 'Projects', href: '/projects', icon: vi.fn(), roles: ['admin', 'in_house'] },
      { id: 'team', label: 'Team', href: '/team', icon: vi.fn(), roles: ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator'] },
      { id: 'talent', label: 'Talent', href: '/talent', icon: vi.fn(), roles: ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'] },
      { id: 'timecards', label: 'Timecards', href: '/timecards', icon: vi.fn(), roles: ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'] },
      { id: 'profile', label: 'Profile', href: '/profile', icon: vi.fn(), roles: ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'] },
    ]
    return allItems.filter(item => item.roles.includes(role))
  }),
}))

// Test component to access navigation context
function TestComponent() {
  const navigation = useNavigation()
  const activeItem = useActiveNavItem()
  const hasProjectsAccess = useHasAccess('projects')
  const hasTalentAccess = useHasAccess('talent')

  return (
    <div>
      <div data-testid="current-path">{navigation.currentPath}</div>
      <div data-testid="user-role">{navigation.userRole}</div>
      <div data-testid="available-items-count">{navigation.availableItems.length}</div>
      <div data-testid="active-item">{activeItem?.id || 'none'}</div>
      <div data-testid="has-projects-access">{hasProjectsAccess.toString()}</div>
      <div data-testid="has-talent-access">{hasTalentAccess.toString()}</div>
      <div data-testid="user-name">{navigation.user?.name || 'no-user'}</div>
    </div>
  )
}

describe('NavigationProvider', () => {
  const mockUser: NavigationUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    systemRole: 'admin',
    currentProjectRole: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/talent')
  })

  it('should provide navigation context with user data', () => {
    render(
      <NavigationProvider user={mockUser}>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByTestId('current-path')).toHaveTextContent('/talent')
    expect(screen.getByTestId('user-role')).toHaveTextContent('admin')
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
  })

  it('should filter navigation items based on user role', () => {
    render(
      <NavigationProvider user={mockUser}>
        <TestComponent />
      </NavigationProvider>
    )

    // Admin should have access to all items (5 items)
    expect(screen.getByTestId('available-items-count')).toHaveTextContent('5')
    expect(screen.getByTestId('has-projects-access')).toHaveTextContent('true')
    expect(screen.getByTestId('has-talent-access')).toHaveTextContent('true')
  })

  it('should work with talent escort role (limited access)', () => {
    const talentEscortUser: NavigationUser = {
      ...mockUser,
      systemRole: null,
      currentProjectRole: 'talent_escort',
    }

    render(
      <NavigationProvider user={talentEscortUser}>
        <TestComponent />
      </NavigationProvider>
    )

    // Talent escort should have limited access (3 items: talent, timecards, profile)
    expect(screen.getByTestId('user-role')).toHaveTextContent('talent_escort')
    expect(screen.getByTestId('available-items-count')).toHaveTextContent('3')
    expect(screen.getByTestId('has-projects-access')).toHaveTextContent('false')
    expect(screen.getByTestId('has-talent-access')).toHaveTextContent('true')
  })

  it('should detect active routes correctly', () => {
    mockPathname.mockReturnValue('/talent/123')

    render(
      <NavigationProvider user={mockUser}>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByTestId('active-item')).toHaveTextContent('talent')
  })

  it('should handle root path correctly', () => {
    mockPathname.mockReturnValue('/')

    render(
      <NavigationProvider user={mockUser}>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByTestId('current-path')).toHaveTextContent('/')
    expect(screen.getByTestId('active-item')).toHaveTextContent('none')
  })

  it('should handle null user', () => {
    render(
      <NavigationProvider user={null}>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByTestId('user-role')).toHaveTextContent('talent_escort')
    expect(screen.getByTestId('user-name')).toHaveTextContent('no-user')
  })

  it('should throw error when useNavigation is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useNavigation must be used within a NavigationProvider')

    consoleSpy.mockRestore()
  })

  it('should update when pathname changes', () => {
    const { rerender } = render(
      <NavigationProvider user={mockUser}>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByTestId('current-path')).toHaveTextContent('/talent')

    mockPathname.mockReturnValue('/team')
    
    rerender(
      <NavigationProvider user={mockUser}>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByTestId('current-path')).toHaveTextContent('/team')
  })

  it('should update when user role changes', () => {
    const { rerender } = render(
      <NavigationProvider user={mockUser}>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByTestId('user-role')).toHaveTextContent('admin')
    expect(screen.getByTestId('available-items-count')).toHaveTextContent('5')

    const supervisorUser: NavigationUser = {
      ...mockUser,
      systemRole: null,
      currentProjectRole: 'supervisor',
    }

    rerender(
      <NavigationProvider user={supervisorUser}>
        <TestComponent />
      </NavigationProvider>
    )

    expect(screen.getByTestId('user-role')).toHaveTextContent('supervisor')
    expect(screen.getByTestId('available-items-count')).toHaveTextContent('4')
  })
})