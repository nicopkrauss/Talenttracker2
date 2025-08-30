'use client'

import React, { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileNavigation } from './mobile-navigation'
import { DesktopNavigation } from './desktop-navigation'
import { cn } from '@/lib/utils'

/**
 * Main Navigation component that provides responsive navigation
 * Switches between mobile and desktop layouts based on screen size
 * Includes smooth transitions between layout changes
 */
export function Navigation() {
  const isMobile = useIsMobile()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [previousLayout, setPreviousLayout] = useState<'mobile' | 'desktop' | null>(null)

  // Handle layout transitions with smooth animations
  useEffect(() => {
    if (isMobile !== undefined) {
      const currentLayout = isMobile ? 'mobile' : 'desktop'
      
      // If layout changed, trigger transition
      if (previousLayout !== null && previousLayout !== currentLayout) {
        setIsTransitioning(true)
        
        // Complete transition after a short delay
        const timer = setTimeout(() => {
          setIsTransitioning(false)
        }, 150) // Short transition duration
        
        return () => clearTimeout(timer)
      }
      
      setPreviousLayout(currentLayout)
    }
  }, [isMobile, previousLayout])

  // Handle SSR by not rendering navigation until we know the screen size
  // This prevents hydration mismatches
  if (isMobile === undefined) {
    return null
  }

  return (
    <div 
      className={cn(
        "navigation-wrapper transition-opacity duration-150",
        isTransitioning && "opacity-90"
      )}
    >
      {isMobile ? (
        <MobileNavigation />
      ) : (
        <DesktopNavigation />
      )}
    </div>
  )
}