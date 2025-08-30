"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export default function HomePage() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()

  useEffect(() => {
    console.log("Root page - Auth state:", { user: !!user, userProfile: userProfile?.status, loading })
    
    if (loading) return

    // If not authenticated, redirect to login
    if (!user) {
      console.log("Root page - No user, redirecting to login")
      router.push("/login")
      return
    }

    // If authenticated but no profile, redirect to login with error
    if (!userProfile) {
      console.log("Root page - No profile, redirecting to login")
      router.push("/login?error=no-profile")
      return
    }

    // Handle different user statuses
    if (userProfile.status === "pending") {
      console.log("Root page - Pending user, redirecting to pending")
      router.push("/pending")
      return
    }

    if (userProfile.status === "rejected") {
      console.log("Root page - Rejected user, redirecting to login")
      router.push("/login?error=account-rejected")
      return
    }

    if (userProfile.status === "approved" || userProfile.status === "active") {
      console.log("Root page - Approved/Active user, redirecting to talent")
      // Redirect to the main application
      router.push("/talent")
      return
    }

    // Fallback - redirect to login
    console.log("Root page - Fallback, redirecting to login")
    router.push("/login")
  }, [user, userProfile, loading, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // This should not be reached due to redirects above
  return null
}