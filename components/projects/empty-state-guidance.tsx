"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Settings, 
  AlertTriangle, 
  Lightbulb, 
  ArrowRight,
  FileText
} from 'lucide-react'
import { useCachedFeatureAvailability, useCachedFeatureGuidance } from '@/hooks/use-cached-feature-availability'
import { usePhaseFeatureAvailability } from '@/hooks/use-phase-feature-availability'

interface EmptyStateGuidanceProps {
  area: 'talent' | 'team' | 'assignments' | 'settings'
  variant: 'empty' | 'filtered'
  projectId: string // Required for phase-based feature availability
  onNavigate?: (route: string) => void
  customMessage?: string
  customActions?: Array<{
    label: string
    route: string
    variant?: 'default' | 'outline' | 'secondary'
  }>
  // Legacy prop for backward compatibility - will be ignored in favor of phase data
  featureAvailability?: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
}

const getAreaConfig = (area: string) => {
  switch (area) {
    case 'talent':
      return {
        icon: Users,
        title: 'Talent Roster',
        emptyTitle: 'No Talent Assigned',
        emptyDescription: 'Get started by adding talent to your project roster',
        filteredTitle: 'No Matching Talent',
        filteredDescription: 'Try adjusting your search or filters to find talent',
        primaryAction: {
          label: 'Add New Talent',
          route: '/talent/new'
        },
        secondaryActions: [
          {
            label: 'Import from CSV',
            route: '/talent/import'
          },
          {
            label: 'Browse Available Talent',
            route: '/talent/browse'
          }
        ]
      }
    case 'team':
      return {
        icon: UserPlus,
        title: 'Team Assignments',
        emptyTitle: 'No Team Members Assigned',
        emptyDescription: 'Assign staff members to roles to get your project team ready',
        filteredTitle: 'No Matching Team Members',
        filteredDescription: 'Try adjusting your search or filters to find team members',
        primaryAction: {
          label: 'Assign Staff Members',
          route: '/roles-team'
        },
        secondaryActions: [
          {
            label: 'Configure Role Templates',
            route: '/roles-team#templates'
          },
          {
            label: 'View Available Staff',
            route: '/roles-team#available'
          }
        ]
      }
    case 'assignments':
      return {
        icon: Calendar,
        title: 'Assignments',
        emptyTitle: 'No Assignments Created',
        emptyDescription: 'Create escort assignments to manage talent logistics',
        filteredTitle: 'No Assignments for Selected Date',
        filteredDescription: 'Select a different date using the date selector above, or create new assignments',
        primaryAction: {
          label: 'Add or Schedule Talent',
          route: '/talent-roster'
        },
        secondaryActions: [
          {
            label: 'Assign Escorts',
            route: '/roles-team'
          }
        ]
      }
    case 'settings':
      return {
        icon: Settings,
        title: 'Project Settings',
        emptyTitle: 'Configure Project Settings',
        emptyDescription: 'Set up project preferences and operational parameters',
        filteredTitle: 'Settings Configuration',
        filteredDescription: 'Customize your project settings below',
        primaryAction: {
          label: 'Configure Notifications',
          route: '/settings#notifications'
        },
        secondaryActions: [
          {
            label: 'Upload Documents',
            route: '/settings#attachments'
          },
          {
            label: 'View Audit Log',
            route: '/settings#audit'
          }
        ]
      }
    default:
      return {
        icon: FileText,
        title: 'Project Area',
        emptyTitle: 'No Data Available',
        emptyDescription: 'Get started by configuring this area',
        filteredTitle: 'No Matching Results',
        filteredDescription: 'Try adjusting your search criteria',
        primaryAction: {
          label: 'Get Started',
          route: '/'
        },
        secondaryActions: []
      }
  }
}

