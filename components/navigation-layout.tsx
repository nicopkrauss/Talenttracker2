'use client'

import React from 'react'
import { NavigationProvider, Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { NavigationUser } from '@/lib/types'

interface NavigationLayoutProps {
  children: React.ReactNode
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  const isMobile = useIsMobile()
  const { user, userProfile, isAuthenticated, loading } = useAuth()

  // Create navigation user from auth context
  const navigationUser: NavigationUser | null = React.useMemo(() => {
    if (!isAuthenticated || !user || !userProfile) {
      return null
    }

    return {
      id: user.id,
      name: userProfile.full_name,
      email: userProfile.email,
      avatar: userProfile.profile_picture_url || undefined,
      systemRole: userProfile.role || 'admin', // Default to admin if no role set
      currentProjectRole: null // Will be enhanced in future tasks
    }
  }, [isAuthenticated, user, userProfile])

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <NavigationProvider user={navigationUser}>
      <div className="min-h-screen">
        <Navigation />
        
        {/* Main content area with proper spacing for navigation */}
        <main 
          className={cn(
            "min-h-screen transition-all duration-200",
            // Desktop: top padding for fixed top navigation
            "md:pt-[69px]", // Navigation height + border + padding
            // Mobile: bottom padding for fixed bottom navigation  
            "pb-[76px] md:pb-0" // Navigation height + safe area + padding
          )}
        >
          {children}
        </main>
      </div>
    </NavigationProvider>
  )
}