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
import { createClient } from '@supabase/supabase-js'
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
import { BrowserProfileService } from './profile-service-browser'
import { getEffectiveUserRole, hasRole, hasAnyRole, canAccessAdminFeatures } from './role-utils'
import { AuthErrorHandler, handleAuthError, getUserFriendlyMessage, logError } from './auth-error-handler'

// Supabase client instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
      const result = await BrowserProfileService.getProfile(userId)
      if (result.success && result.data) {
        return result.data
      }
      console.error('Failed to fetch user profile:', result.error)
      return null
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
   * Initialize authentication state
   */
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }

        await handleAuthStateChange('INITIAL_SESSION', session)
      } catch (error) {
        console.error('Error initializing auth:', error)
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
        logError(authError, { action: 'signIn', email: data.email })
        const errorMessage = getUserFriendlyMessage(authError)
        console.error('Sign in error:', errorMessage, error)
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
   * Sign up new user and create profile
   */
  const signUp = useCallback(async (data: RegistrationData) => {
    try {
      setLoading(true)

      // Normalize and validate email
      const normalizedEmail = data.email.trim().toLowerCase()

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
      })

      if (authError) {
        const error = handleAuthError(authError)
        logError(error, { action: 'signUp', email: normalizedEmail })
        const errorMessage = getUserFriendlyMessage(error)
        console.error('Sign up error:', errorMessage, authError)
        throw new Error(errorMessage)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account. Please try again.')
      }

      // Create user profile
      const profileData = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        full_name: `${data.firstName.trim()} ${data.lastName.trim()}`,
        email: normalizedEmail,
        phone: data.phone?.trim(),
        city: data.city?.trim(),
        state: data.state?.trim(),
      }

      const profileResult = await BrowserProfileService.createProfile(authData.user.id, profileData)

      if (!profileResult.success) {
        // Log the profile creation error
        const profileError: ProfileError = {
          code: 'PROFILE_CREATION_FAILED',
          message: profileResult.error || 'Failed to create user profile'
        }
        logError(profileError, { 
          action: 'createProfile', 
          userId: authData.user.id,
          email: normalizedEmail 
        })

        // If profile creation fails, we should ideally clean up the auth user
        // For now, we'll throw an error with guidance
        throw new Error('Account created but profile setup failed. Please contact support.')
      }

      // Profile will be fetched automatically by auth state change handler
    } catch (error) {
      setLoading(false)
      // Re-throw with user-friendly message if it's not already handled
      if (error instanceof Error) {
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