export function EmptyStateGuidance({ 
  area, 
  variant, 
  projectId,
  onNavigate, 
  customMessage,
  customActions 
}: EmptyStateGuidanceProps) {
  const config = getAreaConfig(area)
  const Icon = config.icon

  // Use phase-based feature availability instead of cached readiness data
  const { features: phaseFeatures, currentPhase, loading, error } = usePhaseFeatureAvailability(projectId)
  
  // Fallback to cached readiness data for backward compatibility
  const featureAvailability = useCachedFeatureAvailability()
  const { blockingIssues, nextSteps, hasBlockingIssues } = useCachedFeatureGuidance()

  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route)
    } else {
      // Default navigation behavior - could be enhanced with router
      console.log('Navigate to:', route)
    }
  }

  // Determine if the current area's feature is available based on phase data
  const getAreaFeatureAvailability = () => {
    if (loading) {
      return {
        available: false,
        requirement: 'Loading project phase...',
        guidance: 'Please wait while we check phase-based feature availability',
        actionRoute: undefined
      }
    }

    if (error) {
      return {
        available: false,
        requirement: 'Error loading project phase',
        guidance: 'Please refresh the page to try again',
        actionRoute: undefined
      }
    }

    // Map area to phase-based feature availability
    switch (area) {
      case 'talent':
        return {
          available: phaseFeatures.talentManagement.available,
          requirement: phaseFeatures.talentManagement.requirement,
          guidance: phaseFeatures.talentManagement.guidance,
          actionRoute: phaseFeatures.talentManagement.actionRoute
        }
      case 'team':
        return {
          available: phaseFeatures.teamManagement.available,
          requirement: phaseFeatures.teamManagement.requirement,
          guidance: phaseFeatures.teamManagement.guidance,
          actionRoute: phaseFeatures.teamManagement.actionRoute
        }
      case 'assignments':
        return {
          available: phaseFeatures.assignments.available,
          requirement: phaseFeatures.assignments.requirement,
          guidance: phaseFeatures.assignments.guidance,
          actionRoute: phaseFeatures.assignments.actionRoute
        }
      case 'settings':
        return {
          available: true, // Settings are always available
          requirement: 'Settings are available',
          guidance: currentPhase ? `Current phase: ${currentPhase}` : undefined,
          actionRoute: undefined
        }
      default:
        return {
          available: false,
          requirement: 'Unknown feature area',
          guidance: undefined,
          actionRoute: undefined
        }
    }
  }

  const currentFeatureAvailability = getAreaFeatureAvailability()

  // Show feature availability guidance if feature is not available
  if (!currentFeatureAvailability.available) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Alert className="mb-6 max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Feature Not Available</p>
                <p className="text-sm">{currentFeatureAvailability.requirement}</p>
                {currentFeatureAvailability.guidance && (
                  <p className="text-sm text-muted-foreground">
                    {currentFeatureAvailability.guidance}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <Icon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Setup Required</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Complete the required setup steps to access {config.title.toLowerCase()} features.
          </p>

          {currentFeatureAvailability.actionRoute && (
            <Button 
              onClick={() => handleNavigate(currentFeatureAvailability.actionRoute!)}
              className="gap-2"
            >
              Complete Setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Show custom message if provided
  if (customMessage) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Icon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-6 max-w-md">
            {customMessage}
          </p>
          
          {customActions && customActions.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {customActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={() => handleNavigate(action.route)}
                  className="gap-2"
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Standard empty state or filtered state
  const isFiltered = variant === 'filtered'
  const title = isFiltered ? config.filteredTitle : config.emptyTitle
  const description = isFiltered ? config.filteredDescription : config.emptyDescription

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {description}
        </p>

        {!isFiltered && (
          <div className="space-y-3">
            {/* Primary Action */}
            <Button 
              onClick={() => handleNavigate(config.primaryAction.route)}
              className="gap-2"
            >
              {config.primaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Secondary Actions */}
            {config.secondaryActions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {config.secondaryActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate(action.route)}
                    className="gap-2"
                  >
                    {action.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Helpful Tips for Empty States */}
        {!isFiltered && area === 'talent' && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-left">
                <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Getting Started Tips
                </p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• Import talent from a CSV file for bulk setup</li>
                  <li>• Add individual talent with detailed profiles</li>
                  <li>• Create talent groups for easier management</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!isFiltered && area === 'team' && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-left">
                <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Team Setup Tips
                </p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• Configure role templates with pay rates first</li>
                  <li>• Assign supervisors for team oversight</li>
                  <li>• Ensure adequate escort coverage for talent</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!isFiltered && area === 'assignments' && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-left">
                <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Assignment Prerequisites
                </p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• Add talent to your roster first</li>
                  <li>• Assign escorts to your team</li>
                  <li>• Set project start and end dates</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Specific empty state components for each area
export function TalentEmptyState({ 
  projectId,
  variant = 'empty', 
  onNavigate
}: {
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void
}) {
  return (
    <EmptyStateGuidance
      area="talent"
      variant={variant}
      projectId={projectId}
      onNavigate={onNavigate}
    />
  )
}

export function TeamEmptyState({ 
  projectId,
  variant = 'empty', 
  onNavigate
}: {
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void
}) {
  return (
    <EmptyStateGuidance
      area="team"
      variant={variant}
      projectId={projectId}
      onNavigate={onNavigate}
    />
  )
}

export function AssignmentsEmptyState({ 
  projectId,
  variant = 'empty', 
  onNavigate
}: {
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void
}) {
  return (
    <EmptyStateGuidance
      area="assignments"
      variant={variant}
      projectId={projectId}
      onNavigate={onNavigate}
    />
  )
}

export function SettingsEmptyState({ 
  projectId,
  variant = 'empty', 
  onNavigate 
}: {
  projectId: string
  variant?: 'empty' | 'filtered'
  onNavigate?: (route: string) => void
}) {
  return (
    <EmptyStateGuidance
      area="settings"
      variant={variant}
      projectId={projectId}
      onNavigate={onNavigate}
    />
  )
}