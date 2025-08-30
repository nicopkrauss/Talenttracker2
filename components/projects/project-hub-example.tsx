"use client"

import React from "react"
import { ProjectHub } from "./project-hub"
import { UserRole } from "@/lib/types"

interface ProjectHubExampleProps {
  userRole?: UserRole
}

export function ProjectHubExample({ userRole = 'admin' }: ProjectHubExampleProps) {
  const handleCreateProject = () => {
    console.log('Navigate to create project page')
    // In real implementation: router.push('/projects/new')
  }

  const handleViewProject = (projectId: string) => {
    console.log('Navigate to project details:', projectId)
    // In real implementation: router.push(`/projects/${projectId}`)
  }

  const handleEditProject = (projectId: string) => {
    console.log('Navigate to edit project:', projectId)
    // In real implementation: router.push(`/projects/${projectId}/edit`)
  }

  const handleActivateProject = async (projectId: string) => {
    console.log('Activate project:', projectId)
    // In real implementation: call API to activate project
    try {
      const response = await fetch(`/api/projects/${projectId}/activate`, {
        method: 'POST'
      })
      if (response.ok) {
        // Refresh project list or update state
        console.log('Project activated successfully')
      }
    } catch (error) {
      console.error('Failed to activate project:', error)
    }
  }

  const handleArchiveProject = async (projectId: string) => {
    console.log('Archive project:', projectId)
    // In real implementation: call API to archive project
    // Similar to activate but different endpoint
  }

  const handleViewTimecard = (projectId: string) => {
    console.log('Navigate to timecard view:', projectId)
    // In real implementation: router.push(`/timecards?project=${projectId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <ProjectHub
          userRole={userRole}
          onCreateProject={handleCreateProject}
          onViewProject={handleViewProject}
          onEditProject={handleEditProject}
          onActivateProject={handleActivateProject}
          onArchiveProject={handleArchiveProject}
          onViewTimecard={handleViewTimecard}
        />
      </div>
    </div>
  )
}