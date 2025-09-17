"use client"

import { useMemo } from 'react'
import { ProjectPhase } from '@/lib/types/project-phase'
import { useProjectPhase } from '@/lib/contexts/project-phase-context'

export interface PhaseFeatureAvailabilityCheck {
  available: boolean
  requirement: string
  guidance?: string
  actionRoute?: string
  blockedReason?: string
  recommendedPhase?: ProjectPhase
}

export interface PhaseFeatureAvailabilityMap {
  timeTracking: PhaseFeatureAvailabilityCheck
  assignments: PhaseFeatureAvailabilityCheck
  locationTracking: PhaseFeatureAvailabilityCheck
  supervisorCheckout: PhaseFeatureAvailabilityCheck
  talentManagement: PhaseFeatureAvailabilityCheck
  projectOperations: PhaseFeatureAvailabilityCheck
  notifications: PhaseFeatureAvailabilityCheck
  timecards: PhaseFeatureAvailabilityCheck
  teamManagement: PhaseFeatureAvailabilityCheck
  phaseTransitions: PhaseFeatureAvailabilityCheck
  configurationMode: PhaseFeatureAvailabilityCheck
  operationsMode: PhaseFeatureAvailabilityCheck
}

/**
 * Hook to check feature availability based on project phase
 * Replaces the old readiness-based system with phase-aware logic
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */
export function usePhaseFeatureAvailability(): {
  features: PhaseFeatureAvailabilityMap
  currentPhase: ProjectPhase | null
  loading: boolean
  error: string | null
} {
  const { currentPhase, loading, error } = useProjectPhase()

  const features = useMemo<PhaseFeatureAvailabilityMap>(() => {
    if (!currentPhase) {
      // Return all features as unavailable when phase data is not available
      const unavailableFeature: PhaseFeatureAvailabilityCheck = {
        available: false,
        requirement: 'Project phase data required',
        guidance: 'Loading project phase information',
        blockedReason: 'Project phase data not available'
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
        teamManagement: unavailableFeature,
        phaseTransitions: unavailableFeature,
        configurationMode: unavailableFeature,
        operationsMode: unavailableFeature
      }
    }

    return {
      timeTracking: {
        available: currentPhase === ProjectPhase.ACTIVE || currentPhase === ProjectPhase.POST_SHOW,
        requirement: currentPhase === ProjectPhase.ACTIVE || currentPhase === ProjectPhase.POST_SHOW 
          ? 'Available' 
          : 'Project must be in active or post-show phase',
        guidance: !(currentPhase === ProjectPhase.ACTIVE || currentPhase === ProjectPhase.POST_SHOW)
          ? 'Time tracking is available during active operations and post-show phases'
          : undefined,
        recommendedPhase: ProjectPhase.ACTIVE,
        blockedReason: !(currentPhase === ProjectPhase.ACTIVE || currentPhase === ProjectPhase.POST_SHOW)
          ? `Current phase: ${currentPhase}`
          : undefined
      },

      assignments: {
        available: true, // Assignments are always available regardless of phase
        requirement: 'Always available - assignments can be created at any time',
        guidance: undefined,
        recommendedPhase: ProjectPhase.STAFFING,
        blockedReason: undefined
      },

      locationTracking: {
        available: currentPhase === ProjectPhase.PRE_SHOW || 
                  currentPhase === ProjectPhase.ACTIVE,
        requirement: 'Available during pre-show and active phases',
        guidance: !(currentPhase === ProjectPhase.PRE_SHOW || currentPhase === ProjectPhase.ACTIVE)
          ? 'Location tracking is available during pre-show and active phases'
          : undefined,
        recommendedPhase: ProjectPhase.ACTIVE,
        blockedReason: !(currentPhase === ProjectPhase.PRE_SHOW || currentPhase === ProjectPhase.ACTIVE)
          ? `Current phase: ${currentPhase}`
          : undefined
      },

      supervisorCheckout: {
        available: currentPhase === ProjectPhase.ACTIVE || currentPhase === ProjectPhase.POST_SHOW,
        requirement: 'Available during active and post-show phases',
        guidance: !(currentPhase === ProjectPhase.ACTIVE || currentPhase === ProjectPhase.POST_SHOW)
          ? 'Supervisor checkout is available during active operations and post-show phases'
          : undefined,
        recommendedPhase: ProjectPhase.ACTIVE,
        blockedReason: !(currentPhase === ProjectPhase.ACTIVE || currentPhase === ProjectPhase.POST_SHOW)
          ? `Current phase: ${currentPhase}`
          : undefined
      },

      talentManagement: {
        available: currentPhase !== ProjectPhase.ARCHIVED,
        requirement: currentPhase !== ProjectPhase.ARCHIVED ? 'Available' : 'Not available for archived projects',
        guidance: currentPhase === ProjectPhase.ARCHIVED
          ? 'Talent management is read-only for archived projects'
          : undefined,
        blockedReason: currentPhase === ProjectPhase.ARCHIVED
          ? 'Project is archived'
          : undefined
      },

      projectOperations: {
        available: currentPhase === ProjectPhase.ACTIVE,
        requirement: currentPhase === ProjectPhase.ACTIVE ? 'Available' : 'Project must be in active phase',
        guidance: currentPhase !== ProjectPhase.ACTIVE
          ? 'Full operational features are available during the active phase'
          : undefined,
        recommendedPhase: ProjectPhase.ACTIVE,
        blockedReason: currentPhase !== ProjectPhase.ACTIVE
          ? `Current phase: ${currentPhase}`
          : undefined
      },

      notifications: {
        available: currentPhase === ProjectPhase.PRE_SHOW || 
                  currentPhase === ProjectPhase.ACTIVE || 
                  currentPhase === ProjectPhase.POST_SHOW,
        requirement: 'Available during operational phases',
        guidance: !(currentPhase === ProjectPhase.PRE_SHOW || 
                   currentPhase === ProjectPhase.ACTIVE || 
                   currentPhase === ProjectPhase.POST_SHOW)
          ? 'Notifications are available during pre-show, active, and post-show phases'
          : undefined,
        recommendedPhase: ProjectPhase.ACTIVE,
        blockedReason: !(currentPhase === ProjectPhase.PRE_SHOW || 
                        currentPhase === ProjectPhase.ACTIVE || 
                        currentPhase === ProjectPhase.POST_SHOW)
          ? `Current phase: ${currentPhase}`
          : undefined
      },

      timecards: {
        available: currentPhase === ProjectPhase.POST_SHOW || currentPhase === ProjectPhase.COMPLETE,
        requirement: 'Available during post-show and complete phases',
        guidance: !(currentPhase === ProjectPhase.POST_SHOW || currentPhase === ProjectPhase.COMPLETE)
          ? 'Timecard processing is available after the show ends'
          : undefined,
        recommendedPhase: ProjectPhase.POST_SHOW,
        blockedReason: !(currentPhase === ProjectPhase.POST_SHOW || currentPhase === ProjectPhase.COMPLETE)
          ? `Current phase: ${currentPhase}`
          : undefined
      },

      teamManagement: {
        available: currentPhase === ProjectPhase.PREP || 
                  currentPhase === ProjectPhase.STAFFING || 
                  currentPhase === ProjectPhase.PRE_SHOW,
        requirement: 'Available during setup and preparation phases',
        guidance: !(currentPhase === ProjectPhase.PREP || 
                   currentPhase === ProjectPhase.STAFFING || 
                   currentPhase === ProjectPhase.PRE_SHOW)
          ? 'Team management is primarily available during setup phases'
          : undefined,
        recommendedPhase: ProjectPhase.STAFFING,
        blockedReason: !(currentPhase === ProjectPhase.PREP || 
                        currentPhase === ProjectPhase.STAFFING || 
                        currentPhase === ProjectPhase.PRE_SHOW)
          ? `Current phase: ${currentPhase}`
          : undefined
      },

      phaseTransitions: {
        available: currentPhase !== ProjectPhase.ARCHIVED,
        requirement: currentPhase !== ProjectPhase.ARCHIVED ? 'Available' : 'Not available for archived projects',
        guidance: currentPhase === ProjectPhase.ARCHIVED
          ? 'Phase transitions are not available for archived projects'
          : undefined,
        blockedReason: currentPhase === ProjectPhase.ARCHIVED
          ? 'Project is archived'
          : undefined
      },

      configurationMode: {
        available: true, // Configuration mode is always available
        requirement: 'Always available',
        guidance: currentPhase === ProjectPhase.PREP || currentPhase === ProjectPhase.STAFFING
          ? 'Configuration mode is recommended for setup phases'
          : undefined
      },

      operationsMode: {
        available: true, // Operations mode is always available
        requirement: 'Always available',
        guidance: currentPhase === ProjectPhase.ACTIVE || currentPhase === ProjectPhase.PRE_SHOW
          ? 'Operations mode is recommended for active phases'
          : currentPhase === ProjectPhase.PREP || currentPhase === ProjectPhase.STAFFING
          ? 'Operations mode shows limited functionality during setup phases'
          : undefined
      }
    }
  }, [currentPhase])

  return {
    features,
    currentPhase,
    loading,
    error
  }
}

