"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  ChevronDown, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle,
  ArrowRight,
  Activity,
  Users,
  MapPin,
  Calendar,
  Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { EnhancedProject } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useReadiness } from '@/lib/contexts/readiness-context'
import { usePhaseFeatureAvailability } from '@/hooks/use-phase-feature-availability'
import { PhaseSpecificDashboard } from './phase-specific-dashboard'

// Types for the dashboard data
interface TodoItem {
  id: string
  area: 'locations' | 'roles' | 'team' | 'talent' | 'assignments'
  priority: 'critical' | 'important' | 'optional'
  title: string
  description: string
  actionText: string
  actionRoute: string
}

interface AssignmentProgress {
  totalAssignments: number
  completedAssignments: number
  urgentIssues: number
  upcomingDeadlines: Array<{
    date: string
    missingAssignments: number
    daysFromNow: number
  }>
  assignmentRate: number
  totalEntities: number
  projectDays: number
  error?: string
  message?: string
}

interface FeatureAvailability {
  timeTracking: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  assignments: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  locationTracking: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  supervisorCheckout: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  talentManagement: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  projectOperations: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  notifications: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
}

interface ProjectReadiness {
  project_id: string
  // Locations
  has_default_locations: boolean
  custom_location_count: number
  locations_finalized: boolean
  locations_finalized_at?: string
  locations_finalized_by?: string
  locations_status: 'default-only' | 'configured' | 'finalized'
  // Roles
  has_default_roles: boolean
  custom_role_count: number
  roles_finalized: boolean
  roles_finalized_at?: string
  roles_finalized_by?: string
  roles_status: 'default-only' | 'configured' | 'finalized'
  // Team
  total_staff_assigned: number
  supervisor_count: number
  escort_count: number
  coordinator_count: number
  team_finalized: boolean
  team_finalized_at?: string
  team_finalized_by?: string
  team_status: 'none' | 'partial' | 'finalized'
  // Talent
  total_talent: number
  talent_finalized: boolean
  talent_finalized_at?: string
  talent_finalized_by?: string
  talent_status: 'none' | 'partial' | 'finalized'
  // Assignment Progress
  assignments_status: 'none' | 'partial' | 'current' | 'complete'
  urgent_assignment_issues: number
  // Overall
  overall_status: 'getting-started' | 'operational' | 'production-ready'
  last_updated: string
  // Generated data
  todoItems: TodoItem[]
  featureAvailability: FeatureAvailability
  assignmentProgress: AssignmentProgress
}

