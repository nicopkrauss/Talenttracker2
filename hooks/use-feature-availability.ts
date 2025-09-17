"use client"

import { useMemo } from 'react'
import { useReadiness } from '@/lib/contexts/readiness-context'

export interface FeatureAvailabilityCheck {
  available: boolean
  requirement: string
  guidance?: string
  actionRoute?: string
  blockedReason?: string
}

export interface FeatureAvailabilityMap {
  timeTracking: FeatureAvailabilityCheck
  assignments: FeatureAvailabilityCheck
  locationTracking: FeatureAvailabilityCheck
  supervisorCheckout: FeatureAvailabilityCheck
  talentManagement: FeatureAvailabilityCheck
  projectOperations: FeatureAvailabilityCheck
  notifications: FeatureAvailabilityCheck
  timecards: FeatureAvailabilityCheck
  teamManagement: FeatureAvailabilityCheck
}

/**
 * Hook to check feature availability for a specific project
 * Integrates with the project readiness system to determine what features are accessible
 */
export function useFeatureAvailability(projectId: string): {
  features: FeatureAvailabilityMap
  loading: boolean
  error: string | null
} {
  // Try to use readiness context, but handle cases where it's not available
  let readiness = null
  let loading = false
  let error = null
  
  try {
    const readinessContext = useReadiness()
    readiness = readinessContext.readiness
    loading = readinessContext.isLoading
    error = readinessContext.error
  } catch (contextError) {
    // If we're outside of ReadinessProvider context, use fallback behavior
    if (contextError instanceof Error && contextError.message.includes('useReadiness must be used within a ReadinessProvider')) {
      // Return default unavailable features when no context is available
      loading = false
      error = null
      readiness = null
    } else {
      // Re-throw other errors
      throw contextError
    }
  }

  const features = useMemo<FeatureAvailabilityMap>(() => {
    if (!readiness) {
      // Return all features as unavailable when readiness data is not available
      const unavailableFeature: FeatureAvailabilityCheck = {
        available: false,
        requirement: 'Project setup required',
        guidance: 'Complete project setup to access this feature',
        actionRoute: '/info',
        blockedReason: 'Project readiness data not available'
      }

      return {
        timeTracking: unavailableFeature,
        assignments: unavailableFeature,
        locationTracking: unavailableFeature,
        supervisorCheckout: unavailableFeature,
        talentManagement: unavailableFeature,
        projectOperations: unavailableFeature,
        notifications: unavailableFeature,
        timecards: unavailableFeature,
        teamManagement: unavailableFeature
      }
    }

    return {
      timeTracking: {
        available: readiness.features.time_tracking,
        requirement: readiness.features.time_tracking ? 'Available' : 'Project must be active',
        guidance: !readiness.features.time_tracking 
          ? 'Activate the project to enable time tracking features' 
          : undefined,
        actionRoute: !readiness.features.time_tracking ? '/info' : undefined,
        blockedReason: !readiness.features.time_tracking 
          ? 'Project not active' 
          : undefined
      },

      assignments: {
        available: true, // Assignments are always available regardless of readiness
        requirement: 'Always available - assignments can be created at any time',
        guidance: undefined,
        actionRoute: undefined,
        blockedReason: undefined
      },

      locationTracking: {
        available: readiness.features.talent_tracking,
        requirement: readiness.features.talent_tracking ? 'Available' : 'Set up project locations',
        guidance: !readiness.features.talent_tracking
          ? 'Set up project locations to enable talent tracking'
          : undefined,
        actionRoute: !readiness.features.talent_tracking ? '/info' : undefined,
        blockedReason: !readiness.features.talent_tracking
          ? 'Project locations not configured'
          : undefined
      },

      supervisorCheckout: {
        available: readiness.features.time_tracking,
        requirement: readiness.features.time_tracking ? 'Available' : 'Project must be active',
        guidance: !readiness.features.time_tracking
          ? 'Activate the project to enable supervisor checkout'
          : undefined,
        actionRoute: !readiness.features.time_tracking ? '/info' : undefined,
        blockedReason: !readiness.features.time_tracking
          ? 'Project not active'
          : undefined
      },

      talentManagement: {
        available: readiness.features.talent_tracking,
        requirement: readiness.features.talent_tracking ? 'Available' : 'Set up project locations',
        guidance: !readiness.features.talent_tracking
          ? 'Set up project locations to enable talent management'
          : undefined,
        actionRoute: !readiness.features.talent_tracking ? '/info' : undefined,
        blockedReason: !readiness.features.talent_tracking
          ? 'Project locations not configured'
          : undefined
      },

      projectOperations: {
        available: readiness.status === 'active',
        requirement: readiness.status === 'active' ? 'Available' : 'Complete all setup and activate project',
        guidance: readiness.status !== 'active'
          ? 'Complete all project setup and activate to access operations features'
          : undefined,
        actionRoute: readiness.status !== 'active' ? '/info' : undefined,
        blockedReason: readiness.status !== 'active'
          ? 'Project not activated'
          : undefined
      },

      notifications: {
        available: readiness.features.team_management,
        requirement: readiness.features.team_management ? 'Available' : 'Set up team assignments',
        guidance: !readiness.features.team_management
          ? 'Set up team assignments to enable notifications'
          : undefined,
        actionRoute: !readiness.features.team_management ? '/roles-team' : undefined,
        blockedReason: !readiness.features.team_management
          ? 'Team assignments not configured'
          : undefined
      },

      timecards: {
        available: readiness.features.time_tracking,
        requirement: readiness.features.time_tracking ? 'Available' : 'Project must be active',
        guidance: !readiness.features.time_tracking
          ? 'Activate the project to enable timecard features'
          : undefined,
        actionRoute: !readiness.features.time_tracking ? '/info' : undefined,
        blockedReason: !readiness.features.time_tracking
          ? 'Project not active'
          : undefined
      },

      teamManagement: {
        available: readiness.features.team_management,
        requirement: readiness.features.team_management ? 'Available' : 'Set up role templates',
        guidance: !readiness.features.team_management
          ? 'Set up role templates to enable team management'
          : undefined,
        actionRoute: !readiness.features.team_management ? '/roles-team' : undefined,
        blockedReason: !readiness.features.team_management
          ? 'Role templates not configured'
          : undefined
      }
    }
  }, [readiness])

  return {
    features,
    loading,
    error: error?.message || null
  }
}

