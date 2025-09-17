"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Users, 
  Star, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Archive,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  FileText,
  Lock
} from 'lucide-react'
import { ProjectPhase } from '@/lib/types/project-phase'
import { usePhaseFeatureAvailability } from '@/hooks/use-phase-feature-availability'
import { PhaseIndicatorCompact } from './phase-indicator'

interface PhaseAwareEmptyStateProps {
  projectId: string
  area: 'talent' | 'team' | 'assignments' | 'timecards' | 'operations'
  variant?: 'empty' | 'filtered' | 'unavailable'
  onNavigate?: (route: string) => void
  customMessage?: string
}

interface PhaseEmptyStateConfig {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actions: Array<{
    label: string
    route: string
    variant?: 'default' | 'outline' | 'secondary'
  }>
  tips?: string[]
}

// Phase-specific empty state configurations for each area
const PHASE_EMPTY_STATE_CONFIGS: Record<string, Record<ProjectPhase, PhaseEmptyStateConfig>> = {
  talent: {
    [ProjectPhase.PREP]: {
      icon: Star,
      title: 'Talent Roster Setup',
      description: 'Set up your project foundation first, then add talent to your roster.',
      actions: [
        { label: 'Complete Project Setup', route: '/info', variant: 'default' },
        { label: 'Configure Roles First', route: '/roles-team', variant: 'outline' }
      ],
      tips: [
        'Complete role templates before adding talent',
        'Set up project locations for talent tracking',
        'Configure basic project settings first'
      ]
    },
    [ProjectPhase.STAFFING]: {
      icon: Star,
      title: 'Build Your Talent Roster',
      description: 'Add talent to your project roster. This is the ideal phase for talent management.',
      actions: [
        { label: 'Add New Talent', route: '/talent/new', variant: 'default' },
        { label: 'Import from CSV', route: '/talent/import', variant: 'outline' },
        { label: 'Browse Available Talent', route: '/talent/browse', variant: 'outline' }
      ],
      tips: [
        'Add talent with detailed profiles and representative information',
        'Create talent groups for easier management',
        'Ensure all talent have assigned escorts'
      ]
    },
    [ProjectPhase.PRE_SHOW]: {
      icon: Star,
      title: 'Finalize Talent Roster',
      description: 'Review and finalize your talent roster before going live.',
      actions: [
        { label: 'Review Talent List', route: '/talent-roster', variant: 'default' },
        { label: 'Check Assignments', route: '/assignments', variant: 'outline' }
      ],
      tips: [
        'Verify all talent have complete profiles',
        'Confirm escort assignments are finalized',
        'Review talent groups and schedules'
      ]
    },
    [ProjectPhase.ACTIVE]: {
      icon: Star,
      title: 'Live Talent Tracking',
      description: 'Track talent locations and status in real-time during active operations.',
      actions: [
        { label: 'Operations Dashboard', route: '/?mode=operations', variant: 'default' },
        { label: 'Track Locations', route: '/talent-tracking', variant: 'outline' }
      ],
      tips: [
        'Use operations dashboard for live tracking',
        'Monitor talent locations and status',
        'Coordinate with escorts for updates'
      ]
    },
    [ProjectPhase.POST_SHOW]: {
      icon: Star,
      title: 'Talent Data Review',
      description: 'Review talent data and performance from the completed show.',
      actions: [
        { label: 'View Talent Reports', route: '/reports/talent', variant: 'default' },
        { label: 'Export Data', route: '/settings', variant: 'outline' }
      ]
    },
    [ProjectPhase.COMPLETE]: {
      icon: CheckCircle,
      title: 'Talent Data Complete',
      description: 'Talent data has been finalized for this completed project.',
      actions: [
        { label: 'View Final Reports', route: '/reports', variant: 'outline' }
      ]
    },
    [ProjectPhase.ARCHIVED]: {
      icon: Archive,
      title: 'Archived Talent Data',
      description: 'Historical talent data is preserved for reference.',
      actions: [
        { label: 'View Historical Data', route: '/info', variant: 'outline' }
      ]
    }
  },
  team: {
    [ProjectPhase.PREP]: {
      icon: Users,
      title: 'Team Setup Required',
      description: 'Set up role templates before assigning team members.',
      actions: [
        { label: 'Create Role Templates', route: '/roles-team', variant: 'default' },
        { label: 'Configure Project', route: '/info', variant: 'outline' }
      ],
      tips: [
        'Define roles with appropriate pay rates',
        'Set up supervisor and escort roles',
        'Configure project locations first'
      ]
    },
    [ProjectPhase.STAFFING]: {
      icon: Users,
      title: 'Build Your Team',
      description: 'Assign staff members to roles. This is the optimal phase for team building.',
      actions: [
        { label: 'Assign Team Members', route: '/roles-team', variant: 'default' },
        { label: 'View Available Staff', route: '/staff/available', variant: 'outline' }
      ],
      tips: [
        'Assign supervisors for team oversight',
        'Ensure adequate escort coverage',
        'Set role-specific pay rate overrides if needed'
      ]
    },
    [ProjectPhase.PRE_SHOW]: {
      icon: Users,
      title: 'Finalize Team Assignments',
      description: 'Review and confirm all team assignments before going live.',
      actions: [
        { label: 'Review Team', route: '/roles-team', variant: 'default' },
        { label: 'Check Availability', route: '/team/availability', variant: 'outline' }
      ]
    },
    [ProjectPhase.ACTIVE]: {
      icon: Clock,
      title: 'Live Team Operations',
      description: 'Monitor team status and manage time tracking during active operations.',
      actions: [
        { label: 'Operations Dashboard', route: '/?mode=operations', variant: 'default' },
        { label: 'Time Tracking', route: '/timecards', variant: 'outline' }
      ]
    },
    [ProjectPhase.POST_SHOW]: {
      icon: FileText,
      title: 'Team Performance Review',
      description: 'Review team performance and process final timecards.',
      actions: [
        { label: 'Process Timecards', route: '/timecards', variant: 'default' },
        { label: 'Team Reports', route: '/reports/team', variant: 'outline' }
      ]
    },
    [ProjectPhase.COMPLETE]: {
      icon: CheckCircle,
      title: 'Team Data Complete',
      description: 'All team data has been finalized for this project.',
      actions: [
        { label: 'View Team Summary', route: '/reports', variant: 'outline' }
      ]
    },
    [ProjectPhase.ARCHIVED]: {
      icon: Archive,
      title: 'Archived Team Data',
      description: 'Historical team data is preserved for reference.',
      actions: [
        { label: 'View Historical Data', route: '/info', variant: 'outline' }
      ]
    }
  },
  assignments: {
    [ProjectPhase.PREP]: {
      icon: Calendar,
      title: 'Setup Required for Assignments',
      description: 'Complete project setup and team assignments before creating talent assignments.',
      actions: [
        { label: 'Set Up Team First', route: '/roles-team', variant: 'default' },
        { label: 'Add Talent', route: '/talent-roster', variant: 'outline' }
      ],
      tips: [
        'Assign escorts to your team first',
        'Add talent to your roster',
        'Configure project dates and locations'
      ]
    },
    [ProjectPhase.STAFFING]: {
      icon: Calendar,
      title: 'No Assignments Yet',
      description: 'Assignments can be created at any time. Add talent to your roster and assign escorts as needed.',
      actions: [
        { label: 'Add Talent', route: '/talent-roster', variant: 'default' },
        { label: 'View Team', route: '/roles-team', variant: 'outline' }
      ]
    },
    [ProjectPhase.PRE_SHOW]: {
      icon: Calendar,
      title: 'Create Talent Assignments',
      description: 'Create and manage talent assignments for your project.',
      actions: [
        { label: 'Create Assignments', route: '/assignments/new', variant: 'default' },
        { label: 'Schedule Talent', route: '/talent-roster', variant: 'outline' }
      ],
      tips: [
        'Assign escorts to talent for each day',
        'Set up recurring assignments for multi-day shows',
        'Review assignment conflicts and gaps'
      ]
    },
    [ProjectPhase.ACTIVE]: {
      icon: Calendar,
      title: 'Live Assignment Management',
      description: 'Monitor and adjust assignments during active operations.',
      actions: [
        { label: 'Operations Dashboard', route: '/?mode=operations', variant: 'default' },
        { label: 'Manage Assignments', route: '/assignments', variant: 'outline' }
      ]
    },
    [ProjectPhase.POST_SHOW]: {
      icon: FileText,
      title: 'Assignment Review',
      description: 'Review assignment performance and completion.',
      actions: [
        { label: 'Assignment Reports', route: '/reports/assignments', variant: 'default' }
      ]
    },
    [ProjectPhase.COMPLETE]: {
      icon: CheckCircle,
      title: 'Assignments Complete',
      description: 'All assignments have been completed and finalized.',
      actions: [
        { label: 'View Assignment Summary', route: '/reports', variant: 'outline' }
      ]
    },
    [ProjectPhase.ARCHIVED]: {
      icon: Archive,
      title: 'Archived Assignment Data',
      description: 'Historical assignment data is preserved for reference.',
      actions: [
        { label: 'View Historical Data', route: '/info', variant: 'outline' }
      ]
    }
  },
  timecards: {
    [ProjectPhase.PREP]: {
      icon: Clock,
      title: 'Timecards Not Available',
      description: 'Time tracking features will be available once the project is active.',
      actions: [
        { label: 'Complete Setup', route: '/info', variant: 'default' }
      ]
    },
    [ProjectPhase.STAFFING]: {
      icon: Clock,
      title: 'Timecards Not Available',
      description: 'Time tracking features will be available once the project is active.',
      actions: [
        { label: 'Finish Team Setup', route: '/roles-team', variant: 'default' }
      ]
    },
    [ProjectPhase.PRE_SHOW]: {
      icon: Clock,
      title: 'Timecards Not Available',
      description: 'Time tracking will begin when the project becomes active.',
      actions: [
        { label: 'Review Assignments', route: '/assignments', variant: 'default' }
      ]
    },
    [ProjectPhase.ACTIVE]: {
      icon: Clock,
      title: 'Time Tracking Active',
      description: 'Staff can now track time and manage breaks.',
      actions: [
        { label: 'Operations Dashboard', route: '/?mode=operations', variant: 'default' },
        { label: 'Track Time', route: '/time-tracking', variant: 'outline' }
      ]
    },
    [ProjectPhase.POST_SHOW]: {
      icon: Clock,
      title: 'Process Timecards',
      description: 'Review and approve staff timecards for payroll processing.',
      actions: [
        { label: 'Review Timecards', route: '/timecards/review', variant: 'default' },
        { label: 'Approve All', route: '/timecards/approve', variant: 'outline' }
      ],
      tips: [
        'Review all staff timecards for accuracy',
        'Handle any timecard disputes or corrections',
        'Process approved timecards for payroll'
      ]
    },
    [ProjectPhase.COMPLETE]: {
      icon: CheckCircle,
      title: 'Timecards Complete',
      description: 'All timecards have been processed and approved.',
      actions: [
        { label: 'View Timecard Summary', route: '/reports/timecards', variant: 'outline' }
      ]
    },
    [ProjectPhase.ARCHIVED]: {
      icon: Archive,
      title: 'Archived Timecard Data',
      description: 'Historical timecard data is preserved for reference.',
      actions: [
        { label: 'View Historical Data', route: '/info', variant: 'outline' }
      ]
    }
  },
  operations: {
    [ProjectPhase.PREP]: {
      icon: Settings,
      title: 'Operations Not Available',
      description: 'Complete project setup to access operational features.',
      actions: [
        { label: 'Complete Setup', route: '/info', variant: 'default' }
      ]
    },
    [ProjectPhase.STAFFING]: {
      icon: Users,
      title: 'Operations Not Available',
      description: 'Finish team staffing to access operational features.',
      actions: [
        { label: 'Complete Staffing', route: '/roles-team', variant: 'default' }
      ]
    },
    [ProjectPhase.PRE_SHOW]: {
      icon: Calendar,
      title: 'Operations Preview',
      description: 'Operations features will be fully available when the project goes active.',
      actions: [
        { label: 'Preview Dashboard', route: '/?mode=operations', variant: 'outline' },
        { label: 'Finalize Assignments', route: '/assignments', variant: 'default' }
      ]
    },
    [ProjectPhase.ACTIVE]: {
      icon: CheckCircle,
      title: 'Live Operations',
      description: 'Full operational dashboard with real-time tracking and management.',
      actions: [
        { label: 'Operations Dashboard', route: '/?mode=operations', variant: 'default' }
      ]
    },
    [ProjectPhase.POST_SHOW]: {
      icon: FileText,
      title: 'Post-Show Operations',
      description: 'Limited operations focused on timecard processing and final tasks.',
      actions: [
        { label: 'Process Timecards', route: '/timecards', variant: 'default' },
        { label: 'View Reports', route: '/reports', variant: 'outline' }
      ]
    },
    [ProjectPhase.COMPLETE]: {
      icon: CheckCircle,
      title: 'Operations Complete',
      description: 'All operational tasks have been completed.',
      actions: [
        { label: 'View Final Reports', route: '/reports', variant: 'outline' }
      ]
    },
    [ProjectPhase.ARCHIVED]: {
      icon: Archive,
      title: 'Archived Operations Data',
      description: 'Historical operational data is preserved for reference.',
      actions: [
        { label: 'View Historical Data', route: '/info', variant: 'outline' }
      ]
    }
  }
}

