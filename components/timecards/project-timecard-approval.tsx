"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, FileText, AlertCircle, ChevronLeft, ChevronRight, Check, Clock } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { MultiDayTimecardDisplay } from "@/components/timecards/multi-day-timecard-display"
import { getRoleColor, getRoleDisplayName } from "@/lib/role-utils"

interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
}

interface ProjectTimecardApprovalProps {
  projectId: string
  project: Project
  onRefreshData?: () => void
}

/**
 * Project-specific timecard approval component that shows submitted timecards
 * for a specific project and allows admin users to approve/reject them
 */
export function ProjectTimecardApproval({ 
  projectId, 
  project, 
  onRefreshData 
}: ProjectTimecardApprovalProps) {
  const [submittedTimecards, setSubmittedTimecards] = useState<Timecard[]>([])
  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0)
  const [loadingApproval, setLoadingApproval] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamAssignments, setTeamAssignments] = useState<any[]>([])
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchSubmittedTimecards = async () => {
    try {
      const response = await fetch(`/api/timecards-v2?status=submitted&project_id=${projectId}`)
      const result = await response.json()
      
      if (!response.ok) {
        console.error("Error fetching submitted timecards for approval:", result.error)
        setSubmittedTimecards([])
        return
      }
      
      const data = result.data || []
      setSubmittedTimecards(data)
      
      // Fetch team assignments to get project roles
      const teamResponse = await fetch(`/api/projects/${projectId}/team-assignments`)
      const teamResult = await teamResponse.json()
      const assignments = teamResponse.ok ? teamResult.assignments || [] : []
      setTeamAssignments(assignments)
      
      // Reset current index if it's out of bounds
      if (data.length > 0 && currentApprovalIndex >= data.length) {
        setCurrentApprovalIndex(0)
      }
    } catch (error) {
      console.error("Error fetching submitted timecards:", error)
      setSubmittedTimecards([])
      setError("Failed to load submitted timecards")
    } finally {
      setLoading(false)
    }
  }

  // Navigation functions for approval tab
  const goToPreviousTimecard = () => {
    if (currentApprovalIndex > 0) {
      setCurrentApprovalIndex(currentApprovalIndex - 1)
    }
  }

  const goToNextTimecard = () => {
    if (currentApprovalIndex < submittedTimecards.length - 1) {
      setCurrentApprovalIndex(currentApprovalIndex + 1)
    }
  }

  // Approve current timecard
  const approveCurrentTimecard = async () => {
    const currentTimecard = submittedTimecards[currentApprovalIndex]
    if (!currentTimecard) return

    setLoadingApproval(true)
    try {
      const response = await fetch('/api/timecards/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: currentTimecard.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve timecard')
      }

      // Refresh data and move to next timecard
      await fetchSubmittedTimecards()
      if (onRefreshData) {
        onRefreshData()
      }
      
      // If this was the last timecard, go to previous, otherwise stay at same index
      if (currentApprovalIndex >= submittedTimecards.length - 1 && submittedTimecards.length > 1) {
        setCurrentApprovalIndex(Math.max(0, currentApprovalIndex - 1))
      }
    } catch (error) {
      console.error('Error approving timecard:', error)
      setError(error instanceof Error ? error.message : 'Failed to approve timecard')
    } finally {
      setLoadingApproval(false)
    }
  }

  useEffect(() => {
    fetchSubmittedTimecards()
  }, [projectId])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Error Loading Timecards</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={fetchSubmittedTimecards} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (submittedTimecards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">No Timecards to Approve</h3>
            <p className="text-muted-foreground mt-2">
              All submitted timecards for {project.name} have been processed. New submissions will appear here for approval.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentTimecard = submittedTimecards[currentApprovalIndex]
  if (!currentTimecard) return null

  // Get the user's project role
  const userAssignment = teamAssignments.find(assignment => assignment.user_id === currentTimecard.user_id)
  const userProjectRole = userAssignment?.role || null

  return (
    <div className="space-y-4">
      {/* Approval Header */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg text-white font-medium">
                {Array.isArray(currentTimecard.profiles) 
                  ? currentTimecard.profiles[0]?.full_name || 'Unknown User'
                  : currentTimecard.profiles?.full_name || 'Unknown User'}
              </div>
              {userProjectRole ? (
                <Badge variant="outline" className={`text-sm ${getRoleColor(userProjectRole)}`}>
                  {getRoleDisplayName(userProjectRole as any)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm bg-muted text-muted-foreground border-border">
                  Team Member
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentApprovalIndex + 1} of {submittedTimecards.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Summary - Enhanced for Multi-Day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              {currentTimecard.is_multi_day ? 'Total Time Summary' : 'Time Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {currentTimecard.is_multi_day ? 'Total Hours' : 'Hours Worked'}
                  </span>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {(currentTimecard.total_hours || 0).toFixed(1)}
                </p>
                {currentTimecard.is_multi_day && currentTimecard.working_days > 1 ? (
                  <p className="text-xs text-muted-foreground">
                    {((currentTimecard.total_hours || 0) / (currentTimecard.working_days || 1)).toFixed(1)} hours/day avg
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">hours worked</p>
                )}
              </div>
              
              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {currentTimecard.is_multi_day ? 'Total Break Time' : 'Break Duration'}
                  </span>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {Math.round((currentTimecard.total_break_duration || currentTimecard.break_duration || 0) * 60)}
                </p>
                {currentTimecard.is_multi_day && currentTimecard.working_days > 1 ? (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(((currentTimecard.total_break_duration || 0) * 60) / (currentTimecard.working_days || 1))} min/day avg
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">minutes</p>
                )}
              </div>
              
              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">Pay Rate</span>
                </div>
                <p className="text-3xl font-bold text-foreground">${(currentTimecard.pay_rate || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">per hour</p>
              </div>
              
              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {currentTimecard.is_multi_day ? 'Total Compensation' : 'Total Pay'}
                  </span>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${(currentTimecard.total_pay || 0).toFixed(2)}
                </p>
                {currentTimecard.is_multi_day && currentTimecard.working_days > 1 ? (
                  <p className="text-xs text-muted-foreground">
                    ${((currentTimecard.total_pay || 0) / (currentTimecard.working_days || 1)).toFixed(2)}/day avg
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">total compensation</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Details - Matching timecard details page format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              {currentTimecard.is_multi_day ? 'Daily Time Breakdown' : 'Time Details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentTimecard.is_multi_day && currentTimecard.daily_entries && currentTimecard.daily_entries.length > 0 ? (
              <div className="space-y-6">
                {currentTimecard.daily_entries.map((entry, index) => (
                  <div key={index} className="space-y-4">
                    {/* Day Header */}
                    <div className="flex items-center justify-between pb-2">
                      <h3 className="text-sm font-medium text-foreground">
                        Day {index + 1} - {new Date(entry.work_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{(entry.hours_worked || 0).toFixed(1)} hrs</span>
                        <span>${(entry.daily_pay || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Time Events Grid - matching timecard details page format */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Check In */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Check In</label>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <p className="text-lg font-semibold text-foreground">
                            {entry.check_in_time 
                              ? new Date(entry.check_in_time).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit', 
                                  second: '2-digit' 
                                })
                              : "Not Recorded"
                            }
                          </p>
                        </div>
                      </div>

                      {/* Break Start */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Break Start</label>
                        <div className={`p-3 rounded-lg border ${entry.break_start_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                          {entry.break_start_time ? (
                            <p className="text-lg font-semibold text-foreground">
                              {new Date(entry.break_start_time).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit', 
                                second: '2-digit' 
                              })}
                            </p>
                          ) : (
                            <p className="text-lg font-semibold text-muted-foreground">Not Recorded</p>
                          )}
                        </div>
                      </div>

                      {/* Break End */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Break End</label>
                        <div className={`p-3 rounded-lg border ${entry.break_end_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                          {entry.break_end_time ? (
                            <p className="text-lg font-semibold text-foreground">
                              {new Date(entry.break_end_time).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit', 
                                second: '2-digit' 
                              })}
                            </p>
                          ) : (
                            <p className="text-lg font-semibold text-muted-foreground">Not Recorded</p>
                          )}
                        </div>
                      </div>

                      {/* Check Out */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <p className="text-lg font-semibold text-foreground">
                            {entry.check_out_time 
                              ? new Date(entry.check_out_time).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit', 
                                  second: '2-digit' 
                                })
                              : "Not Recorded"
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dividing line between days (except for last entry) */}
                    {index < currentTimecard.daily_entries.length - 1 && (
                      <div className="border-t border-border my-6"></div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Single Day Layout */
              <div className="space-y-4">
                {/* Date Header */}
                <div className="text-center pb-2 border-b border-border">
                  <h3 className="text-lg font-medium text-foreground">
                    {new Date(currentTimecard.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                </div>

                {/* Time Events Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Check In */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Check In</label>
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <p className="text-lg font-semibold text-foreground">
                        {currentTimecard.check_in_time 
                          ? new Date(currentTimecard.check_in_time).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            })
                          : "Not Recorded"
                        }
                      </p>
                    </div>
                  </div>

                  {/* Break Start */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Break Start</label>
                    <div className={`p-3 rounded-lg border ${currentTimecard.break_start_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                      {currentTimecard.break_start_time ? (
                        <p className="text-lg font-semibold text-foreground">
                          {new Date(currentTimecard.break_start_time).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            second: '2-digit' 
                          })}
                        </p>
                      ) : (
                        <p className="text-lg font-semibold text-muted-foreground">Not Recorded</p>
                      )}
                    </div>
                  </div>

                  {/* Break End */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Break End</label>
                    <div className={`p-3 rounded-lg border ${currentTimecard.break_end_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                      {currentTimecard.break_end_time ? (
                        <p className="text-lg font-semibold text-foreground">
                          {new Date(currentTimecard.break_end_time).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            second: '2-digit' 
                          })}
                        </p>
                      ) : (
                        <p className="text-lg font-semibold text-muted-foreground">Not Recorded</p>
                      )}
                    </div>
                  </div>

                  {/* Check Out */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <p className="text-lg font-semibold text-foreground">
                        {currentTimecard.check_out_time 
                          ? new Date(currentTimecard.check_out_time).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            })
                          : "Not Recorded"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      
      {/* Navigation and Approve Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-4">
            <Button
            variant="outline"
            size="lg"
            onClick={goToPreviousTimecard}
            disabled={currentApprovalIndex === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </Button>

            <Button
            variant="outline"
            size="lg"
            onClick={() => {
              // TODO: Implement reject functionality
              console.log('Reject timecard:', submittedTimecards[currentApprovalIndex]?.id)
            }}
            disabled={loadingApproval}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            Reject
          </Button>

            <Button
            size="lg"
            onClick={approveCurrentTimecard}
            disabled={loadingApproval}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            {loadingApproval ? 'Approving...' : 'Approve'}
          </Button>

            <Button
            variant="outline"
            size="lg"
            onClick={goToNextTimecard}
            disabled={currentApprovalIndex === submittedTimecards.length - 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}