/**
 * Hook to check availability of a specific feature
 */
export function useSpecificFeatureAvailability(
  projectId: string, 
  featureName: keyof FeatureAvailabilityMap
): FeatureAvailabilityCheck & { loading: boolean; error: string | null } {
  const { features, loading, error } = useFeatureAvailability(projectId)
  
  return {
    ...features[featureName],
    loading,
    error: error?.message || null
  }
}

/**
 * Hook specifically for time tracking availability
 */
export function useTimeTrackingFeatureAvailability(projectId: string) {
  return useSpecificFeatureAvailability(projectId, 'timeTracking')
}

/**
 * Hook specifically for assignment availability
 */
export function useAssignmentFeatureAvailability(projectId: string) {
  return useSpecificFeatureAvailability(projectId, 'assignments')
}

/**
 * Hook specifically for location tracking availability
 */
export function useLocationTrackingFeatureAvailability(projectId: string) {
  return useSpecificFeatureAvailability(projectId, 'locationTracking')
}

/**
 * Hook specifically for timecard availability
 */
export function useTimecardFeatureAvailability(projectId: string) {
  return useSpecificFeatureAvailability(projectId, 'timecards')
}

/**
 * Hook to check if any features are blocked and get guidance
 */
export function useFeatureGuidance(projectId: string) {
  const { features, loading, error } = useFeatureAvailability(projectId)
  
  const blockedFeatures = useMemo(() => {
    return Object.entries(features)
      .filter(([_, feature]) => !feature.available)
      .map(([name, feature]) => ({
        name: name as keyof FeatureAvailabilityMap,
        ...feature
      }))
  }, [features])
  
  const availableFeatures = useMemo(() => {
    return Object.entries(features)
      .filter(([_, feature]) => feature.available)
      .map(([name, feature]) => ({
        name: name as keyof FeatureAvailabilityMap,
        ...feature
      }))
  }, [features])
  
  return {
    blockedFeatures,
    availableFeatures,
    hasBlockedFeatures: blockedFeatures.length > 0,
    loading,
    error: error?.message || null
  }
}