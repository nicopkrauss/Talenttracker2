'use client'

import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { NavigationState, NavigationUser, ProjectRole, NavItem, UserRole } from '@/lib/types'
import { getNavigationItemsForRole } from '@/lib/navigation-config'
import { getEffectiveUserRole } from '@/lib/role-utils'
import { useFeatureAvailability } from '@/hooks/use-feature-availability'

interface NavigationContextType extends NavigationState {
  user: NavigationUser | null
  isActiveRoute: (href: string) => boolean
  currentProjectId?: string
  featureAvailability?: ReturnType<typeof useFeatureAvailability>['features']
}

interface NavigationProviderProps {
  children: ReactNode
  user: NavigationUser | null
  currentProjectId?: string
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children, user, currentProjectId }: NavigationProviderProps) {
  const pathname = usePathname()
  
  // Get feature availability for current project if available
  const { features: featureAvailability } = useFeatureAvailability(currentProjectId || '')
  
  const navigationState = useMemo<NavigationContextType>(() => {
    // Determine effective user role for navigation using role utilities
    // Priority: system role > project role > default (talent_escort)
    const userRole: UserRole = getEffectiveUserRole(
      user?.systemRole || null, 
      user?.currentProjectRole || null
    )
    
    // Get available navigation items based on effective user role
    let availableItems = getNavigationItemsForRole(userRole)
    
    // Filter navigation items based on feature availability if we have a current project
    if (currentProjectId && featureAvailability) {
      availableItems = availableItems.filter(item => {
        // Check if navigation item requires specific features
        switch (item.id) {
          case 'timecards':
            return featureAvailability.timecards.available
          case 'talent':
            // Talent management is always available but may have limited functionality
            return featureAvailability.talentManagement.available
          case 'team':
            return featureAvailability.teamManagement.available
          case 'projects':
            // Projects navigation is always available for admin/in_house
            return true
          case 'profile':
            // Profile is always available
            return true
          default:
            return true
        }
      })
    }
    
    // Helper function to check if a route is active
    const isActiveRoute = (href: string): boolean => {
      if (href === '/') return pathname === '/'
      return pathname.startsWith(href)
    }
    
    return {
      currentPath: pathname,
      userRole,
      availableItems,
      user,
      isActiveRoute,
      currentProjectId,
      featureAvailability: currentProjectId ? featureAvailability : undefined
    }
  }, [pathname, user, currentProjectId, featureAvailability])
  
  return (
    <NavigationContext.Provider value={navigationState}>
      {children}
    </NavigationContext.Provider>
  )
}

// Custom hook for consuming navigation context
export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext)
  
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  
  return context
}

// Additional helper hooks for common navigation operations
export function useActiveNavItem(): NavItem | undefined {
  const { availableItems, isActiveRoute } = useNavigation()
  return availableItems.find(item => isActiveRoute(item.href))
}

export function useHasAccess(navItemId: string): boolean {
  const { availableItems } = useNavigation()
  return availableItems.some(item => item.id === navItemId)
}