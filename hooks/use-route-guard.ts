"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth"
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
  const { user, userProfile, loading, hasRole, hasAnyRole, defaultRoute } = useAuth()

  useEffect(() => {
    // Don't redirect during loading
    if (loading) return

    // If authentication is required but user is not authenticated
    if (requireAuth && !user) {
      const redirectUrl = redirectTo || "/login"
      const url = new URL(redirectUrl, window.location.origin)
      if (pathname !== "/" && redirectUrl === "/login") {
        url.searchParams.set("redirect", pathname)
      }
      router.push(url.toString())
      return
    }

    // If user is authenticated but no profile exists
    if (requireAuth && user && !userProfile) {
      const url = new URL("/login", window.location.origin)
      url.searchParams.set("error", "no-profile")
      router.push(url.toString())
      return
    }

    // If user profile exists, check status and role requirements
    if (userProfile) {
      // Handle pending status
      if (userProfile.status === "pending" && !allowPending) {
        router.push("/pending")
        return
      }

      // Handle rejected status
      if (userProfile.status === "rejected") {
        const url = new URL("/login", window.location.origin)
        url.searchParams.set("error", "account-rejected")
        router.push(url.toString())
        return
      }

      // Check if approval is required
      if (requireApproved && userProfile.status !== "approved" && userProfile.status !== "active") {
        router.push("/pending")
        return
      }

      // Check role requirements using the new role system
      if (requiredRoles.length > 0) {
        const hasRequiredRole = hasAnyRole(requiredRoles)
        if (!hasRequiredRole) {
          const fallbackUrl = redirectTo || defaultRoute
          router.push(fallbackUrl)
          return
        }
      }
    }
  }, [
    user,
    userProfile,
    loading,
    pathname,
    router,
    requireAuth,
    requireApproved,
    requiredRoles,
    redirectTo,
    allowPending
  ])

  return {
    user,
    userProfile,
    loading,
    isAuthenticated: !!user,
    isApproved: userProfile?.status === "approved" || userProfile?.status === "active",
    hasRole,
    hasAnyRole
  }
}