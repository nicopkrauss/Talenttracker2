"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { Unauthorized } from "./unauthorized"

interface WithAuthOptions {
  requireAuth?: boolean
  requireApproved?: boolean
  requiredRoles?: string[]
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
    const { 
      user, 
      userProfile, 
      loading, 
      isAuthenticated, 
      isApproved, 
      hasAnyRole 
    } = useAuth()

    // Show loading state
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      return <FallbackComponent message={unauthorizedMessage || "Please log in to access this page."} />
    }

    // Check approval requirement
    if (requireApproved && !isApproved) {
      return <FallbackComponent message={unauthorizedMessage || "Your account is pending approval."} />
    }

    // Check role requirements
    if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
      return <FallbackComponent message={unauthorizedMessage || "You don't have permission to access this page."} />
    }

    // All checks passed, render the component
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