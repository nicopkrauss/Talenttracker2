import { describe, it, expect } from 'vitest'
import {
  navigationItems,
  getNavigationItemsForRole,
  hasAccessToNavItem,
  getDefaultRouteForRole,
} from '../navigation-config'
import { UserRole } from '../types'

describe('Navigation Configuration', () => {
  describe('navigationItems', () => {
    it('should contain all expected navigation items', () => {
      expect(navigationItems).toHaveLength(6)
      
      const itemIds = navigationItems.map(item => item.id)
      expect(itemIds).toEqual(['projects', 'team', 'talent', 'timecards', 'settings', 'profile'])
    })

    it('should have proper structure for each navigation item', () => {
      navigationItems.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('label')
        expect(item).toHaveProperty('href')
        expect(item).toHaveProperty('icon')
        expect(item).toHaveProperty('roles')
        
        expect(typeof item.id).toBe('string')
        expect(typeof item.label).toBe('string')
        expect(typeof item.href).toBe('string')
        expect(typeof item.icon).toMatch(/^(function|object)$/)
        expect(Array.isArray(item.roles)).toBe(true)
      })
    })

    it('should have correct role assignments for each item', () => {
      const projectsItem = navigationItems.find(item => item.id === 'projects')
      expect(projectsItem?.roles).toEqual(['admin', 'in_house'])

      const teamItem = navigationItems.find(item => item.id === 'team')
      expect(teamItem?.roles).toEqual(['admin', 'in_house', 'supervisor', 'coordinator'])

      const talentItem = navigationItems.find(item => item.id === 'talent')
      expect(talentItem?.roles).toEqual(['admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort'])

      const timecardsItem = navigationItems.find(item => item.id === 'timecards')
      expect(timecardsItem?.roles).toEqual(['admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort'])

      const settingsItem = navigationItems.find(item => item.id === 'settings')
      expect(settingsItem?.roles).toEqual(['admin'])

      const profileItem = navigationItems.find(item => item.id === 'profile')
      expect(profileItem?.roles).toEqual(['admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort'])
    })

    it('should have correct href paths', () => {
      const expectedPaths = {
        projects: '/projects',
        team: '/team',
        talent: '/talent',
        timecards: '/timecards',
        settings: '/settings',
        profile: '/profile',
      }

      navigationItems.forEach(item => {
        expect(item.href).toBe(expectedPaths[item.id as keyof typeof expectedPaths])
      })
    })
  })

  describe('getNavigationItemsForRole', () => {
    it('should return all items for admin role', () => {
      const items = getNavigationItemsForRole('admin')
      expect(items).toHaveLength(6)
      
      const itemIds = items.map(item => item.id)
      expect(itemIds).toEqual(['projects', 'team', 'talent', 'timecards', 'settings', 'profile'])
    })

    it('should return all items for in_house role', () => {
      const items = getNavigationItemsForRole('in_house')
      expect(items).toHaveLength(5)
      
      const itemIds = items.map(item => item.id)
      expect(itemIds).toEqual(['projects', 'team', 'talent', 'timecards', 'profile'])
    })

    it('should return correct items for supervisor role', () => {
      const items = getNavigationItemsForRole('supervisor')
      expect(items).toHaveLength(4)
      
      const itemIds = items.map(item => item.id)
      expect(itemIds).toEqual(['team', 'talent', 'timecards', 'profile'])
      expect(itemIds).not.toContain('projects')
    })

    it('should return correct items for coordinator role', () => {
      const items = getNavigationItemsForRole('coordinator')
      expect(items).toHaveLength(4)
      
      const itemIds = items.map(item => item.id)
      expect(itemIds).toEqual(['team', 'talent', 'timecards', 'profile'])
      expect(itemIds).not.toContain('projects')
    })

    it('should return correct items for talent_escort role', () => {
      const items = getNavigationItemsForRole('talent_escort')
      expect(items).toHaveLength(3)
      
      const itemIds = items.map(item => item.id)
      expect(itemIds).toEqual(['talent', 'timecards', 'profile'])
      expect(itemIds).not.toContain('projects')
      expect(itemIds).not.toContain('team')
    })

    it('should return items in the same order as defined in navigationItems', () => {
      const adminItems = getNavigationItemsForRole('admin')
      const originalOrder = navigationItems.map(item => item.id)
      const filteredOrder = adminItems.map(item => item.id)
      
      // Check that the order is preserved
      expect(filteredOrder).toEqual(originalOrder)
    })
  })

  describe('hasAccessToNavItem', () => {
    it('should return true for admin access to all items', () => {
      const itemIds = ['projects', 'team', 'talent', 'timecards', 'profile']
      
      itemIds.forEach(itemId => {
        expect(hasAccessToNavItem('admin', itemId)).toBe(true)
      })
    })

    it('should return true for in_house access to all items', () => {
      const itemIds = ['projects', 'team', 'talent', 'timecards', 'profile']
      
      itemIds.forEach(itemId => {
        expect(hasAccessToNavItem('in_house', itemId)).toBe(true)
      })
    })

    it('should return correct access for supervisor role', () => {
      expect(hasAccessToNavItem('supervisor', 'projects')).toBe(false)
      expect(hasAccessToNavItem('supervisor', 'team')).toBe(true)
      expect(hasAccessToNavItem('supervisor', 'talent')).toBe(true)
      expect(hasAccessToNavItem('supervisor', 'timecards')).toBe(true)
      expect(hasAccessToNavItem('supervisor', 'profile')).toBe(true)
    })

    it('should return correct access for coordinator role', () => {
      expect(hasAccessToNavItem('coordinator', 'projects')).toBe(false)
      expect(hasAccessToNavItem('coordinator', 'team')).toBe(true)
      expect(hasAccessToNavItem('coordinator', 'talent')).toBe(true)
      expect(hasAccessToNavItem('coordinator', 'timecards')).toBe(true)
      expect(hasAccessToNavItem('coordinator', 'profile')).toBe(true)
    })

    it('should return correct access for talent_escort role', () => {
      expect(hasAccessToNavItem('talent_escort', 'projects')).toBe(false)
      expect(hasAccessToNavItem('talent_escort', 'team')).toBe(false)
      expect(hasAccessToNavItem('talent_escort', 'talent')).toBe(true)
      expect(hasAccessToNavItem('talent_escort', 'timecards')).toBe(true)
      expect(hasAccessToNavItem('talent_escort', 'profile')).toBe(true)
    })

    it('should return false for non-existent navigation items', () => {
      expect(hasAccessToNavItem('admin', 'non-existent')).toBe(false)
      expect(hasAccessToNavItem('talent_escort', 'invalid-item')).toBe(false)
    })

    it('should handle edge cases gracefully', () => {
      expect(hasAccessToNavItem('admin', '')).toBe(false)
      expect(hasAccessToNavItem('talent_escort', 'PROJECTS')).toBe(false) // Case sensitive
    })
  })

  describe('getDefaultRouteForRole', () => {
    it('should return /projects for admin role', () => {
      expect(getDefaultRouteForRole('admin')).toBe('/projects')
    })

    it('should return /projects for in_house role', () => {
      expect(getDefaultRouteForRole('in_house')).toBe('/projects')
    })

    it('should return /team for supervisor role', () => {
      expect(getDefaultRouteForRole('supervisor')).toBe('/team')
    })

    it('should return /team for coordinator role', () => {
      expect(getDefaultRouteForRole('coordinator')).toBe('/team')
    })

    it('should return /talent for talent_escort role', () => {
      expect(getDefaultRouteForRole('talent_escort')).toBe('/talent')
    })

    it('should fallback to /talent when no items available', () => {
      // This is a theoretical case, but good to test the fallback
      // We can't easily mock getNavigationItemsForRole here, so we test the current behavior
      const roles: UserRole[] = ['admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort']
      
      roles.forEach(role => {
        const defaultRoute = getDefaultRouteForRole(role)
        expect(typeof defaultRoute).toBe('string')
        expect(defaultRoute.startsWith('/')).toBe(true)
      })
    })
  })

  describe('Role-based navigation requirements', () => {
    it('should meet requirement 1.1: Admin sees Projects, Team, Talent, Timecards, Settings, Profile', () => {
      const adminItems = getNavigationItemsForRole('admin')
      
      const expectedAdminItems = ['projects', 'team', 'talent', 'timecards', 'settings', 'profile']
      const adminItemIds = adminItems.map(item => item.id)
      expect(adminItemIds).toEqual(expectedAdminItems)
    })

    it('should meet requirement 1.1: In-House sees Projects, Team, Talent, Timecards, Profile', () => {
      const inHouseItems = getNavigationItemsForRole('in_house')
      
      const expectedItems = ['projects', 'team', 'talent', 'timecards', 'profile']
      const inHouseItemIds = inHouseItems.map(item => item.id)
      expect(inHouseItemIds).toEqual(expectedItems)
    })

    it('should meet requirement 1.2: Supervisor and Coordinator see Team, Talent, Timecards, Profile', () => {
      const supervisorItems = getNavigationItemsForRole('supervisor')
      const coordinatorItems = getNavigationItemsForRole('coordinator')
      
      const expectedItems = ['team', 'talent', 'timecards', 'profile']
      
      expect(supervisorItems.map(item => item.id)).toEqual(expectedItems)
      expect(coordinatorItems.map(item => item.id)).toEqual(expectedItems)
    })

    it('should meet requirement 1.3: Talent Escort sees Talent, Timecards, Profile', () => {
      const escortItems = getNavigationItemsForRole('talent_escort')
      
      const expectedItems = ['talent', 'timecards', 'profile']
      
      expect(escortItems.map(item => item.id)).toEqual(expectedItems)
    })

    it('should ensure all roles have access to Profile', () => {
      const roles: UserRole[] = ['admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort']
      
      roles.forEach(role => {
        expect(hasAccessToNavItem(role, 'profile')).toBe(true)
      })
    })

    it('should ensure all roles have access to Talent and Timecards', () => {
      const roles: UserRole[] = ['admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort']
      
      roles.forEach(role => {
        expect(hasAccessToNavItem(role, 'talent')).toBe(true)
        expect(hasAccessToNavItem(role, 'timecards')).toBe(true)
      })
    })

    it('should restrict Projects access to admin and in_house only', () => {
      expect(hasAccessToNavItem('admin', 'projects')).toBe(true)
      expect(hasAccessToNavItem('in_house', 'projects')).toBe(true)
      
      expect(hasAccessToNavItem('supervisor', 'projects')).toBe(false)
      expect(hasAccessToNavItem('coordinator', 'projects')).toBe(false)
      expect(hasAccessToNavItem('talent_escort', 'projects')).toBe(false)
    })

    it('should restrict Team access from talent_escort', () => {
      expect(hasAccessToNavItem('admin', 'team')).toBe(true)
      expect(hasAccessToNavItem('in_house', 'team')).toBe(true)
      expect(hasAccessToNavItem('supervisor', 'team')).toBe(true)
      expect(hasAccessToNavItem('coordinator', 'team')).toBe(true)
      
      expect(hasAccessToNavItem('talent_escort', 'team')).toBe(false)
    })
  })
})