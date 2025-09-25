"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, 
  Filter, 
  FolderOpen, 
  AlertTriangle,
  Loader2,
  FileText,
  Clock,
  Calendar
} from "lucide-react"
import { TimecardProjectCard } from "./timecard-project-card"
import { Project, UserRole } from "@/lib/types"
import { hasAdminAccess } from "@/lib/role-utils"
import { useAuth } from "@/lib/auth-context"

interface ProjectTimecardStats {
  projectId: string
  projectName: string
  projectDescription?: string
  productionCompany?: string
  startDate?: string
  endDate?: string
  location?: string
  totalTimecards: number
  statusBreakdown: {
    draft: number
    submitted: number
    approved: number
    rejected: number
  }
  totalHours: number
  totalApprovedPay: number
  totalPotentialPay: number
  lastActivity: string | null
  pendingApprovals?: number // Admin only
  overdueSubmissions?: number // Admin only
}

interface ProjectWithTimecardStats extends Project {
  timecardStats: ProjectTimecardStats
}

interface TimecardProjectHubProps {
  userRole: UserRole
  onSelectProject: (projectId: string) => void
}

interface ProjectStatsResponse {
  data: ProjectTimecardStats[]
  count: number
  userRole: string
}

type FilterType = "all" | "draft" | "submitted" | "rejected" | "recent"