interface InfoTabDashboardProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function InfoTabDashboard({ project, onProjectUpdate }: InfoTabDashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { readiness: cachedReadiness, isLoading, error } = useReadiness()
  const { currentPhase, loading: phaseLoading } = usePhaseFeatureAvailability(project.id)
  const [isStatusOpen, setIsStatusOpen] = useState(true)
  const [isTodoOpen, setIsTodoOpen] = useState(true)
  const [isCompletedOpen, setIsCompletedOpen] = useState(false)
  const [showLegacyDashboard, setShowLegacyDashboard] = useState(false)

  // Convert cached readiness to dashboard format
  const getDashboardReadiness = (): ProjectReadiness | null => {
    if (!cachedReadiness) return null

    // Create a fallback dashboard readiness based on cached data
    const dashboardReadiness: ProjectReadiness = {
      project_id: cachedReadiness.project_id,
      has_default_locations: true,
      custom_location_count: 0,
      locations_finalized: cachedReadiness.features.talent_tracking,
      locations_status: cachedReadiness.features.talent_tracking ? 'finalized' : 'default-only',
      has_default_roles: true,
      custom_role_count: 0,
      roles_finalized: cachedReadiness.features.team_management,
      roles_status: cachedReadiness.features.team_management ? 'finalized' : 'default-only',
      total_staff_assigned: 0,
      supervisor_count: 0,
      escort_count: 0,
      coordinator_count: 0,
      team_finalized: cachedReadiness.features.team_management,
      team_status: cachedReadiness.features.team_management ? 'finalized' : 'none',
      total_talent: 0,
      talent_finalized: cachedReadiness.features.scheduling,
      talent_status: cachedReadiness.features.scheduling ? 'finalized' : 'none',
      assignments_status: cachedReadiness.features.scheduling ? 'current' : 'none',
      urgent_assignment_issues: cachedReadiness.blocking_issues.length,
      overall_status: cachedReadiness.status === 'active' ? 'production-ready' : 
                     cachedReadiness.status === 'ready_for_activation' ? 'operational' : 'getting-started',
      last_updated: cachedReadiness.calculated_at,
      todoItems: generateTodoItems(cachedReadiness),
      featureAvailability: {
        timeTracking: { 
          available: cachedReadiness.features.time_tracking, 
          requirement: cachedReadiness.features.time_tracking ? 'Available' : 'Project must be active' 
        },
        assignments: { 
          available: true, 
          requirement: 'Always available - assignments can be created at any time' 
        },
        locationTracking: { 
          available: cachedReadiness.features.talent_tracking, 
          requirement: cachedReadiness.features.talent_tracking ? 'Available' : 'Set up project locations' 
        },
        supervisorCheckout: { 
          available: cachedReadiness.features.time_tracking, 
          requirement: cachedReadiness.features.time_tracking ? 'Available' : 'Project must be active' 
        },
        talentManagement: { 
          available: cachedReadiness.features.talent_tracking, 
          requirement: cachedReadiness.features.talent_tracking ? 'Available' : 'Set up project locations' 
        },
        projectOperations: { 
          available: cachedReadiness.status === 'active', 
          requirement: cachedReadiness.status === 'active' ? 'Available' : 'Complete all setup to advance to active phase' 
        },
        notifications: { 
          available: cachedReadiness.features.team_management, 
          requirement: cachedReadiness.features.team_management ? 'Available' : 'Set up team assignments' 
        }
      },
      assignmentProgress: {
        totalAssignments: 0,
        completedAssignments: 0,
        urgentIssues: cachedReadiness.blocking_issues.length,
        upcomingDeadlines: [],
        assignmentRate: cachedReadiness.blocking_issues.length === 0 ? 100 : 0,
        totalEntities: 0,
        projectDays: 0
      }
    }

    return dashboardReadiness
  }

  const generateTodoItems = (readiness: typeof cachedReadiness): TodoItem[] => {
    if (!readiness) return []

    const items: TodoItem[] = []

    // Generate todo items based on blocking issues
    readiness.blocking_issues.forEach((issue) => {
      switch (issue) {
        case 'missing_role_templates':
          items.push({
            id: 'setup-roles',
            area: 'roles',
            priority: 'critical',
            title: 'Set up role templates',
            description: 'Define roles and pay rates for your project team',
            actionText: 'Go to Roles & Team',
            actionRoute: '/roles-team'
          })
          break
        case 'missing_team_assignments':
          items.push({
            id: 'assign-team',
            area: 'team',
            priority: 'critical',
            title: 'Assign team members',
            description: 'Assign staff to roles for this project',
            actionText: 'Go to Roles & Team',
            actionRoute: '/roles-team'
          })
          break
        case 'missing_locations':
          items.push({
            id: 'setup-locations',
            area: 'locations',
            priority: 'critical',
            title: 'Set up talent locations',
            description: 'Define locations where talent will be tracked',
            actionText: 'Go to Info Tab',
            actionRoute: '/info'
          })
          break
      }
    })

    // Note: Project activation concept has been replaced with phase-based lifecycle management
    // Projects now automatically transition between phases based on completion criteria

    return items
  }

  const handleNavigateToTab = (route: string) => {
    // Convert route to tab navigation
    const currentPath = window.location.pathname
    const basePath = currentPath.split('?')[0] // Remove query params
    
    // Update URL with tab parameter
    const url = new URL(window.location.href)
    
    switch (route) {
      case '/info':
        url.searchParams.set('tab', 'info')
        break
      case '/roles-team':
        url.searchParams.set('tab', 'roles-team')
        break
      case '/talent-roster':
        url.searchParams.set('tab', 'talent-roster')
        break
      case '/assignments':
        url.searchParams.set('tab', 'assignments')
        break
      default:
        url.searchParams.set('tab', 'info')
    }
    
    // Use router to navigate with the tab parameter
    router.push(url.pathname + url.search)
  }

  const getPriorityIcon = (priority: TodoItem['priority']) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'important':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'optional':
        return <Lightbulb className="h-4 w-4 text-blue-500" />
    }
  }

  const getPriorityColor = (priority: TodoItem['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-l-destructive bg-destructive/5'
      case 'important':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      case 'optional':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
    }
  }

  const getOverallStatusInfo = (status: string) => {
    switch (status) {
      case 'getting-started':
        return {
          label: 'Getting Started',
          description: 'Basic setup in progress',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          icon: <Clock className="h-4 w-4" />
        }
      case 'operational':
        return {
          label: 'Operational',
          description: 'Ready for limited operations',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
          icon: <Activity className="h-4 w-4" />
        }
      case 'production-ready':
        return {
          label: 'Production Ready',
          description: 'Fully configured and ready',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
          icon: <CheckCircle className="h-4 w-4" />
        }
      default:
        return {
          label: 'Unknown',
          description: 'Status unknown',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          icon: <AlertCircle className="h-4 w-4" />
        }
    }
  }

  const getCompletedItems = () => {
    if (!readiness) return []
    
    const completed = []
    
    if (readiness.locations_finalized) {
      completed.push({
        title: 'Location setup finalized',
        description: `${readiness.custom_location_count} custom locations configured`,
        icon: <MapPin className="h-4 w-4" />
      })
    }
    
    if (readiness.roles_finalized) {
      completed.push({
        title: 'Role templates finalized',
        description: `${readiness.custom_role_count} custom roles configured`,
        icon: <Users className="h-4 w-4" />
      })
    }
    
    if (readiness.team_finalized) {
      completed.push({
        title: 'Team assignments finalized',
        description: `${readiness.total_staff_assigned} staff members assigned`,
        icon: <Users className="h-4 w-4" />
      })
    }
    
    if (readiness.talent_finalized) {
      completed.push({
        title: 'Talent roster finalized',
        description: `${readiness.total_talent} talent assigned`,
        icon: <Users className="h-4 w-4" />
      })
    }
    
    // Add feature availability as completed items
    if (readiness.featureAvailability.timeTracking.available) {
      completed.push({
        title: 'Time tracking available',
        description: 'Staff can check in and track time',
        icon: <Clock className="h-4 w-4" />
      })
    }
    
    // Assignment system is always available
    completed.push({
      title: 'Assignment system available',
      description: 'Talent and escort assignments can be created at any time',
      icon: <Calendar className="h-4 w-4" />
    })
    
    return completed
  }

  const readiness = getDashboardReadiness()

  // Always prioritize phase-specific dashboard when available
  if (!phaseLoading && currentPhase && !showLegacyDashboard) {
    return (
      <div className="space-y-4">
        <PhaseSpecificDashboard
          projectId={project.id}
          project={project}
          onNavigate={(route) => handleNavigateToTab(route)}
        />
        
        {/* Toggle to show legacy dashboard for debugging/comparison */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLegacyDashboard(true)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Show Legacy Dashboard (Debug)
          </Button>
        </div>
      </div>
    )
  }

  // If phase system is not available, show legacy dashboard but without activation prompts
  if (phaseLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || phaseLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load project readiness data</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!readiness) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No readiness data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusInfo = getOverallStatusInfo(readiness.overall_status)
  const completedItems = getCompletedItems()
  const criticalItems = readiness.todoItems.filter(item => item.priority === 'critical')
  const importantItems = readiness.todoItems.filter(item => item.priority === 'important')
  const optionalItems = readiness.todoItems.filter(item => item.priority === 'optional')

  return (
    <div className="space-y-4">
      {/* Legacy Dashboard Header */}
      {showLegacyDashboard && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">
                Legacy Dashboard - Project activation has been replaced with phase-based lifecycle management
              </p>
            </div>
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLegacyDashboard(false)}
                className="text-xs"
              >
                Switch to Phase Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Status Section */}
      <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Project Status
                  {isStatusOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CardTitle>
                <Badge className={`gap-2 ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <p className="text-muted-foreground">{statusInfo.description}</p>
                
                {/* Assignment Progress Summary */}
                {readiness.assignmentProgress && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {readiness.assignmentProgress.assignmentRate}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Assignments Complete
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">
                        {readiness.assignmentProgress.urgentIssues}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Urgent Issues
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {readiness.total_staff_assigned}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Staff Assigned
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* To-Do List Section */}
      <Collapsible open={isTodoOpen} onOpenChange={setIsTodoOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  To-Do List
                  {isTodoOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CardTitle>
                {readiness.todoItems.length > 0 && (
                  <Badge variant="secondary">
                    {readiness.todoItems.length} items
                  </Badge>
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {readiness.todoItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All setup tasks completed!</p>
                  <p className="text-sm mt-2">
                    Project lifecycle is now managed through phase transitions.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Critical Items */}
                  {criticalItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Critical ({criticalItems.length})
                      </h4>
                      {criticalItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-4 border-l-4 rounded-r-lg ${getPriorityColor(item.priority)}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getPriorityIcon(item.priority)}
                                <h5 className="font-medium">{item.title}</h5>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {item.description}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => handleNavigateToTab(item.actionRoute)}
                                className="gap-2"
                              >
                                {item.actionText}
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Important Items */}
                  {importantItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Important ({importantItems.length})
                      </h4>
                      {importantItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-4 border-l-4 rounded-r-lg ${getPriorityColor(item.priority)}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getPriorityIcon(item.priority)}
                                <h5 className="font-medium">{item.title}</h5>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {item.description}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleNavigateToTab(item.actionRoute)}
                                className="gap-2"
                              >
                                {item.actionText}
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optional Items */}
                  {optionalItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Optional ({optionalItems.length})
                      </h4>
                      {optionalItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-4 border-l-4 rounded-r-lg ${getPriorityColor(item.priority)}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getPriorityIcon(item.priority)}
                                <h5 className="font-medium">{item.title}</h5>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {item.description}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleNavigateToTab(item.actionRoute)}
                                className="gap-2"
                              >
                                {item.actionText}
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Completed Setup Section */}
      {completedItems.length > 0 && (
        <Collapsible open={isCompletedOpen} onOpenChange={setIsCompletedOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Completed Setup
                    {isCompletedOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CardTitle>
                  <Badge variant="secondary" className="gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {completedItems.length} completed
                  </Badge>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {completedItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="text-green-600 dark:text-green-400">
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-green-800 dark:text-green-200">
                          {item.title}
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-400">
                          {item.description}
                        </div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  )
}