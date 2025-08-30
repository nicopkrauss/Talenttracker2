"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  MapPin, 
  Building, 
  User, 
  Edit, 
  Play, 
  Archive,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { Project } from '@/lib/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProjectDetailViewProps {
  projectId: string
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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
      
      const data = await response.json()
      setProject(data)
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
                <p className="text-gray-600">{project.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {project.status === 'prep' && (
                <Button 
                  onClick={handleActivate}
                  disabled={actionLoading === 'activate'}
                >
                  {actionLoading === 'activate' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Activate
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Dates */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Project Timeline</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Start:</span>
                  <span>{formatDate(project.start_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">End:</span>
                  <span>{formatDate(project.end_date)}</span>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Project Details</h3>
              <div className="space-y-2">
                {project.production_company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Production:</span>
                    <span>{project.production_company}</span>
                  </div>
                )}
                {project.hiring_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Contact:</span>
                    <span>{project.hiring_contact}</span>
                  </div>
                )}
                {project.project_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Location:</span>
                    <span>{project.project_location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Checklist (for prep projects) */}
      {project.status === 'prep' && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100"></div>
                <span className="text-gray-600">Add Project Roles & Pay Rates</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100"></div>
                <span className="text-gray-600">Finalize Talent Roster</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100"></div>
                <span className="text-gray-600">Finalize Team Assignments</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100"></div>
                <span className="text-gray-600">Define Talent Locations</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Complete all checklist items to activate the project.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}