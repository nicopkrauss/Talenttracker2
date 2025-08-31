"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus, 
  Search, 
  Filter, 
  FolderOpen, 
  AlertTriangle,
  Loader2,
  RefreshCw
} from "lucide-react"
import { ProjectCard } from "./project-card"
import { Project, UserRole, ProjectStatus } from "@/lib/types"
import { hasAdminAccess } from "@/lib/role-utils"
import { useAuth } from "@/lib/auth-context"

interface ProjectHubProps {
  userRole: UserRole
  onCreateProject?: () => void
  onViewProject?: (projectId: string) => void
  onEditProject?: (projectId: string) => void
  onActivateProject?: (projectId: string) => void
  onArchiveProject?: (projectId: string) => void
  onViewTimecard?: (projectId: string) => void
}

interface ProjectsResponse {
  data: Project[]
  user_role: string
  total_count: number
}

export function ProjectHub({
  userRole,
  onCreateProject,
  onViewProject,
  onEditProject,
  onActivateProject,
  onArchiveProject,
  onViewTimecard
}: ProjectHubProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const [refreshing, setRefreshing] = useState(false)

  const { isAuthenticated, user } = useAuth()
  const isAdmin = hasAdminAccess(userRole === 'admin' || userRole === 'in_house' ? userRole : null)
  const canCreateProjects = isAdmin

  // Fetch projects from API
  const fetchProjects = async (showRefreshIndicator = false) => {
    // Don't fetch if user is not authenticated
    if (!isAuthenticated || !user) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      if (showRefreshIndicator) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch projects')
      }

      const data: ProjectsResponse = await response.json()
      setProjects(data.data || [])
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load projects on component mount and when authentication state changes
  useEffect(() => {
    fetchProjects()
  }, [isAuthenticated, user])

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.production_company?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Group projects by status
  const projectsByStatus = {
    prep: filteredProjects.filter(p => p.status === 'prep'),
    active: filteredProjects.filter(p => p.status === 'active'),
    archived: filteredProjects.filter(p => p.status === 'archived')
  }

  const handleRefresh = () => {
    fetchProjects(true)
  }

  const handleCreateProject = () => {
    if (canCreateProjects && onCreateProject) {
      onCreateProject()
    }
  }

  // Mock function to check if user has timecards for a project
  const hasTimecardsForProject = (projectId: string): boolean => {
    // In real implementation, this would check the user's timecards for this project
    return Math.random() > 0.7 // Mock: 30% chance of having timecards
  }

  // Determine if user can access project details
  const canAccessProjectDetails = (project: Project): boolean => {
    if (isAdmin) return true
    
    // For non-admin users, they can only access active projects they're assigned to
    // For now, we'll allow access to active projects since team assignments aren't implemented
    return project.status === 'active'
  }

  // Don't render if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          </div>
        </div>
        
        <div className="mt-6">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-muted-foreground">Please sign in to view projects.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          </div>
        </div>
        
        <div className="mt-6">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Loading projects...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          </div>
        </div>
        
        <div className="mt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
        
        <div className="text-center mt-6">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {canCreateProjects && (
            <Button onClick={handleCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {projects.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects by name, description, or production company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({projects.length})
                  </Button>
                  <Button
                    variant={statusFilter === "prep" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("prep")}
                  >
                    Prep ({projectsByStatus.prep.length})
                  </Button>
                  <Button
                    variant={statusFilter === "active" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("active")}
                  >
                    Active ({projectsByStatus.active.length})
                  </Button>
                  <Button
                    variant={statusFilter === "archived" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("archived")}
                  >
                    Archived ({projectsByStatus.archived.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No projects yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {canCreateProjects 
                  ? "Get started by creating your first project. Projects help you organize talent, teams, and timecards for your productions."
                  : "You don't have access to any projects yet. Contact your administrator to get assigned to projects."
                }
              </p>
              {canCreateProjects && (
                <Button onClick={handleCreateProject}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Results State */}
      {projects.length > 0 && filteredProjects.length === 0 && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No projects found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Projects Grid */}
      {filteredProjects.length > 0 && (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                userRole={userRole}
                canAccessDetails={canAccessProjectDetails(project)}
                hasTimecards={hasTimecardsForProject(project.id)}
                onViewProject={onViewProject}
                onEditProject={onEditProject}
                onActivateProject={onActivateProject}
                onArchiveProject={onArchiveProject}
                onViewTimecard={onViewTimecard}
              />
            ))}
          </div>
        </div>
      )}

    </>
  )
}