export function PhaseAwareEmptyState({
  projectId,
  area,
  variant = 'empty',
  onNavigate,
  customMessage
}: PhaseAwareEmptyStateProps) {
  const { currentPhase, loading, error } = usePhaseFeatureAvailability(projectId)

  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route)
    } else {
      console.log('Navigate to:', route)
    }
  }

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="animate-pulse space-y-4" data-testid="loading-skeleton">
            <div className="h-12 w-12 bg-muted rounded-full" />
            <div className="h-4 bg-muted rounded w-48" />
            <div className="h-3 bg-muted rounded w-64" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load Phase Data</h3>
          <p className="text-muted-foreground mb-4">
            {error}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!currentPhase) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Phase Information Unavailable</h3>
          <p className="text-muted-foreground mb-4">
            Unable to determine project phase
          </p>
        </CardContent>
      </Card>
    )
  }

  // Handle filtered variant
  if (variant === 'filtered') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Matching Results</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters to find {area}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Current phase:</span>
            <PhaseIndicatorCompact currentPhase={currentPhase} />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get phase-specific configuration
  const areaConfigs = PHASE_EMPTY_STATE_CONFIGS[area]
  if (!areaConfigs) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-muted-foreground mb-4">
            {customMessage || `No ${area} data available for this project`}
          </p>
        </CardContent>
      </Card>
    )
  }

  const config = areaConfigs[currentPhase]
  if (!config) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Configuration Not Available</h3>
          <p className="text-muted-foreground mb-4">
            No configuration available for {area} in {currentPhase} phase
          </p>
        </CardContent>
      </Card>
    )
  }

  const Icon = config.icon

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {/* Phase indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Current phase:</span>
          <PhaseIndicatorCompact currentPhase={currentPhase} />
        </div>

        {/* Main icon and content */}
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {customMessage || config.description}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {config.actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              onClick={() => handleNavigate(action.route)}
              className="gap-2"
            >
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ))}
        </div>

        {/* Tips */}
        {config.tips && config.tips.length > 0 && (
          <div className="max-w-md">
            <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-left">
                <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Phase-Specific Tips
                </p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {config.tips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Specific phase-aware empty state components
export function PhaseAwareTalentEmptyState({ 
  projectId, 
  variant, 
  onNavigate 
}: { 
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void 
}) {
  return (
    <PhaseAwareEmptyState
      projectId={projectId}
      area="talent"
      variant={variant}
      onNavigate={onNavigate}
    />
  )
}

export function PhaseAwareTeamEmptyState({ 
  projectId, 
  variant, 
  onNavigate 
}: { 
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void 
}) {
  return (
    <PhaseAwareEmptyState
      projectId={projectId}
      area="team"
      variant={variant}
      onNavigate={onNavigate}
    />
  )
}

export function PhaseAwareAssignmentsEmptyState({ 
  projectId, 
  variant, 
  onNavigate 
}: { 
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void 
}) {
  return (
    <PhaseAwareEmptyState
      projectId={projectId}
      area="assignments"
      variant={variant}
      onNavigate={onNavigate}
    />
  )
}

export function PhaseAwareTimecardsEmptyState({ 
  projectId, 
  variant, 
  onNavigate 
}: { 
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void 
}) {
  return (
    <PhaseAwareEmptyState
      projectId={projectId}
      area="timecards"
      variant={variant}
      onNavigate={onNavigate}
    />
  )
}

export function PhaseAwareOperationsEmptyState({ 
  projectId, 
  variant, 
  onNavigate 
}: { 
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void 
}) {
  return (
    <PhaseAwareEmptyState
      projectId={projectId}
      area="operations"
      variant={variant}
      onNavigate={onNavigate}
    />
  )
}