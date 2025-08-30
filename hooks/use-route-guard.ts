"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { UserRole } from "@/lib/types"

interface RouteGuardOptions {
  requireAuth?: boolean
  requireApproved?: boolean
  requiredRoles?: UserRole[]
  redirectTo?: string
  allowPending?: boolean
}

export function useRouteGuard(options: RouteGuardOptions = {}) {
  const {
    requireAuth = true,
    requireApproved = true,
    requiredRoles = [],
    redirectTo,
    allowPending = false
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const { user, userProfile, loading } = useAuth()

  const isAuthenticated = !!user
  const isApproved = userProfile?.status === 'active'
  const isPending = userProfile?.status === 'pending'

  const hasRole = (role: UserRole): boolean => {
    if (!userProfile?.role) return false
    return userProfile.role === role
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!userProfile?.role) return false
    return roles.includes(userProfile.role)
  }

  useEffect(() => {
    if (loading) return

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      const loginUrl = redirectTo || `/login?redirect=${encodeURIComponent(pathname)}`
      router.push(loginUrl)
      return
    }

    // Check approval requirement
    if (requireApproved && isAuthenticated && !isApproved) {
      if (isPending && allowPending) {
        // Allow pending users to access this route
        return
      }
      
      if (isPending) {
        router.push('/pending')
        return
      }
      
      // User is rejected or inactive
      router.push('/login?error=account_inactive')
      return
    }

    // Check role requirements
    if (requiredRoles.length > 0 && isAuthenticated && isApproved) {
      if (!hasAnyRole(requiredRoles)) {
        router.push('/unauthorized')
        return
      }
    }
  }, [
    loading,
    isAuthenticated,
    isApproved,
    isPending,
    requiredRoles,
    pathname,
    router,
    redirectTo,
    requireAuth,
    requireApproved,
    allowPending,
    hasAnyRole
  ])

  return {
    user,
    userProfile,
    loading,
    isAuthenticated,
    isApproved,
    hasRole,
    hasAnyRole
  }
}