/**
 * Hook to check availability of a specific feature based on phase
 */
export function useSpecificPhaseFeatureAvailability(
  featureName: keyof PhaseFeatureAvailabilityMap
): PhaseFeatureAvailabilityCheck & { currentPhase: ProjectPhase | null; loading: boolean; error: string | null } {
  const { features, currentPhase, loading, error } = usePhaseFeatureAvailability()
  
  return {
    ...features[featureName],
    currentPhase,
    loading,
    error
  }
}

/**
 * Hook to get phase-appropriate mode recommendation
 */
export function usePhaseBasedModeRecommendation() {
  const { currentPhase, loading, error } = usePhaseFeatureAvailability()
  
  const recommendedMode = useMemo(() => {
    if (!currentPhase) return 'configuration'
    
    // Recommend configuration mode for setup phases
    if (currentPhase === ProjectPhase.PREP || currentPhase === ProjectPhase.STAFFING) {
      return 'configuration'
    }
    
    // Recommend operations mode for active phases
    if (currentPhase === ProjectPhase.ACTIVE || 
        currentPhase === ProjectPhase.PRE_SHOW || 
        currentPhase === ProjectPhase.POST_SHOW) {
      return 'operations'
    }
    
    // Default to configuration for other phases
    return 'configuration'
  }, [currentPhase])
  
  return {
    recommendedMode,
    currentPhase,
    loading,
    error
  }
}