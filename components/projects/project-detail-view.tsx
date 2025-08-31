"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Calendar,
  MapPin,
  Building,
  User,
  Edit,
  Play,
  Archive,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Circle
} from 'lucide-react'
import { ProjectRolesChecklistItem } from './project-roles-checklist-item'
import { Project, ProjectSetupChecklist } from '@/lib/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuth } from '@/lib/auth-context'
import { hasAdminAccess } from '@/lib/role-utils'

interface ProjectDetailViewProps {
  projectId: string
}

interface ProjectWithChecklist extends Project {
  project_setup_checklist?: ProjectSetupChecklist
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [project, setProject] = useState<ProjectWithChecklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [checklistLoading, setChecklistLoading] = useState(false)

  // Check if user can edit project settings
  const canEditProject = userProfile ? hasAdminAccess(userProfile.role) : false

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        }
        throw new Error('Failed to load project')
      }

      const result = await response.json()
      setProject(result.data)
    } catch (err: any) {
      console.error('Error fetching project:', err)
      setError(err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/projects/${projectId}/edit`)
  }

  const handleActivate = async () => {
    try {
      setActionLoading('activate')

      const response = await fetch(`/api/projects/${projectId}/activate`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to activate project')
      }

      // Refresh project data
      await fetchProject()
    } catch (err: any) {
      console.error('Error activating project:', err)
      setError(err.message || 'Failed to activate project')
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async () => {
    try {
      setActionLoading('archive')

      const response = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to archive project')
      }

      // Redirect to projects list after archiving
      router.push('/projects')
    } catch (err: any) {
      console.error('Error archiving project:', err)
      setError(err.message || 'Failed to archive project')
    } finally {
      setActionLoading(null)
    }
  }

  const handleChecklistUpdate = async (field: keyof Omit<ProjectSetupChecklist, 'project_id' | 'completed_at' | 'created_at' | 'updated_at'>, value: boolean) => {
    if (!project?.project_setup_checklist) return

    try {
      setChecklistLoading(true)

      const updatedChecklist = {
        ...project.project_setup_checklist,
        [field]: value
      }

      const response = await fetch(`/api/projects/${projectId}/checklist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedChecklist)
      })

      if (!response.ok) {
        throw new Error('Failed to update checklist')
      }

      // Refresh project data to get updated checklist
      await fetchProject()
    } catch (err: any) {
      console.error('Error updating checklist:', err)
      setError(err.message || 'Failed to update checklist')
    } finally {
      setChecklistLoading(false)
    }
  }

  const calculateSetupProgress = () => {
    if (!project?.project_setup_checklist) return 0

    const checklist = project.project_setup_checklist
    const completedItems = [
      checklist.roles_and_pay_completed,
      checklist.talent_roster_completed,
      checklist.team_assignments_completed,
      checklist.locations_completed
    ].filter(Boolean).length

    return (completedItems / 4) * 100
  }

  const isSetupComplete = () => {
    if (!project?.project_setup_checklist) return false

    const checklist = project.project_setup_checklist
    return checklist.roles_and_pay_completed &&
      checklist.talent_roster_completed &&
      checklist.team_assignments_completed &&
      checklist.locations_completed
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'prep':
        return 'secondary'
      case 'archived':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!project) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Project not found</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                <Badge variant={getStatusBadgeVariant(project.status)}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
            {canEditProject && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {project.status === 'prep' && (
                  <Button
                    onClick={handleActivate}
                    disabled={actionLoading === 'activate' || !isSetupComplete()}
                  >
                    {actionLoading === 'activate' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Activate Project
                  </Button>
                )}
                {project.status === 'active' && (
                  <Button
                    variant="outline"
                    onClick={handleArchive}
                    disabled={actionLoading === 'archive'}
                  >
                    {actionLoading === 'archive' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4 mr-2" />
                    )}
                    Archive
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Dates */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Project Timeline</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Start:</span>
                  <span>{formatDate(project.start_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">End:</span>
                  <span>{formatDate(project.end_date)}</span>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Project Details</h3>
              <div className="space-y-2">
                {project.production_company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Production:</span>
                    <span>{project.production_company}</span>
                  </div>
                )}
                {project.hiring_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Contact:</span>
                    <span>{project.hiring_contact}</span>
                  </div>
                )}
                {project.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span>{project.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Checklist (for prep projects) */}
      {project.status === 'prep' && project.project_setup_checklist && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Project Setup Checklist</CardTitle>
              <Badge variant={isSetupComplete() ? "default" : "secondary"}>
                {Math.round(calculateSetupProgress())}% Complete
              </Badge>
            </div>
            <Progress value={calculateSetupProgress()} className="mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ProjectRolesChecklistItem
                projectId={projectId}
                isCompleted={project.project_setup_checklist.roles_and_pay_completed}
                onCompletionChange={(completed) => {
                  // Update the local state immediately for better UX
                  setProject(prev => prev ? {
                    ...prev,
                    project_setup_checklist: prev.project_setup_checklist ? {
                      ...prev.project_setup_checklist,
                      roles_and_pay_completed: completed
                    } : undefined
                  } : null)
                  // Also refresh the full project data
                  fetchProject()
                }}
                disabled={checklistLoading || !canEditProject}
              />

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="talent-roster"
                  checked={project.project_setup_checklist.talent_roster_completed}
                  onCheckedChange={(checked) =>
                    handleChecklistUpdate('talent_roster_completed', checked as boolean)
                  }
                  disabled={checklistLoading || !canEditProject}
                />
                <div className="flex-1">
                  <label
                    htmlFor="talent-roster"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Finalize Talent Roster
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Import and confirm all talent participating in the project
                  </p>
                </div>
                {project.project_setup_checklist.talent_roster_completed && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="team-assignments"
                  checked={project.project_setup_checklist.team_assignments_completed}
                  onCheckedChange={(checked) =>
                    handleChecklistUpdate('team_assignments_completed', checked as boolean)
                  }
                  disabled={checklistLoading || !canEditProject}
                />
                <div className="flex-1">
                  <label
                    htmlFor="team-assignments"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Finalize Team Assignments
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assign team members to their roles and responsibilities
                  </p>
                </div>
                {project.project_setup_checklist.team_assignments_completed && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="locations"
                  checked={project.project_setup_checklist.locations_completed}
                  onCheckedChange={(checked) =>
                    handleChecklistUpdate('locations_completed', checked as boolean)
                  }
                  disabled={checklistLoading || !canEditProject}
                />
                <div className="flex-1">
                  <label
                    htmlFor="locations"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Define Talent Locations
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set up location tracking areas for talent management
                  </p>
                </div>
                {project.project_setup_checklist.locations_completed && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>

            {checklistLoading && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating checklist...
              </div>
            )}

            {!canEditProject && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Only administrators and in-house users can modify the project setup checklist.
                </p>
              </div>
            )}

            <div className="mt-6 p-4 bg-muted rounded-lg">
              {isSetupComplete() ? (
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Setup Complete!</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      All checklist items are complete. You can now activate the project.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Circle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Setup In Progress</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Complete all checklist items to activate the project.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Progress (for active projects) */}
      {project.status === 'active' && project.project_setup_checklist && (
        <Card>
          <CardHeader>
            <CardTitle>Project Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-medium">Setup Complete</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Project was activated on {project.project_setup_checklist.completed_at ?
                    new Date(project.project_setup_checklist.completed_at).toLocaleDateString() :
                    'Unknown date'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}