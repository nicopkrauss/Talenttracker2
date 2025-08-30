'use client'

import React from 'react'
import Link from 'next/link'
import { Settings, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigation } from './navigation-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface DesktopNavItemProps {
  href: string
  label: string
  isActive: boolean
}

function DesktopNavItem({ href, label, isActive }: DesktopNavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      {label}
    </Link>
  )
}

interface UserMenuProps {
  user: {
    name: string
    email: string
    avatar?: string
  }
}

function UserMenu({ user }: UserMenuProps) {
  // Get user initials for fallback
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 py-1 h-auto"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DesktopNavigation() {
  const { availableItems, isActiveRoute, user } = useNavigation()

  // Filter out profile from main navigation since it's in the user menu
  const mainNavItems = availableItems.filter(item => item.id !== 'profile')

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
      role="navigation"
      aria-label="Desktop navigation"
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - Navigation links */}
        <div className="flex items-center gap-1">
          {mainNavItems.map((item) => (
            <DesktopNavItem
              key={item.id}
              href={item.href}
              label={item.label}
              isActive={isActiveRoute(item.href)}
            />
          ))}
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center">
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </nav>
  )
}