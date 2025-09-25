"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { TimecardList } from "@/components/timecards/timecard-list"
import { hasAdminAccess } from "@/lib/role-utils"

interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
}

interface ProjectTimecardListProps {
  projectId: string
  project: Project
  userRole: string
  showUserColumn?: boolean
  enableBulkSubmit?: boolean
}

/**
 * Project-specific timecard list component that filters timecards by project
 * and provides project context to the underlying TimecardList component
 */
export function ProjectTimecardList({ 
  projectId, 
  project, 
  userRole, 
  showUserColumn = false,
  enableBulkSubmit = false 
}: ProjectTimecardListProps) {
  const [timecards, setTimecards] = useState<Timecard[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [fetchingTimecards, setFetchingTimecards] = useState(false)
  const [teamAssignments, setTeamAssignments] = useState<any[]>([])
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const isAdmin = hasAdminAccess(userRole as any)

  const fetchTimecards = async () => {
    if (fetchingTimecards) return // Prevent multiple simultaneous calls
    
    setFetchingTimecards(true)
    setError(null)
    
    try {
      // Build query parameters with project filtering
      const params = new URLSearchParams()
      params.append('project_id', projectId)
      if (statusFilter !== "all") {
        params.append('status', statusFilter)
      }
      
      const response = await fetch(`/api/timecards-v2?${params.toString()}`)
      const result = await response.json()
      
      if (!response.ok) {
        const errorMessage = `API error: ${result.error || 'Unknown API error'}`
        console.error("API error fetching timecards:", result)
        setError(errorMessage)
        setTimecards([])
        return
      }
      
      const data = result.data || []
      setTimecards(data)
      setHasData(data.length > 0)
      
      // Fetch team assignments to get project roles
      const teamResponse = await fetch(`/api/projects/${projectId}/team-assignments`)
      const teamResult = await teamResponse.json()
      const assignments = teamResponse.ok ? teamResult.assignments || [] : []
      setTeamAssignments(assignments)
      
      if (data.length === 0) {
        console.log("No timecards found for project - this may be expected if no data has been created yet")
      }
    } catch (error) {
      const errorMessage = `Failed to fetch timecards: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error("Error fetching timecards:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      })
      setError(errorMessage)
      setTimecards([])
    } finally {
      setLoading(false)
      setFetchingTimecards(false)
    }
  }

  // Function to refresh data (for use by child components)
  const refreshData = async () => {
    await fetchTimecards()
  }

  useEffect(() => {
    fetchTimecards()
  }, [projectId, statusFilter])

  // Show loading state while data is loading
  if (loading) {
    return (
      <div className="animate-pulse space-y-4" data-testid="loading-skeleton">
        <div className="h-10 bg-muted rounded"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Error Loading Timecards</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show empty state if no data
  if (!hasData && timecards.length === 0) {
    return (
      <div className="space-y-6">
        {!isAdmin && (
          <div className="flex justify-end">
            <Button onClick={() => (window.location.href = "/timecards/new")}>Submit Timecard</Button>
          </div>
        )}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">No Timecards Found</h3>
                <p className="text-muted-foreground mt-2">
                  {isAdmin 
                    ? `No timecards have been submitted for ${project.name} yet. Staff members can submit timecards once they start working on this project.`
                    : `You haven't submitted any timecards for ${project.name} yet. Click the button above to submit your first timecard.`
                  }
                </p>
              </div>
              {!isAdmin && (
                <Button onClick={() => (window.location.href = "/timecards/new")}>
                  Submit Your First Timecard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Showing {timecards.length} timecard{timecards.length !== 1 ? 's' : ''} for {project.name}
            </div>
          </div>
        </CardContent>
      </Card>

      <TimecardList 
        timecards={timecards} 
        onUpdate={refreshData} 
        showUserColumn={showUserColumn}
        enableBulkSubmit={enableBulkSubmit}
        projectStartDate={undefined} // TODO: Add project start date if needed
        projectId={projectId}
        teamAssignments={teamAssignments}
      />
    </div>
  )
}