import { 
  FolderIcon, 
  UsersIcon, 
  StarIcon, 
  ClipboardListIcon,
  UserIcon
} from 'lucide-react'
import { NavItem, UserRole } from './types'

// Navigation items configuration with role-based filtering
export const navigationItems: NavItem[] = [
  {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    icon: FolderIcon,
    roles: ['admin', 'in_house']
  },
  {
    id: 'team',
    label: 'Team',
    href: '/team',
    icon: UsersIcon,
    roles: ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator']
  },
  {
    id: 'talent',
    label: 'Talent',
    href: '/talent',
    icon: StarIcon,
    roles: ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort']
  },
  {
    id: 'timecards',
    label: 'Timecards',
    href: '/timecards',
    icon: ClipboardListIcon,
    roles: ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort']
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: UserIcon,
    roles: ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort']
  }
]

// Helper function to filter navigation items based on user role
export function getNavigationItemsForRole(userRole: UserRole): NavItem[] {
  return navigationItems.filter(item => item.roles.includes(userRole))
}

// Helper function to check if a user has access to a specific navigation item
export function hasAccessToNavItem(userRole: UserRole, navItemId: string): boolean {
  const item = navigationItems.find(item => item.id === navItemId)
  return item ? item.roles.includes(userRole) : false
}

// Get default route for a user role (first available navigation item)
export function getDefaultRouteForRole(userRole: UserRole): string {
  const availableItems = getNavigationItemsForRole(userRole)
  return availableItems.length > 0 ? availableItems[0].href : '/talent'
}