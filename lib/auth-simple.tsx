"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { type UserProfile, type SystemRole, type ProjectRole, type UserRole } from "@/lib/types"

interface SimpleAuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  canAccessAdminFeatures: boolean
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    let mounted = true

    // Very simple initialization
    const init = async () => {
      try {
        // Just get the session, don't wait for anything else
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            // Try to get profile but don't block on it
            fetchProfile(session.user.id)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error("Simple auth init error:", error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Set loading to false after 1 second no matter what
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 1000)

    init()

    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
      
      if (data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.warn("Profile fetch failed:", error)
    }
  }

  const isAuthenticated = !!user
  const canAccessAdminFeatures = userProfile?.role === 'admin' || userProfile?.role === 'in_house'

  return (
    <SimpleAuthContext.Provider 
      value={{ 
        user, 
        userProfile, 
        loading,
        isAuthenticated,
        canAccessAdminFeatures
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  )
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext)
  if (context === undefined) {
    throw new Error("useSimpleAuth must be used within a SimpleAuthProvider")
  }
  return context
}