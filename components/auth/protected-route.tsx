"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
// Temporarily disabled during auth system overhaul
// import { useAuth } from "@/lib/auth"
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

  React.useEffect(() => {
    // Temporarily allow all routes during auth system overhaul
    console.log("Protected route temporarily disabled during auth system overhaul")
  }, [])

  // Temporarily allow access to all routes during development
  return <>{children}</>
}