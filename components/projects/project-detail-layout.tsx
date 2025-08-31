"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { ProjectHeader } from './project-header'
import { ProjectOverviewCard } from './project-overview-card'
import { ProjectTabs } from './project-tabs'
import { OperationsDashboard } from './operations-dashboard'
import { EnhancedProject, ProjectStatistics } from '@/lib/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuth } from '@/lib/auth-context'
import { hasAdminAccess } from '@/lib/role-utils'

interface ProjectDetailLayoutProps {
  projectId: string
}

export function ProjectDetailLayout({ projectId }: ProjectDetailLayoutProps) {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [project, setProject] = useState<EnhancedProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      
      // Calculate statistics
      const statistics: ProjectStatistics = {
        talentExpected: result.data.talent_expected || 0,
        talentAssigned: 0, // TODO: Calculate from talent_project_assignments
        staffNeeded: 0, // TODO: Calculate from project_roles
        staffAssigned: 0, // TODO: Calculate from team_assignments
        staffCheckedIn: 0, // TODO: Calculate from active shifts
        talentPresent: 0, // TODO: Calculate from talent status
        activeEscorts: 0, // TODO: Calculate from active escorts
        staffOvertime: {
          over8Hours: 0, // TODO: Calculate from shift durations
          over12Hours: 0
        }
      }
      
      const enhancedProject: EnhancedProject = {
        ...result.data,
        statistics
      }
      
      setProject(enhancedProject)
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
    }
  }

  const handleArchive = async () => {
    try {
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
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <ProjectHeader 
        project={project}
        onEdit={handleEdit}
        canEdit={canEditProject}
      />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Project Overview Card - Always Visible */}
        <ProjectOverviewCard 
          project={project}
          onActivate={handleActivate}
          onArchive={handleArchive}
          canEdit={canEditProject}
        />
        
        {/* Mode-Based Content */}
        {project.status === 'prep' ? (
          <ProjectTabs 
            project={project}
            onProjectUpdate={fetchProject}
          />
        ) : project.status === 'active' ? (
          <OperationsDashboard 
            project={project}
            onProjectUpdate={fetchProject}
          />
        ) : null}
      </div>
    </div>
  )
}