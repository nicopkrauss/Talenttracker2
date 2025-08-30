"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { hasAdminAccess } from "@/lib/role-utils"
import { UserRole } from "@/lib/types"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireApproved?: boolean
  requiredRoles?: UserRole[]
}

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/register", 
  "/pending",
  "/terms",
  "/privacy"
]

// Define routes that require admin/in-house roles
const ADMIN_ROUTES = [
  "/team"
]

export function ProtectedRoute({ 
  children, 
  requireApproved = true, 
  requiredRoles 
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, userProfile, loading, hasRole, hasAnyRole, defaultRoute } = useAuth()

  React.useEffect(() => {
    // Don't redirect during loading
    if (loading) return

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

    // If it's a public route, allow access
    if (isPublicRoute) return

    // If no user, redirect to login with return URL
    if (!user) {
      const redirectUrl = new URL("/login", window.location.origin)
      if (pathname !== "/") {
        redirectUrl.searchParams.set("redirect", pathname)
      }
      router.push(redirectUrl.toString())
      return
    }

    // If user exists but no profile, something is wrong
    if (!userProfile) {
      console.error("User authenticated but no profile found")
      const redirectUrl = new URL("/login", window.location.origin)
      redirectUrl.searchParams.set("error", "no-profile")
      router.push(redirectUrl.toString())
      return
    }

    // Handle different user statuses
    if (userProfile.status === "pending") {
      // Redirect pending users to pending page unless they're already there
      if (pathname !== "/pending") {
        router.push("/pending")
      }
      return
    }

    if (userProfile.status === "rejected") {
      // Redirect rejected users to login with message
      const redirectUrl = new URL("/login", window.location.origin)
      redirectUrl.searchParams.set("error", "account-rejected")
      router.push(redirectUrl.toString())
      return
    }

    if (requireApproved && userProfile.status !== "approved" && userProfile.status !== "active") {
      // If route requires approval but user isn't approved, redirect to pending
      router.push("/pending")
      return
    }

    // Check role-based access using the new role system
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = hasAnyRole(requiredRoles)
      if (!hasRequiredRole) {
        // Redirect to user's default route if they don't have required role
        router.push(defaultRoute)
        return
      }
    }

    // Check admin routes using role utilities
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route))
    if (isAdminRoute) {
      const userHasAdminAccess = hasAdminAccess(userProfile.role)
      if (!userHasAdminAccess) {
        // Redirect non-admin users to their default route
        router.push(defaultRoute)
        return
      }
    }

  }, [user, userProfile, loading, pathname, router, requireApproved, requiredRoles])

  // Show loading state during authentication check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // For public routes, always render children
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    return <>{children}</>
  }

  // For protected routes, only render if user is properly authenticated and approved
  if (!user || !userProfile) {
    return null // Will redirect in useEffect
  }

  if (userProfile.status === "pending") {
    return null // Will redirect in useEffect
  }

  if (userProfile.status === "rejected") {
    return null // Will redirect in useEffect
  }

  if (requireApproved && userProfile.status !== "approved" && userProfile.status !== "active") {
    return null // Will redirect in useEffect
  }

  // Check role-based access using the new role system
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = hasAnyRole(requiredRoles)
    if (!hasRequiredRole) {
      return null // Will redirect in useEffect
    }
  }

  // Check admin routes using role utilities
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route))
  if (isAdminRoute) {
    const userHasAdminAccess = hasAdminAccess(userProfile.role)
    if (!userHasAdminAccess) {
      return null // Will redirect in useEffect
    }
  }

  return <>{children}</>
}