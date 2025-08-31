"use client"

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectHub } from '@/components/projects/project-hub'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuth } from '@/lib/auth-context'
import { UserRole } from '@/lib/types'

export default function ProjectsPage() {
  const router = useRouter()
  const { userProfile, isAuthenticated, loading } = useAuth()

  // Get user role from auth context, fallback to escort if not available
  const userRole: UserRole = userProfile?.role || 'escort'

  // Show loading spinner while auth is loading
  if (loading) {
    return <LoadingSpinner />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login')
    return <LoadingSpinner />
  }

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
    <div className="p-6 space-y-6">
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
    </div>
  )
}