export function TimecardProjectHub({
  userRole,
  onSelectProject
}: TimecardProjectHubProps) {
  const [projectStats, setProjectStats] = useState<ProjectTimecardStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")

  const { isAuthenticated, user } = useAuth()
  const isAdmin = hasAdminAccess(userRole === 'admin' || userRole === 'in_house' ? userRole : null)

  // Fetch project timecard statistics from API
  const fetchProjectStats = async () => {
    // Don't fetch if user is not authenticated
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/timecards/projects/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch project statistics')
      }

      const data: ProjectStatsResponse = await response.json()
      setProjectStats(data.data || [])
    } catch (err) {
      console.error('Error fetching project statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load project statistics')
    } finally {
      setLoading(false)
    }
  }

  // Load project statistics on component mount and when authentication state changes
  useEffect(() => {
    fetchProjectStats()
  }, [isAuthenticated, user])

  // Filter projects based on search and filter type
  const filteredProjects = projectStats.filter(project => {
    // Search filter
    const matchesSearch = project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.productionCompany?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    // Type filter
    switch (filterType) {
      case "all":
        return true
      case "draft":
        return project.statusBreakdown.draft > 0
      case "submitted":
        return project.statusBreakdown.submitted > 0
      case "rejected":
        return project.statusBreakdown.rejected > 0
      case "recent":
        // Recent activity in last 30 days
        if (!project.lastActivity) return false
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return new Date(project.lastActivity) > thirtyDaysAgo
      default:
        return true
    }
  })

  // Calculate filter counts
  const filterCounts = {
    all: projectStats.length,
    draft: projectStats.filter(p => p.statusBreakdown.draft > 0).length,
    submitted: projectStats.filter(p => p.statusBreakdown.submitted > 0).length,
    rejected: projectStats.filter(p => p.statusBreakdown.rejected > 0).length,
    recent: projectStats.filter(p => {
      if (!p.lastActivity) return false
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return new Date(p.lastActivity) > thirtyDaysAgo
    }).length
  }



  const handleSelectProject = (projectId: string) => {
    onSelectProject(projectId)
  }

  // Convert ProjectTimecardStats to Project for TimecardProjectCard
  const convertToProjectWithStats = (stats: ProjectTimecardStats): { project: Project; timecardStats: ProjectTimecardStats } => {
    // Create a minimal Project object from the stats
    const project: Project = {
      id: stats.projectId,
      name: stats.projectName,
      description: stats.projectDescription || null,
      production_company: stats.productionCompany || null,
      status: 'active', // Assume active since they have timecards
      start_date: stats.startDate || '',
      end_date: stats.endDate || '',
      location: stats.location || '',
      created_at: '',
      updated_at: '',
      created_by: ''
    }

    return { project, timecardStats: stats }
  }

  // Don't render if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-muted-foreground">Please sign in to view timecard projects.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading timecard projects...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      {/* Search and Filters */}
      {projectStats.length > 0 && (
        <div>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" 
                      aria-hidden="true"
                    />
                    <Input
                      placeholder="Search projects by name, description, or production company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 min-h-[44px]" // Ensure minimum touch target size
                      aria-label="Search projects"
                      role="searchbox"
                    />
                  </div>
                </div>
                
                {/* Mobile-optimized filter buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                    className="min-h-[44px] px-3 py-2 text-sm" // Ensure touch target size
                    aria-pressed={filterType === "all"}
                    aria-label={`Show all projects (${filterCounts.all} projects)`}
                  >
                    <span className="sr-only">Show </span>All ({filterCounts.all})
                  </Button>
                  <Button
                    variant={filterType === "draft" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("draft")}
                    className="min-h-[44px] px-3 py-2 text-sm"
                    aria-pressed={filterType === "draft"}
                    aria-label={`Show projects with draft timecards (${filterCounts.draft} projects)`}
                  >
                    <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                    <span className="sr-only">Projects with </span>Draft ({filterCounts.draft})
                  </Button>
                  <Button
                    variant={filterType === "submitted" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("submitted")}
                    className="min-h-[44px] px-3 py-2 text-sm"
                    aria-pressed={filterType === "submitted"}
                    aria-label={`Show projects with submitted timecards (${filterCounts.submitted} projects)`}
                  >
                    <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                    <span className="sr-only">Projects with </span>Submitted ({filterCounts.submitted})
                  </Button>
                  <Button
                    variant={filterType === "rejected" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("rejected")}
                    className="min-h-[44px] px-3 py-2 text-sm"
                    aria-pressed={filterType === "rejected"}
                    aria-label={`Show projects with rejected timecards (${filterCounts.rejected} projects)`}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                    <span className="sr-only">Projects with </span>Rejected ({filterCounts.rejected})
                  </Button>
                  <Button
                    variant={filterType === "recent" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("recent")}
                    className="min-h-[44px] px-3 py-2 text-sm"
                    aria-pressed={filterType === "recent"}
                    aria-label={`Show projects with recent activity (${filterCounts.recent} projects)`}
                  >
                    <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />
                    <span className="sr-only">Projects with </span>Recent ({filterCounts.recent})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {projectStats.length === 0 && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-6 sm:p-12 text-center">
              <FolderOpen 
                className="h-12 w-12 text-muted-foreground mx-auto mb-4" 
                aria-hidden="true"
              />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No timecard projects found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm sm:text-base">
                {isAdmin 
                  ? "There are no projects with timecards to review. Projects will appear here once team members start submitting timecards."
                  : "You don't have any timecards yet. Projects will appear here once you start creating timecards for your assigned projects."
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Results State */}
      {projectStats.length > 0 && filteredProjects.length === 0 && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <Search 
                className="h-8 w-8 text-muted-foreground mx-auto mb-4" 
                aria-hidden="true"
              />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No projects found
              </h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setFilterType("all")
                }}
                className="min-h-[44px] px-4 py-2"
                aria-label="Clear all search filters and show all projects"
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
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            role="grid"
            aria-label={`${filteredProjects.length} project${filteredProjects.length === 1 ? '' : 's'} found`}
          >
            {filteredProjects.map((projectStat) => {
              const { project, timecardStats } = convertToProjectWithStats(projectStat)
              return (
                <div key={project.id} role="gridcell">
                  <TimecardProjectCard
                    project={project}
                    timecardStats={timecardStats}
                    userRole={userRole}
                    onSelectProject={handleSelectProject}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}