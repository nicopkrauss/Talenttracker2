"use client"

import { useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ProjectTimecardBreadcrumb } from "@/components/timecards/project-timecard-breadcrumb"
import { ProjectTimecardTabs } from "@/components/timecards/project-timecard-tabs"
import { ProjectTimecardWrapper } from "@/components/timecards/project-timecard-wrapper"
import { useAuth } from "@/lib/auth-context"

interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
}

export default function ProjectTimecardsPage() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  // Handle navigation back to project selection
  const handleBackToProjects = useCallback(() => {
    router.push('/timecards')
  }, [router])

  return (
    <div className="min-h-screen">
      <ProjectTimecardWrapper 
        projectId={projectId}
        requireProjectAccess={true}
      >
        {(project: Project, isLoading: boolean, error: string | null) => (
          <>
            {/* Fixed Header Navigation */}
            <ProjectTimecardBreadcrumb 
              project={project}
              onBackToProjects={handleBackToProjects}
            />
            
            {/* Content with proper spacing for fixed header */}
            <div className="container mx-auto px-3 sm:px-4 pt-[80px] sm:pt-[100px] pb-6">
              {/* Project-Specific Timecard Tabs */}
              <ProjectTimecardTabs 
                projectId={projectId}
                project={project}
                userRole={userProfile?.role || 'admin'}
              />
            </div>
          </>
        )}
      </ProjectTimecardWrapper>
    </div>
  )
}