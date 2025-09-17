"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  BarChart3,
  FileText
} from 'lucide-react'
import { ProjectPhase } from '@/lib/types/project-phase'
import { usePhaseFeatureAvailability } from '@/hooks/use-phase-feature-availability'
import { PhaseIndicator } from './phase-indicator'
import { PhaseActionItems } from './phase-action-items'
import { EnhancedProject } from '@/lib/types'

interface PhaseSpecificDashboardProps {
  projectId: string
  project: EnhancedProject
  onNavigate?: (route: string) => void
}

interface PhaseConfig {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  primaryActions: Array<{
    label: string
    route: string
    icon: React.ComponentType<{ className?: string }>
    variant?: 'default' | 'outline' | 'secondary'
  }>
  features: string[]
  guidance: string[]
}

const PHASE_CONFIGS: Record<ProjectPhase, PhaseConfig> = {
  [ProjectPhase.PREP]: {
    title: 'Project Preparation',
    description: 'Set up your project foundation with roles, locations, and basic configuration.',
    icon: Settings,
    color: 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-200',
    primaryActions: [
      {
        label: 'Configure Roles & Pay Rates',
        route: '/roles-team',
        icon: Users,
        variant: 'default'
      },
      {
        label: 'Set Up Locations',
        route: '/info',
        icon: Settings,
        variant: 'outline'
      }
    ],
    features: [
      'Project configuration',
      'Role template setup',
      'Location configuration',
      'Basic project settings'
    ],
    guidance: [
      'Start by defining role templates with appropriate pay rates',
      'Configure project locations where talent will be tracked',
      'Set up basic project information and preferences',
      'Complete all setup items to advance to staffing phase'
    ]
  },
  [ProjectPhase.STAFFING]: {
    title: 'Team Staffing',
    description: 'Build your project team by assigning staff to roles and adding talent to your roster.',
    icon: Users,
    color: 'bg-purple-50 text-purple-800 dark:bg-purple-950/20 dark:text-purple-200',
    primaryActions: [
      {
        label: 'Assign Team Members',
        route: '/roles-team',
        icon: Users,
        variant: 'default'
      },
      {
        label: 'Add Talent to Roster',
        route: '/talent-roster',
        icon: Star,
        variant: 'default'
      }
    ],
    features: [
      'Team member assignment',
      'Talent roster management',
      'Role-based permissions',
      'Staff availability tracking'
    ],
    guidance: [
      'Assign supervisors, coordinators, and escorts to your team',
      'Add talent to your roster with detailed profiles',
      'Ensure adequate escort coverage for your talent',
      'Complete staffing to advance to pre-show phase'
    ]
  },
  [ProjectPhase.PRE_SHOW]: {
    title: 'Pre-Show Preparation',
    description: 'Final preparations before rehearsals begin. Complete assignments and verify readiness.',
    icon: Calendar,
    color: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200',
    primaryActions: [
      {
        label: 'Review Assignments',
        route: '/assignments',
        icon: Calendar,
        variant: 'default'
      },
      {
        label: 'Check Team Readiness',
        route: '/roles-team',
        icon: CheckCircle,
        variant: 'outline'
      }
    ],
    features: [
      'Final preparations and planning',
      'Location tracking setup',
      'Final team verification',
      'Pre-show notifications'
    ],
    guidance: [
      'Complete final preparations and planning',
      'Verify team readiness and assignments',
      'Test location tracking and notification systems',
      'Project will automatically advance to active phase at rehearsal start'
    ]
  },
  [ProjectPhase.ACTIVE]: {
    title: 'Active Operations',
    description: 'Live project operations with real-time tracking, time management, and operational dashboards.',
    icon: BarChart3,
    color: 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200',
    primaryActions: [
      {
        label: 'Operations Dashboard',
        route: '/?mode=operations',
        icon: BarChart3,
        variant: 'default'
      },
      {
        label: 'Track Time & Attendance',
        route: '/timecards',
        icon: Clock,
        variant: 'outline'
      }
    ],
    features: [
      'Real-time operations dashboard',
      'Time tracking and attendance',
      'Location tracking',
      'Live talent and staff status',
      'Supervisor checkout capabilities'
    ],
    guidance: [
      'Monitor live project status and staff attendance',
      'Track talent locations and live status',
      'Manage time tracking and break schedules',
      'Project will automatically advance to post-show phase after final show'
    ]
  },
  [ProjectPhase.POST_SHOW]: {
    title: 'Post-Show Processing',
    description: 'Process timecards, handle payroll, and complete final project tasks.',
    icon: FileText,
    color: 'bg-orange-50 text-orange-800 dark:bg-orange-950/20 dark:text-orange-200',
    primaryActions: [
      {
        label: 'Process Timecards',
        route: '/timecards',
        icon: Clock,
        variant: 'default'
      },
      {
        label: 'Review Project Data',
        route: '/info',
        icon: BarChart3,
        variant: 'outline'
      }
    ],
    features: [
      'Timecard processing',
      'Payroll management',
      'Project data review',
      'Final reporting'
    ],
    guidance: [
      'Review and approve all staff timecards',
      'Process payroll and handle any discrepancies',
      'Generate final project reports',
      'Complete all tasks to advance to complete phase'
    ]
  },
  [ProjectPhase.COMPLETE]: {
    title: 'Project Complete',
    description: 'Project has been completed successfully. Review final data and prepare for archival.',
    icon: CheckCircle,
    color: 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200',
    primaryActions: [
      {
        label: 'View Project Summary',
        route: '/info',
        icon: BarChart3,
        variant: 'default'
      },
      {
        label: 'Export Data',
        route: '/settings',
        icon: FileText,
        variant: 'outline'
      }
    ],
    features: [
      'Project summary and analytics',
      'Data export capabilities',
      'Historical reporting',
      'Archive preparation'
    ],
    guidance: [
      'Review final project statistics and outcomes',
      'Export data for record keeping',
      'Document lessons learned and best practices',
      'Project will be automatically archived on the configured date'
    ]
  },
  [ProjectPhase.ARCHIVED]: {
    title: 'Archived Project',
    description: 'This project has been archived. Data is preserved for historical reference.',
    icon: Archive,
    color: 'bg-gray-50 text-gray-800 dark:bg-gray-950/20 dark:text-gray-200',
    primaryActions: [
      {
        label: 'View Historical Data',
        route: '/info',
        icon: BarChart3,
        variant: 'outline'
      }
    ],
    features: [
      'Read-only historical data',
      'Project statistics',
      'Data export (limited)',
      'Reference documentation'
    ],
    guidance: [
      'This project is archived and cannot be modified',
      'Historical data is preserved for reference',
      'Limited export capabilities are available',
      'Contact administrators for data restoration if needed'
    ]
  }
}

