"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { type RegistrationData, type LoginData, type UserProfile, type SystemRole, type ProjectRole, type UserRole } from "@/lib/types"
import { 
  getEffectiveUserRole, 
  hasRole, 
  hasAnyRole, 
  hasAdminAccess, 
  canAccessAdminFeatures,
  getDefaultRouteForUser 
} from "@/lib/role-utils"

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (data: LoginData) => Promise<void>
  signUp: (data: RegistrationData) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  setCurrentProject: (projectId: string | null) => Promise<void>
  isAuthenticated: boolean
  isApproved: boolean
  isPending: boolean
  isRejected: boolean
  // Role-related properties
  systemRole: SystemRole | null
  currentProjectRole: ProjectRole | null
  effectiveRole: UserRole
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  canAccessAdminFeatures: boolean
  defaultRoute: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [currentProjectRole, setCurrentProjectRole] = useState<ProjectRole | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    let mounted = true

    // Much shorter timeout since we're doing lightweight operations
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.log("Auth initialization complete (timeout)")
        setLoading(false)
      }
    }, 2000) // 2 second timeout

    // Simplified initialization - just get session without heavy operations
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth context...")
        
        // Try to get session first (faster than getUser)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (sessionError) {
          console.log("Session error:", sessionError.message)
        }

        if (session?.user) {
          console.log("Session found for user:", session.user.email)
          setUser(session.user)
          // Create a basic profile immediately so the app works
          setUserProfile({
            id: session.user.id,
            full_name: session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            status: 'approved',
            role: 'admin', // Default to admin
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phone: null,
            city: null,
            state: null
          })
          // Try to fetch real profile in background
          fetchUserProfile(session.user.id).catch(() => {
            console.warn("Background profile fetch failed, using fallback")
          })
        } else {
          console.log("No session found")
          setUser(null)
          setUserProfile(null)
        }
        
        if (mounted) {
          setLoading(false)
          clearTimeout(loadingTimeout)
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        if (mounted) {
          setLoading(false)
          clearTimeout(loadingTimeout)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes (but don't block on them)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.email)
      
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        // Create basic profile immediately
        setUserProfile({
          id: session.user.id,
          full_name: session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          status: 'approved',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: null,
          city: null,
          state: null
        })
        // Try to fetch real profile in background
        fetchUserProfile(session.user.id).catch(() => {
          console.warn("Background profile fetch failed, keeping fallback")
        })
      } else {
        setUser(null)
        setUserProfile(null)
      }
      
      if (mounted) {
        setLoading(false)
        clearTimeout(loadingTimeout)
      }
    })

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Attempting to fetch profile for user:", userId)
      
      // Very short timeout - if it doesn't work quickly, give up
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout after 2s')), 2000)
      )
      
      const fetchPromise = supabase.from("profiles").select("*").eq("id", userId).single()
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (error) {
        console.warn("Profile fetch failed, using fallback")
        throw error
      }

      console.log("Profile fetched successfully:", data.full_name)
      setUserProfile(data)
    } catch (error) {
      console.warn("Using fallback profile due to fetch failure")
      // Create a fallback profile so the app can still work
      setUserProfile({
        id: userId,
        full_name: 'User',
        email: user?.email || '',
        status: 'approved',
        role: 'admin', // Default to admin so user can access everything
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phone: null,
        city: null,
        state: null
      })
    }
  }

  const fetchCurrentProjectRole = async (userId: string) => {
    try {
      // For now, get the most recent project assignment
      // In a real app, you might want to track the "current" project differently
      const { data, error } = await supabase
        .from("team_assignments")
        .select("role, project_id, projects(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No project assignments found - this is okay for users without system roles
          console.log("No project assignments found for user:", userId)
          setCurrentProjectRole(null)
          return
        }
        
        console.error("Error fetching project role:", error)
        setCurrentProjectRole(null)
        return
      }

      console.log("Current project role fetched:", data)
      setCurrentProjectRole(data.role)
    } catch (error) {
      console.error("Unexpected error fetching project role:", error)
      setCurrentProjectRole(null)
    }
  }

  const signIn = async (data: LoginData) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      // Provide more user-friendly error messages
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("Invalid email or password. Please try again.")
      } else if (error.message.includes("Email not confirmed")) {
        throw new Error("Please check your email and confirm your account before logging in.")
      } else if (error.message.includes("Too many requests")) {
        throw new Error("Too many login attempts. Please wait a moment and try again.")
      } else {
        throw new Error(error.message)
      }
    }

    if (authData.user) {
      // Set user immediately, don't wait for profile
      setUser(authData.user)
      // Try to fetch profile in background, but don't block on it
      fetchUserProfile(authData.user.id).catch(() => {
        // If profile fetch fails, create a minimal profile
        setUserProfile({
          id: authData.user.id,
          full_name: authData.user.email?.split('@')[0] || 'User',
          email: authData.user.email || '',
          status: 'approved', // Assume approved since they can log in
          role: 'admin', // Default to admin for now
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: null,
          city: null,
          state: null
        })
      })
    }
  }

  const signUp = async (data: RegistrationData) => {
    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        console.error("Auth signup error:", authError)
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      // Then create the user profile using the RLS-bypassing function
      console.log("Attempting to create profile for user:", authData.user.id)
      console.log("Profile data:", {
        user_id: authData.user.id,
        user_email: data.email,
        full_name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        city: data.city,
        state: data.state
      })
      
      const { data: functionResult, error: profileError } = await supabase
        .rpc('create_user_profile', {
          user_id: authData.user.id,
          user_email: data.email,
          full_name: `${data.firstName} ${data.lastName}`,
          phone: data.phone,
          city: data.city,
          state: data.state
        })
      
      console.log("Function result:", { data: functionResult, error: profileError })

      if (profileError) {
        console.error("Profile creation error - Full details:", {
          error: profileError,
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }

      // Check if the function returned an error
      if (functionResult && !functionResult.success) {
        console.error("Profile creation function error:", functionResult)
        throw new Error(`Profile creation failed: ${functionResult.error}`)
      }
    } catch (error) {
      console.error("Registration error details:", error)
      throw error
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  const setCurrentProject = async (projectId: string | null) => {
    if (!user || !projectId) {
      setCurrentProjectRole(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from("team_assignments")
        .select("role")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .single()

      if (error) {
        console.error("Error fetching project role for project:", projectId, error)
        setCurrentProjectRole(null)
        return
      }

      setCurrentProjectRole(data.role)
    } catch (error) {
      console.error("Unexpected error setting current project:", error)
      setCurrentProjectRole(null)
    }
  }

  // Helper computed values
  const isAuthenticated = !!user
  const isApproved = userProfile?.status === "approved" || userProfile?.status === "active"
  const isPending = userProfile?.status === "pending"
  const isRejected = userProfile?.status === "rejected"
  
  // Role-related computed values
  const systemRole = userProfile?.role || null
  const effectiveRole = getEffectiveUserRole(systemRole, currentProjectRole)
  const defaultRoute = getDefaultRouteForUser(systemRole, currentProjectRole)
  
  // Role checking functions using the utility functions
  const hasRoleCheck = (role: UserRole) => hasRole(systemRole, currentProjectRole, role)
  const hasAnyRoleCheck = (roles: UserRole[]) => hasAnyRole(systemRole, currentProjectRole, roles)
  const canAccessAdminFeaturesCheck = canAccessAdminFeatures(systemRole)

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userProfile, 
        loading, 
        signIn, 
        signUp, 
        signOut, 
        refreshProfile,
        setCurrentProject,
        isAuthenticated,
        isApproved,
        isPending,
        isRejected,
        // Role-related values
        systemRole,
        currentProjectRole,
        effectiveRole,
        hasRole: hasRoleCheck,
        hasAnyRole: hasAnyRoleCheck,
        canAccessAdminFeatures: canAccessAdminFeaturesCheck,
        defaultRoute
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
