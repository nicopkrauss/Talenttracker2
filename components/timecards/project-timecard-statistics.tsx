"use client"

import { useState, useEffect } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, FileText, FileEdit, Clock, TrendingUp, Calendar, ChevronDown, ChevronRight } from "lucide-react"
import { getRoleColor, getRoleDisplayName } from "@/lib/role-utils"

interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
}

interface ProjectTimecardStatisticsProps {
  projectId: string
  project: Project
}

interface TimecardStats {
  totalTimecards: number
  approvedTimecards: number
  submittedTimecards: number
  draftTimecards: number
  rejectedTimecards: number
  approvedPay: number
  totalPay: number
  averageHours: number
  averageDailyHours: number
  totalHours: number
  payByRole: Array<{
    role: string
    totalPay: number
    timecardCount: number
  }>
}

/**
 * Project timecard statistics overview component that displays key metrics
 * above the tabs, similar to the project overview card
 */
export function ProjectTimecardStatistics({ projectId }: ProjectTimecardStatisticsProps) {
  const [stats, setStats] = useState<TimecardStats>({
    totalTimecards: 0,
    approvedTimecards: 0,
    submittedTimecards: 0,
    draftTimecards: 0,
    rejectedTimecards: 0,
    approvedPay: 0,
    totalPay: 0,
    averageHours: 0,
    averageDailyHours: 0,
    totalHours: 0,
    payByRole: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timecard-overview-collapsed')
      return saved === 'true'
    }
    return false
  })



  const fetchStatistics = async () => {
    try {
      setLoading(true)

      // Fetch all timecards for the project
      const response = await fetch(`/api/timecards?project_id=${projectId}`)
      const result = await response.json()

      if (!response.ok) {
        console.error("Error fetching timecard statistics:", result.error)
        setError(`Failed to load timecard statistics: ${result.error || 'Unknown error'}`)
        return
      }

      const timecards = result.timecards || []

      // Fetch team assignments to get role information
      const teamResponse = await fetch(`/api/projects/${projectId}/team-assignments`)
      const teamResult = await teamResponse.json()
      const teamAssignments = teamResponse.ok ? teamResult.assignments || [] : []

      // Calculate total hours and averages
      const totalHours = timecards.reduce((sum: number, tc: any) => sum + (tc.total_hours || 0), 0)
      const averageHours = timecards.length > 0 ? totalHours / timecards.length : 0

      // Calculate average daily hours per employee using daily entries data
      // Each timecard includes daily_entries array with individual day data
      const totalDailyEntries = timecards.reduce((sum: number, tc: any) => {
        return sum + (tc.working_days || tc.daily_entries?.length || 1)
      }, 0)

      const averageDailyHours = totalDailyEntries > 0 ? totalHours / totalDailyEntries : 0

      // Calculate pay by role
      const rolePayMap = new Map<string, { totalPay: number; timecardCount: number }>()

      timecards.forEach((tc: any) => {
        // Find the user's role from team assignments
        const assignment = teamAssignments.find((ta: any) => ta.user_id === tc.user_id)
        const role = assignment?.role || 'unassigned'

        if (!rolePayMap.has(role)) {
          rolePayMap.set(role, { totalPay: 0, timecardCount: 0 })
        }

        const roleData = rolePayMap.get(role)!
        roleData.totalPay += tc.total_pay || 0
        roleData.timecardCount += 1
      })

      const payByRole = Array.from(rolePayMap.entries()).map(([role, data]) => ({
        role,
        totalPay: data.totalPay,
        timecardCount: data.timecardCount
      })).sort((a, b) => b.totalPay - a.totalPay) // Sort by highest pay first

      // Calculate statistics
      const newStats: TimecardStats = {
        totalTimecards: timecards.length,
        approvedTimecards: timecards.filter((tc: any) => tc.status === 'approved').length,
        submittedTimecards: timecards.filter((tc: any) => tc.status === 'submitted').length,
        draftTimecards: timecards.filter((tc: any) => tc.status === 'draft').length,
        rejectedTimecards: timecards.filter((tc: any) => tc.status === 'rejected').length,
        approvedPay: timecards
          .filter((tc: any) => tc.status === 'approved')
          .reduce((sum: number, tc: any) => sum + (tc.total_pay || 0), 0),
        totalPay: timecards.reduce((sum: number, tc: any) => sum + (tc.total_pay || 0), 0),
        averageHours,
        averageDailyHours,
        totalHours,
        payByRole
      }

      setStats(newStats)
      setError(null)
    } catch (error) {
      console.error("Error processing timecard statistics:", error)
      setError(`Failed to process timecard statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [projectId])

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timecard-overview-collapsed', isCollapsed.toString())
    }
  }, [isCollapsed])

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed)
  }

  if (loading) {
    return (
      <Card className={isCollapsed ? "py-4" : "pt-4 pb-6"}>
        <CardHeader className={`cursor-pointer ${isCollapsed ? "pb-0 gap-0" : ""}`} onClick={toggleCollapsed}>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Timecard Overview
          </CardTitle>
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={isCollapsed ? "py-4" : "pt-4 pb-6"}>
        <CardHeader className={`cursor-pointer ${isCollapsed ? "pb-0 gap-0" : ""}`} onClick={toggleCollapsed}>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Timecard Overview
          </CardTitle>
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            <div className="text-center py-4">
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Card className={isCollapsed ? "py-4" : "pt-4 pb-6"}>
      <CardHeader className={`cursor-pointer ${isCollapsed ? "pb-0 gap-0" : ""}`} onClick={toggleCollapsed}>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Timecard Overview
        </CardTitle>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-0 md:space-y-6">
          {/* Mobile Layout - 2x3 Grid with Compact Design */}
          <div className="md:hidden space-y-4">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
              {/* Row 1 - Total (Full Width) */}
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Total Timecards</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalTimecards}</div>
              </div>
              
              {/* Row 2 - Status Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-muted-foreground">Approved</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.approvedTimecards}</div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-muted-foreground">Submitted</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.submittedTimecards}</div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileEdit className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-muted-foreground">Draft</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.draftTimecards}</div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-muted-foreground">Rejected</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.rejectedTimecards}</div>
                </div>
              </div>

              {/* Row 4 - Hours and Pay Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-muted-foreground">Avg Hours</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.averageHours.toFixed(1)}
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-muted-foreground">Daily Avg</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.averageDailyHours.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium text-muted-foreground">Total Hours</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.totalHours.toFixed(1)}
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-muted-foreground">Total Pay</span>
                  </div>
                  <div className="text-lg font-bold">
                    ${stats.totalPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Pay by Role Section */}
            {stats.payByRole.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Pay by Role</h3>
                <div className="grid grid-cols-2 gap-4">
                  {stats.payByRole.slice(0, 4).map((roleData, index) => {
                    // For odd number of roles, make the last one full width
                    const isLastOdd = stats.payByRole.length % 2 === 1 && index === stats.payByRole.length - 1
                    return (
                      <div
                        key={roleData.role}
                        className={`bg-card border rounded-lg p-4 ${isLastOdd ? 'col-span-2' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className={`text-sm ${getRoleColor(roleData.role)}`}>
                            {getRoleDisplayName(roleData.role as any)}
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold">
                          ${roleData.totalPay.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {roleData.timecardCount} {roleData.timecardCount === 1 ? 'timecard' : 'timecards'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {stats.payByRole.length > 4 && (
                  <div className="text-xs text-muted-foreground mt-3 text-center">
                    +{stats.payByRole.length - 4} more roles
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Layout - Statistics Grid */}
          <div className="hidden md:grid gap-6">
            {/* Timecard Counts */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Timecards</p>
                  <p className="text-2xl font-bold">{stats.totalTimecards}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{stats.approvedTimecards}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-bold">{stats.submittedTimecards}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-gray-950 rounded-lg">
                  <FileEdit className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Draft</p>
                  <p className="text-2xl font-bold">{stats.draftTimecards}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{stats.rejectedTimecards}</p>
                </div>
              </div>
            </div>

            {/* Pay and Hours Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pay</p>
                  <p className="text-2xl font-bold">
                    ${stats.totalPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Hours</p>
                  <p className="text-2xl font-bold">
                    {stats.averageHours.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                  <p className="text-2xl font-bold">
                    {stats.averageDailyHours.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">
                    {stats.totalHours.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            {/* Pay by Role Section */}
            {stats.payByRole.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">Pay by Role</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.payByRole.map((roleData) => (
                    <div key={roleData.role} className="bg-card border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className={`text-sm ${getRoleColor(roleData.role)}`}>
                          {getRoleDisplayName(roleData.role as any)}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">
                        ${roleData.totalPay.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {roleData.timecardCount} {roleData.timecardCount === 1 ? 'timecard' : 'timecards'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        </CardContent>
      )}
    </Card>
  )
}