'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useNavigation } from './navigation-provider'

interface MobileNavItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
}

function MobileNavItem({ href, icon: Icon, label, isActive }: MobileNavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center py-2 px-1 min-h-[60px] transition-all duration-200 active:scale-95",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={cn(
        "text-xs font-medium mt-1 transition-colors duration-200",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </Link>
  )
}

export function MobileNavigation() {
  const { availableItems, isActiveRoute } = useNavigation()

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 pb-safe">
        {availableItems.map((item) => (
          <MobileNavItem
            key={item.id}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isActiveRoute(item.href)}
          />
        ))}
      </div>
    </nav>
  )
}