export function PhaseSpecificDashboard({ 
  projectId, 
  project, 
  onNavigate 
}: PhaseSpecificDashboardProps) {
  const { currentPhase, loading, error } = usePhaseFeatureAvailability(projectId)

  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route)
    } else {
      // Default navigation behavior
      console.log('Navigate to:', route)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load phase information: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!currentPhase) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Project phase information is not available
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const phaseConfig = PHASE_CONFIGS[currentPhase]
  const PhaseIcon = phaseConfig.icon

  return (
    <div className="space-y-6">
      {/* Phase Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <PhaseIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">{phaseConfig.title}</CardTitle>
                  <PhaseIndicator currentPhase={currentPhase} showDescription={false} />
                </div>
              </div>
            </div>
            <Badge className={phaseConfig.color}>
              {currentPhase.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            {phaseConfig.description}
          </p>

          {/* Primary Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            {phaseConfig.primaryActions.map((action, index) => {
              const ActionIcon = action.icon
              return (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  onClick={() => handleNavigate(action.route)}
                  className="gap-2"
                >
                  <ActionIcon className="h-4 w-4" />
                  {action.label}
                </Button>
              )
            })}
          </div>

          {/* Available Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Available Features
              </h4>
              <ul className="space-y-2">
                {phaseConfig.features.map((feature, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                Phase Guidance
              </h4>
              <ul className="space-y-2">
                {phaseConfig.guidance.map((tip, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase-Specific Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Phase Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhaseActionItems
            projectId={projectId}
            currentPhase={currentPhase}
            showFilters={false}
            showSummary={true}
            compact={true}
          />
        </CardContent>
      </Card>

      {/* Phase-Specific Warnings or Information */}
      {currentPhase === ProjectPhase.ARCHIVED && (
        <Alert>
          <Archive className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Archived Project</p>
              <p className="text-sm">
                This project has been archived and is in read-only mode. 
                Historical data is preserved but no modifications can be made.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {currentPhase === ProjectPhase.ACTIVE && (
        <Alert>
          <BarChart3 className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Live Operations Active</p>
              <p className="text-sm">
                Your project is in active operations mode. Switch to Operations view 
                for real-time dashboards and live tracking features.
              </p>
              <Button 
                size="sm" 
                onClick={() => handleNavigate('/?mode=operations')}
                className="gap-2 mt-2"
              >
                Switch to Operations View
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {(currentPhase === ProjectPhase.PREP || currentPhase === ProjectPhase.STAFFING) && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Setup Phase</p>
              <p className="text-sm">
                Complete all setup tasks to unlock additional features and advance 
                to the next phase. Use Configuration view for optimal setup experience.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Compact widget version for embedding in other components
export function PhaseSpecificWidget({ 
  projectId, 
  currentPhase 
}: { 
  projectId: string
  currentPhase: ProjectPhase 
}) {
  const phaseConfig = PHASE_CONFIGS[currentPhase]
  const PhaseIcon = phaseConfig.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PhaseIcon className="h-4 w-4" />
          <CardTitle className="text-sm">{phaseConfig.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {phaseConfig.description}
        </p>
        
        <div className="space-y-1">
          <p className="text-xs font-medium">Key Features:</p>
          <ul className="space-y-1">
            {phaseConfig.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}