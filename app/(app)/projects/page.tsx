"use client"

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectHub } from '@/components/projects/project-hub'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { UserRole } from '@/lib/types'

export default function ProjectsPage() {
  const router = useRouter()

  // TODO: Get actual user role from auth context
  // For now, defaulting to admin for development
  const userRole: UserRole = 'admin'

  const handleCreateProject = () => {
    router.push('/projects/new')
  }

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleEditProject = (projectId: string) => {
    router.push(`/projects/${projectId}/edit`)
  }

  const handleActivateProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/activate`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to activate project')
      }
      
      // Refresh the page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Error activating project:', error)
      // TODO: Show error toast
    }
  }

  const handleArchiveProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to archive project')
      }
      
      // Refresh the page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Error archiving project:', error)
      // TODO: Show error toast
    }
  }

  const handleViewTimecard = (projectId: string) => {
    router.push(`/timecards?project=${projectId}`)
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProjectHub 
        userRole={userRole}
        onCreateProject={handleCreateProject}
        onViewProject={handleViewProject}
        onEditProject={handleEditProject}
        onActivateProject={handleActivateProject}
        onArchiveProject={handleArchiveProject}
        onViewTimecard={handleViewTimecard}
      />
    </Suspense>
  )
}