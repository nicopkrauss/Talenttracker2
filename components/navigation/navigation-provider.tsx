'use client'

import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { NavigationState, NavigationUser, ProjectRole, NavItem, UserRole } from '@/lib/types'
import { getNavigationItemsForRole } from '@/lib/navigation-config'
import { getEffectiveUserRole } from '@/lib/role-utils'

interface NavigationContextType extends NavigationState {
  user: NavigationUser | null
  isActiveRoute: (href: string) => boolean
}

interface NavigationProviderProps {
  children: ReactNode
  user: NavigationUser | null
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children, user }: NavigationProviderProps) {
  const pathname = usePathname()
  
  const navigationState = useMemo<NavigationContextType>(() => {
    // Determine effective user role for navigation using role utilities
    // Priority: system role > project role > default (talent_escort)
    const userRole: UserRole = getEffectiveUserRole(
      user?.systemRole || null, 
      user?.currentProjectRole || null
    )
    
    // Get available navigation items based on effective user role
    const availableItems = getNavigationItemsForRole(userRole)
    
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
      isActiveRoute
    }
  }, [pathname, user])
  
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