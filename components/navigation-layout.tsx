'use client'

import React from 'react'
import { useAuth } from '@/lib/auth'
import { NavigationProvider, Navigation } from '@/components/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { NavigationUser } from '@/lib/types'

interface NavigationLayoutProps {
  children: React.ReactNode
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  const { user, userProfile, loading } = useAuth()
  const isMobile = useIsMobile()

  // Convert auth user data to NavigationUser format
  const navigationUser: NavigationUser | null = React.useMemo(() => {
    if (!user || !userProfile) return null

    return {
      id: user.id,
      name: userProfile.full_name,
      email: userProfile.email,
      avatar: user.user_metadata?.avatar_url,
      systemRole: userProfile.role, // This is now the system role
      currentProjectRole: null // This would be set when a project is selected
    }
  }, [user, userProfile])

  // Don't render navigation during loading or if no user
  if (loading) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    )
  }

  // If no user, render without navigation
  if (!navigationUser) {
    return (
      <div className="min-h-screen">
        {children}
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
            "md:pt-[73px]", // Navigation height + border + padding
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