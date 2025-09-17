"use client"

import React, { useState } from 'react'
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
import { useCachedFeatureAvailability } from '@/hooks/use-cached-feature-availability'

interface InfoTabDashboardProps {
  project: EnhancedProject
  onNavigate?: (route: string) => void
}

interface TodoItem {
  id: string
  area: 'locations' | 'roles' | 'team' | 'talent' | 'assignments'
  priority: 'critical' | 'important' | 'optional'
  title: string
  description: string
  actionText: string
  actionRoute: string
}

export function InfoTabDashboardOptimized({ project, onNavigate }: InfoTabDashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { readiness, isLoading, error } = useReadiness()
  const featureAvailability = useCachedFeatureAvailability()
  
  const [isStatusOpen, setIsStatusOpen] = useState(true)
  const [isTodoOpen, setIsTodoOpen] = useState(true)
  const [isCompletedOpen, setIsCompletedOpen] = useState(false)

  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route)
    } else {
      router.push(route)
    }
  }

  const generateTodoItems = (): TodoItem[] => {
    if (!readiness) return []

    const todos: TodoItem[] = []

    // Generate todos based on blocking issues
    readiness.blocking_issues.forEach(issue => {
      switch (issue) {
        case 'missing_role_templates':
          todos.push({
            id: 'setup-roles',
            area: 'roles',
            priority: 'critical',
            title: 'Set up role templates',
            description: 'Define roles and pay rates for your project team',
            actionText: 'Configure Roles',
            actionRoute: '/roles-team'
          })
          break
        case 'missing_team_assignments':
          todos.push({
            id: 'assign-team',
            area: 'team',
            priority: 'critical',
            title: 'Assign team members',
            description: 'Assign staff members to project roles',
            actionText: 'Assign Team',
            actionRoute: '/roles-team'
          })
          break
        case 'missing_locations':
          todos.push({
            id: 'setup-locations',
            area: 'locations',
            priority: 'critical',
            title: 'Set up project locations',
            description: 'Configure locations for talent tracking',
            actionText: 'Setup Locations',
            actionRoute: '/info'
          })
          break
      }
    })

    // Note: Project activation concept has been replaced with phase-based lifecycle management
    // Projects now automatically transition between phases based on completion criteria

    return todos
  }

  const getOverallStatusInfo = () => {
    if (!readiness) {
      return {
        title: 'Loading...',
        description: 'Checking project status...',
        color: 'bg-gray-500',
        icon: Activity
      }
    }

    switch (readiness.status) {
      case 'setup_required':
        return {
          title: 'Getting Started',
          description: 'Complete the setup checklist to make your project operational',
          color: 'bg-orange-500',
          icon: AlertTriangle
        }
      case 'ready_for_activation':
        return {
          title: 'Setup Complete',
          description: 'All setup is complete. Project will transition to next phase automatically.',
          color: 'bg-blue-500',
          icon: CheckCircle
        }
      case 'active':
        return {
          title: 'Active & Operational',
          description: 'Your project is fully operational and ready for production use',
          color: 'bg-green-500',
          icon: CheckCircle
        }
      default:
        return {
          title: 'Unknown Status',
          description: 'Unable to determine project status',
          color: 'bg-gray-500',
          icon: AlertCircle
        }
    }
  }

  const getCompletedItems = () => {
    if (!readiness) return []

    const completed = []

    // Check feature availability to determine what's completed
    if (featureAvailability.canManageTeam) {
      completed.push({
        title: 'Team management enabled',
        description: 'Role templates configured',
        icon: <Users className="h-4 w-4" />
      })
    }

    if (featureAvailability.canTrackTalent) {
      completed.push({
        title: 'Talent tracking enabled',
        description: 'Project locations configured',
        icon: <MapPin className="h-4 w-4" />
      })
    }

    if (featureAvailability.canSchedule) {
      completed.push({
        title: 'Scheduling enabled',
        description: 'Team assignments and talent roster ready',
        icon: <Calendar className="h-4 w-4" />
      })
    }

    if (featureAvailability.canTrackTime) {
      completed.push({
        title: 'Time tracking enabled',
        description: 'Project is active and operational',
        icon: <Clock className="h-4 w-4" />
      })
    }

    return completed
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-300 rounded-full animate-pulse" />
              <span className="text-muted-foreground">Loading project status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Loading Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Unable to load project readiness status. Please try refreshing the page.
            </p>
            <p className="text-sm text-red-600 mt-2">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusInfo = getOverallStatusInfo()
  const completedItems = getCompletedItems()
  const todoItems = generateTodoItems()
  const criticalItems = todoItems.filter(item => item.priority === 'critical')
  const importantItems = todoItems.filter(item => item.priority === 'important')
  const optionalItems = todoItems.filter(item => item.priority === 'optional')

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Project Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
                <div className="text-left">
                  <div className="font-medium">{statusInfo.title}</div>
                  <div className="text-sm text-muted-foreground">{statusInfo.description}</div>
                </div>
              </div>
              {isStatusOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Last updated: {readiness ? new Date(readiness.calculated_at).toLocaleString() : 'Unknown'}
                </div>
                
                {/* Feature Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Available Features</h4>
                    <div className="space-y-1">
                      {featureAvailability.canManageTeam && (
                        <Badge variant="secondary" className="text-xs">Team Management</Badge>
                      )}
                      {featureAvailability.canTrackTalent && (
                        <Badge variant="secondary" className="text-xs">Talent Tracking</Badge>
                      )}
                      {featureAvailability.canSchedule && (
                        <Badge variant="secondary" className="text-xs">Scheduling</Badge>
                      )}
                      {featureAvailability.canTrackTime && (
                        <Badge variant="secondary" className="text-xs">Time Tracking</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Blocking Issues</h4>
                    <div className="space-y-1">
                      {featureAvailability.blockingIssues.map((issue, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {issue.replace('missing_', '').replace('_', ' ')}
                        </Badge>
                      ))}
                      {featureAvailability.blockingIssues.length === 0 && (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Todo Items */}
      {todoItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Action Items ({todoItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Collapsible open={isTodoOpen} onOpenChange={setIsTodoOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <span className="font-medium">Setup Tasks</span>
                {isTodoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-4">
                  {/* Critical Items */}
                  {criticalItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-red-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Critical ({criticalItems.length})
                      </h4>
                      <div className="space-y-2">
                        {criticalItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                            <div>
                              <div className="font-medium text-sm">{item.title}</div>
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleNavigate(item.actionRoute)}
                              className="gap-2"
                            >
                              {item.actionText}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Important Items */}
                  {importantItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-orange-600 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Important ({importantItems.length})
                      </h4>
                      <div className="space-y-2">
                        {importantItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                            <div>
                              <div className="font-medium text-sm">{item.title}</div>
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNavigate(item.actionRoute)}
                              className="gap-2"
                            >
                              {item.actionText}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Items */}
                  {optionalItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-blue-600 mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Optional ({optionalItems.length})
                      </h4>
                      <div className="space-y-2">
                        {optionalItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div>
                              <div className="font-medium text-sm">{item.title}</div>
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleNavigate(item.actionRoute)}
                              className="gap-2"
                            >
                              {item.actionText}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Completed Setup ({completedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Collapsible open={isCompletedOpen} onOpenChange={setIsCompletedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <span className="font-medium">Completed Tasks</span>
                {isCompletedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-2">
                  {completedItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-green-200 rounded-lg bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}
    </div>
  )
}