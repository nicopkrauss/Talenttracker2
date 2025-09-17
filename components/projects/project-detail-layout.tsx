"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { ProjectHeader } from './project-header'
import { ProjectOverviewCard } from './project-overview-card'
import { ConfigurationModeComponents, OperationsModeComponents, preloadModeComponents } from './mode-specific-components'
import { EnhancedProject, ProjectStatistics } from '@/lib/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuth } from '@/lib/auth-context'
import { hasAdminAccess } from '@/lib/role-utils'
import { useProjectPhaseMode } from '@/hooks/use-project-phase-mode'
import { ReadinessProvider, ProjectReadiness } from '@/lib/contexts/readiness-context'
import { ProjectPhase } from '@/lib/types/project-phase'
import { PhaseFeatureAvailabilityGuard } from './phase-feature-availability-guard'
import { ProjectPhaseProvider } from '@/lib/contexts/project-phase-context'

interface ProjectDetailLayoutProps {
  projectId: string
}

export function ProjectDetailLayout({ projectId }: ProjectDetailLayoutProps) {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [project, setProject] = useState<EnhancedProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Phase-aware mode management with persistence
  const { currentMode, setMode, isConfiguration, isOperations, currentPhase, phaseLoading } = useProjectPhaseMode({
    projectId,
    defaultMode: 'configuration'
  })

  // Components are now directly imported, no preloading needed

  // Check if user can edit project settings
  const canEditProject = userProfile?.role ? hasAdminAccess(userProfile.role) : false

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

  // Extract readiness data from project for ReadinessProvider (backward compatibility)
  const getInitialReadiness = (project: EnhancedProject): ProjectReadiness | undefined => {
    // For backward compatibility, we'll still provide readiness context
    // but it will be gradually replaced by phase-aware components
    return undefined // Phase system handles feature availability now
  }

  const handleEdit = () => {
    router.push(`/projects/${projectId}/edit`)
  }

  const handleBack = () => {
    router.push('/projects')
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
    <ProjectPhaseProvider projectId={projectId}>
      <ReadinessProvider 
        projectId={projectId}
        initialReadiness={getInitialReadiness(project)}
      >
        <div className="min-h-screen bg-background">
        {/* Sticky Header - positioned at top of content area */}
        <ProjectHeader 
          project={project}
          onBack={handleBack}
          currentMode={currentMode}
          onModeChange={setMode}
        />
        
        {/* Main Content - with top padding to account for sticky header */}
        <div className="container mx-auto px-4 pt-[100px] pb-6 space-y-6">
          {/* Project Overview Card - Always Visible */}
          <ProjectOverviewCard 
            project={project}
            onEdit={handleEdit}
            canEdit={canEditProject}
          />
          
          {/* Mode-Based Content - Tab Headers Always Visible */}
          {isConfiguration ? (
            <div 
              id="configuration-panel"
              role="tabpanel"
              aria-labelledby="configuration-tab"
            >
              <ConfigurationModeComponents.Tabs 
                project={project}
                onProjectUpdate={fetchProject}
              />
            </div>
          ) : isOperations ? (
            <div 
              id="operations-panel"
              role="tabpanel"
              aria-labelledby="operations-tab"
            >
              <OperationsModeComponents.Dashboard 
                project={project}
                onProjectUpdate={fetchProject}
              />
            </div>
          ) : null}
        </div>
      </div>
    </ReadinessProvider>
    </ProjectPhaseProvider>
  )
}