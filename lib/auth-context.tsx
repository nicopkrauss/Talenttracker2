'use client'

/**
 * Authentication Context Provider
 * Task 3.1: Create new authentication context provider
 * 
 * Features:
 * - Clean AuthContext with proper TypeScript interfaces
 * - Supabase client initialization and configuration
 * - User session management with proper loading states
 * - Authentication state management without complex fallbacks
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { 
  UserProfile, 
  LoginData, 
  RegistrationData,
  SystemRole,
  ProjectRole,
  ProfileError
} from './auth-types'
import { UserRole } from './types'
import { getEffectiveUserRole, hasRole, hasAnyRole, canAccessAdminFeatures } from './role-utils'
import { AuthErrorHandler, handleAuthError, getUserFriendlyMessage, logError } from './auth-error-handler'

// Supabase client instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

const supabase = createClient()

// Authentication context interface
export interface AuthContextType {
  // Core authentication state
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  
  // Authentication actions
  signIn: (data: LoginData) => Promise<void>
  signUp: (data: RegistrationData) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  
  // Status helpers
  isAuthenticated: boolean
  isApproved: boolean
  isPending: boolean
  
  // Role-based access helpers
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  canAccessAdminFeatures: boolean
  effectiveRole: UserRole
  
  // Current project role (will be enhanced in future tasks)
  currentProjectRole: ProjectRole | null
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Authentication provider props
interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * Authentication Provider Component
 * Manages authentication state and provides auth methods to child components
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Core state
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentProjectRole, setCurrentProjectRole] = useState<ProjectRole | null>(null)
  
  // Profile caching
  const [profileCache, setProfileCache] = useState<Map<string, { profile: UserProfile, timestamp: number }>>(new Map())
  const PROFILE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Fetch user profile from database
   */
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch user profile:', error)
        return null
      }

      return profile
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }, [])

  /**
   * Refresh user profile data
   */
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    
    const profile = await fetchUserProfile(user.id)
    setUserProfile(profile)
  }, [user?.id, fetchUserProfile])

  /**
   * Handle authentication state changes
   */
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    setSession(session)
    setUser(session?.user ?? null)
    
    if (session?.user) {
      // Fetch user profile when user is authenticated
      const profile = await fetchUserProfile(session.user.id)
      setUserProfile(profile)
    } else {
      // Clear profile when user is not authenticated
      setUserProfile(null)
      setCurrentProjectRole(null)
    }
    
    setLoading(false)
  }, [fetchUserProfile])

  /**
   * Handle initial user state (for getUser() calls)
   */
  const handleInitialUser = useCallback(async (user: User | null) => {
    setUser(user)
    setSession(null) // We don't have session data from getUser()
    
    if (user) {
      // Fetch user profile when user is authenticated
      const profile = await fetchUserProfile(user.id)
      setUserProfile(profile)
    } else {
      // Clear profile when user is not authenticated
      setUserProfile(null)
      setCurrentProjectRole(null)
    }
    
    setLoading(false)
  }, [fetchUserProfile])

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          // Only log actual errors, not expected "no session" states
          if (error.message !== 'Auth session missing!' && !error.message.includes('session missing')) {
            console.error('Error getting user:', error)
          }
          setLoading(false)
          return
        }

        await handleInitialUser(user)
      } catch (error) {
        // Only log unexpected errors, not expected "no session" states
        if (error instanceof Error && !error.message.includes('session missing')) {
          console.error('Error initializing auth:', error)
        }
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      subscription.unsubscribe()
    }
  }, [handleAuthStateChange])

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (data: LoginData) => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      })

      if (error) {
        const authError = handleAuthError(error)
        const errorMessage = getUserFriendlyMessage(authError)
        
        // Only log system errors, not user errors like wrong passwords
        const userErrors = ['INVALID_CREDENTIALS', 'EMAIL_NOT_CONFIRMED', 'PASSWORD_ERROR']
        if (!userErrors.includes(authError.code)) {
          logError(authError, { action: 'signIn', email: data.email })
          console.error('Sign in system error:', errorMessage, error)
        }
        
        throw new Error(errorMessage)
      }

      // Profile will be fetched automatically by auth state change handler
    } catch (error) {
      setLoading(false)
      // Re-throw with user-friendly message if it's not already handled
      if (error instanceof Error) {
        throw error
      }
      throw new Error('An unexpected error occurred during sign in. Please try again.')
    }
  }, [])

  /**
   * Sign up new user using the new registration API
   */
  const signUp = useCallback(async (data: RegistrationData) => {
    try {
      setLoading(true)

      // Use the new registration API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle API errors
        if (result.details) {
          // Check if details is an array (validation errors) or string (auth errors)
          if (Array.isArray(result.details)) {
            const fieldErrors = result.details.map((detail: any) => `${detail.field}: ${detail.message}`).join(', ')
            throw new Error(`Registration failed: ${fieldErrors}`)
          } else {
            // Single error message
            throw new Error(result.details)
          }
        }
        throw new Error(result.error || 'Registration failed. Please try again.')
      }

      // Registration successful - user is now pending approval
      console.log('Registration successful:', result.message)
      
      // Don't automatically sign in - user needs approval first
      // The registration API creates the auth user and profile
      
    } catch (error) {
      setLoading(false)
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.')
      }
      
      // Re-throw with user-friendly message if it's not already handled
      if (error instanceof Error) {
        console.error('Registration system error:', error.message)
        throw error
      }
      throw new Error('An unexpected error occurred during registration. Please try again.')
    }
  }, [])

  /**
   * Sign out user
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        const authError = handleAuthError(error)
        logError(authError, { action: 'signOut', userId: user?.id })
        // For sign out, we'll be more lenient with errors
        console.warn('Sign out error:', getUserFriendlyMessage(authError))
      }

      // Clear state immediately for better UX, even if there was an error
      setUser(null)
      setUserProfile(null)
      setSession(null)
      setCurrentProjectRole(null)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      // For sign out, we don't want to throw errors that prevent the user from leaving
      console.error('Unexpected sign out error:', error)
    }
  }, [user?.id])

  // Computed values
  const isAuthenticated = !!user && !!session
  const isApproved = userProfile?.status === 'active'
  const isPending = userProfile?.status === 'pending'
  
  // Role-based access helpers
  const effectiveRole = getEffectiveUserRole(userProfile?.role || null, currentProjectRole)
  
  const hasRoleHelper = useCallback((role: UserRole) => {
    return hasRole(userProfile?.role || null, currentProjectRole, role)
  }, [userProfile?.role, currentProjectRole])
  
  const hasAnyRoleHelper = useCallback((roles: UserRole[]) => {
    return hasAnyRole(userProfile?.role || null, currentProjectRole, roles)
  }, [userProfile?.role, currentProjectRole])
  
  const canAccessAdminFeaturesHelper = canAccessAdminFeatures(userProfile?.role || null)

  // Context value
  const contextValue: AuthContextType = {
    // Core state
    user,
    userProfile,
    session,
    loading,
    
    // Actions
    signIn,
    signUp,
    signOut,
    refreshProfile,
    
    // Status helpers
    isAuthenticated,
    isApproved,
    isPending,
    
    // Role helpers
    hasRole: hasRoleHelper,
    hasAnyRole: hasAnyRoleHelper,
    canAccessAdminFeatures: canAccessAdminFeaturesHelper,
    effectiveRole,
    
    // Project role (placeholder for future enhancement)
    currentProjectRole,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

/**
 * Hook to require authentication
 * Throws error if user is not authenticated
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth()
  
  if (!auth.isAuthenticated) {
    throw new Error('Authentication required')
  }
  
  return auth
}

/**
 * Hook to require approved user
 * Throws error if user is not approved
 */
export function useRequireApproved(): AuthContextType {
  const auth = useRequireAuth()
  
  if (!auth.isApproved) {
    throw new Error('User approval required')
  }
  
  return auth
}

/**
 * Hook to require admin access
 * Throws error if user doesn't have admin access
 */
export function useRequireAdmin(): AuthContextType {
  const auth = useRequireApproved()
  
  if (!auth.canAccessAdminFeatures) {
    throw new Error('Admin access required')
  }
  
  return auth
}

// Export the context for advanced usage
export { AuthContext }