"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth-context"
import { Unauthorized } from "./unauthorized"
import { UserRole } from "@/lib/types"

interface WithAuthOptions {
  requireAuth?: boolean
  requireApproved?: boolean
  requiredRoles?: UserRole[]
  fallback?: React.ComponentType
  unauthorizedMessage?: string
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    requireAuth = true,
    requireApproved = true,
    requiredRoles = [],
    fallback: FallbackComponent = Unauthorized,
    unauthorizedMessage
  } = options

  return function AuthenticatedComponent(props: P) {
    const { user, userProfile, loading } = useAuth()

    // Show loading state
    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    // Check authentication requirement
    if (requireAuth && !user) {
      return <FallbackComponent />
    }

    // Check approval requirement
    if (requireApproved && (!userProfile || userProfile.status !== 'active')) {
      return <FallbackComponent />
    }

    // Check role requirements
    if (requiredRoles.length > 0 && userProfile) {
      const hasRequiredRole = requiredRoles.includes(userProfile.role as UserRole)
      if (!hasRequiredRole) {
        return <FallbackComponent />
      }
    }

    return <Component {...props} />
  }
}

// Convenience HOCs for common use cases
export const withAdminAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, {
    requireAuth: true,
    requireApproved: true,
    requiredRoles: ["admin", "in-house"],
    unauthorizedMessage: "Admin access required."
  })

export const withApprovedAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, {
    requireAuth: true,
    requireApproved: true,
    unauthorizedMessage: "Your account must be approved to access this page."
  })

export const withBasicAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, {
    requireAuth: true,
    requireApproved: false,
    unauthorizedMessage: "Please log in to access this page."
  })