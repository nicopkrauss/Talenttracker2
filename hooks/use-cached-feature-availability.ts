'use client';

import { useReadiness } from '../lib/contexts/readiness-context';

export type FeatureName = 
  | 'team_management'
  | 'talent_tracking' 
  | 'scheduling'
  | 'time_tracking';

export interface FeatureAvailability {
  canManageTeam: boolean;
  canTrackTalent: boolean;
  canSchedule: boolean;
  canTrackTime: boolean;
  isSetupComplete: boolean;
  isReadyForActivation: boolean;
  isActive: boolean;
  blockingIssues: string[];
  nextSteps: string[];
}

const BLOCKING_ISSUE_MESSAGES: Record<string, string> = {
  missing_role_templates: 'Add role templates to enable team management',
  missing_team_assignments: 'Assign team members to enable scheduling',
  missing_locations: 'Set up locations to enable talent tracking',
};

const getNextSteps = (readiness: any): string[] => {
  if (!readiness) return ['Loading project status...'];
  
  const steps: string[] = [];
  
  if (readiness.blocking_issues?.includes('missing_role_templates')) {
    steps.push('Set up project roles and pay rates');
  }
  
  if (readiness.blocking_issues?.includes('missing_team_assignments')) {
    steps.push('Assign team members to the project');
  }
  
  if (readiness.blocking_issues?.includes('missing_locations')) {
    steps.push('Configure project locations');
  }
  
  if (steps.length === 0 && readiness.status === 'ready_for_activation') {
    steps.push('Project is ready for activation');
  }
  
  if (steps.length === 0 && readiness.status === 'active') {
    steps.push('Project is active and fully operational');
  }
  
  return steps;
};

/**
 * Hook that uses cached readiness data from ReadinessProvider context
 * This is the optimized version that doesn't make additional API calls
 */
export const useCachedFeatureAvailability = (): FeatureAvailability => {
  const { readiness, isLoading, error, canAccessFeature, getBlockingIssues, isReady } = useReadiness();
  
  if (isLoading || error || !readiness) {
    return {
      canManageTeam: false,
      canTrackTalent: false,
      canSchedule: false,
      canTrackTime: false,
      isSetupComplete: false,
      isReadyForActivation: false,
      isActive: false,
      blockingIssues: [],
      nextSteps: error ? ['Error loading project status'] : isLoading ? ['Loading...'] : [],
    };
  }
  
  return {
    // Feature checks using cached data access
    canManageTeam: canAccessFeature('team_management'),
    canTrackTalent: canAccessFeature('talent_tracking'),
    canSchedule: true, // Scheduling/assignments are always available
    canTrackTime: canAccessFeature('time_tracking'),
    
    // Status checks
    isSetupComplete: isReady(),
    isReadyForActivation: readiness.status === 'ready_for_activation',
    isActive: readiness.status === 'active',
    
    // Guidance
    blockingIssues: getBlockingIssues(),
    nextSteps: getNextSteps(readiness),
  };
};

/**
 * Hook to check availability of a specific feature using cached data
 */
export const useSpecificCachedFeatureAvailability = (feature: FeatureName) => {
  const { canAccessFeature, isLoading, error } = useReadiness();
  
  return {
    available: canAccessFeature(feature),
    loading: isLoading,
    error: error?.message || null,
  };
};

/**
 * Hook to get blocking issues and next steps using cached data
 */
export const useCachedFeatureGuidance = () => {
  const { readiness, getBlockingIssues, isLoading, error } = useReadiness();
  
  const blockingIssues = getBlockingIssues();
  const nextSteps = getNextSteps(readiness);
  
  return {
    blockingIssues,
    nextSteps,
    hasBlockingIssues: blockingIssues.length > 0,
    loading: isLoading,
    error: error?.message || null,
  };
};