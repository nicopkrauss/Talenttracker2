"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, FileText, AlertCircle, FileEdit, ChevronLeft, ChevronRight, Check } from "lucide-react"
import type { Timecard } from "@/lib/types"

// New payroll summary interface
interface PayrollSummaryItem {
  userId: string
  userName: string
  projectName: string
  totalHours: number
  totalPay: number
  timecardCount: number
  statusBreakdown: {
    approved: number
    submitted: number
    draft: number
    rejected: number
  }
}
import { NormalizedTimecardDisplay } from "@/components/timecards/normalized-timecard-display"
import { TimecardList } from "@/components/timecards/timecard-list"
import { MultiDayTimecardDisplay } from "@/components/timecards/multi-day-timecard-display"

// Temporarily disabled during auth system overhaul
// import { useAuth } from "@/lib/auth"

export default function TimecardsPage() {
  // Temporarily disabled during auth system overhaul
  // const { user, userProfile } = useAuth()
  const user = { id: 'temp-user' } // Temporary mock
  const userProfile = { role: 'admin' } // Temporary mock
  const [timecards, setTimecards] = useState<Timecard[]>([])
  const [pendingTimecards, setPendingTimecards] = useState<Timecard[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [globalSettings, setGlobalSettings] = useState<any>(null)
  const [fetchingSettings, setFetchingSettings] = useState(false)
  const [fetchingTimecards, setFetchingTimecards] = useState(false)
  const [fetchingPending, setFetchingPending] = useState(false)
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummaryItem[]>([])
  const [loadingPayroll, setLoadingPayroll] = useState(false)
  const [payrollInitialLoad, setPayrollInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0)
  const [submittedTimecards, setSubmittedTimecards] = useState<Timecard[]>([])
  const [loadingApproval, setLoadingApproval] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const isAdmin = useMemo(() => 
    userProfile?.role === "admin" || userProfile?.role === "in_house", 
    [userProfile?.role]
  )
  const isSupervisor = useMemo(() => 
    userProfile?.role === "supervisor" || userProfile?.role === "coordinator", 
    [userProfile?.role]
  )

  const fetchSubmittedTimecards = async () => {
    if (!isAdmin) return
    
    try {
      const response = await fetch('/api/timecards-v2?status=submitted')
      const result = await response.json()
      
      if (!response.ok) {
        console.error("Error fetching submitted timecards for approval:", result.error)
        setSubmittedTimecards([])
        return
      }
      
      const data = result.data || []
      setSubmittedTimecards(data)
      
      // Reset current index if it's out of bounds
      if (data.length > 0 && currentApprovalIndex >= data.length) {
        setCurrentApprovalIndex(0)
      }
    } catch (error) {
      console.error("Error fetching submitted timecards:", error)
      setSubmittedTimecards([])
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
      await refreshAllData()
      
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

  const fetchGlobalSettings = async () => {
    if (fetchingSettings) return // Prevent multiple simultaneous calls
    
    setFetchingSettings(true)
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1)

      if (error) {
        console.error("Error fetching global settings:", error)
        // Use default settings if fetch fails
        setGlobalSettings({
          in_house_can_approve_timecards: true,
          supervisor_can_approve_timecards: true,
          coordinator_can_approve_timecards: false,
        })
      } else {
        setGlobalSettings(data && data.length > 0 ? data[0] : {
          in_house_can_approve_timecards: true,
          supervisor_can_approve_timecards: true,
          coordinator_can_approve_timecards: false,
        })
      }
    } catch (error) {
      console.error("Error fetching global settings:", error)
      // Use default settings if fetch fails
      setGlobalSettings({
        in_house_can_approve_timecards: true,
        supervisor_can_approve_timecards: true,
        coordinator_can_approve_timecards: false,
      })
    } finally {
      setFetchingSettings(false)
    }
  }

  const fetchTimecards = async () => {
    if (fetchingTimecards) return // Prevent multiple simultaneous calls
    
    setFetchingTimecards(true)
    setError(null)
    
    try {
      // Build query parameters
      const params = new URLSearchParams()
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
      
      if (data.length === 0) {
        console.log("No timecards found - this may be expected if no data has been created yet")
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

  const fetchPendingTimecards = async () => {
    if (fetchingPending) return // Prevent multiple simultaneous calls
    
    setFetchingPending(true)
    try {
      const response = await fetch('/api/timecards-v2?status=submitted')
      const result = await response.json()
      
      if (!response.ok) {
        console.error("API error fetching pending timecards:", result)
        setPendingTimecards([])
        return
      }
      
      const data = result.data || []
      setPendingTimecards(data)
    } catch (error) {
      console.error("Error fetching pending timecards:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      })
      setPendingTimecards([])
    } finally {
      setFetchingPending(false)
    }
  }

  const fetchPayrollSummary = async (force = false) => {
    if (loadingPayroll && !force) return
    
    setLoadingPayroll(true)
    try {
      const response = await fetch('/api/timecards-v2')
      const result = await response.json()
      
      if (!response.ok) {
        console.error("Error fetching payroll data:", result.error)
        setPayrollSummary([])
        return
      }
      
      const data = result.data || []

      // Group by user and calculate summary
      const userSummaryMap = new Map<string, PayrollSummaryItem>()
      
      data?.forEach((timecard) => {
        const userId = timecard.user_id
        const userName = timecard.user?.full_name || 
                        (Array.isArray(timecard.profiles) ? timecard.profiles[0]?.full_name : timecard.profiles?.full_name) || 
                        'Unknown User'
        const projectName = timecard.project?.name || 
                           (Array.isArray(timecard.projects) ? timecard.projects[0]?.name : timecard.projects?.name) || 
                           'Unknown Project'
        
        if (!userSummaryMap.has(userId)) {
          userSummaryMap.set(userId, {
            userId,
            userName,
            projectName,
            totalHours: 0,
            totalPay: 0,
            timecardCount: 0,
            statusBreakdown: {
              approved: 0,
              submitted: 0,
              draft: 0,
              rejected: 0
            }
          })
        }
        
        const summary = userSummaryMap.get(userId)!
        summary.totalHours += timecard.total_hours || 0
        summary.totalPay += timecard.total_pay || 0
        summary.timecardCount += 1
        
        // Count by status
        if (timecard.status === 'approved') {
          summary.statusBreakdown.approved += 1
        } else if (timecard.status === 'submitted') {
          summary.statusBreakdown.submitted += 1
        } else if (timecard.status === 'draft') {
          summary.statusBreakdown.draft += 1
        } else if (timecard.status === 'rejected') {
          summary.statusBreakdown.rejected += 1
        }
      })
      
      // Convert to array and sort by priority: approved first, then submitted, then drafts
      const summaryArray = Array.from(userSummaryMap.values()).sort((a, b) => {
        // First priority: approved timecards (descending)
        if (a.statusBreakdown.approved !== b.statusBreakdown.approved) {
          return b.statusBreakdown.approved - a.statusBreakdown.approved
        }
        // Second priority: submitted timecards (descending)
        if (a.statusBreakdown.submitted !== b.statusBreakdown.submitted) {
          return b.statusBreakdown.submitted - a.statusBreakdown.submitted
        }
        // Third priority: draft timecards (descending)
        return b.statusBreakdown.draft - a.statusBreakdown.draft
      })
      
      setPayrollSummary(summaryArray)
    } catch (error) {
      console.error("Error processing payroll summary:", error)
      setPayrollSummary([])
    } finally {
      setLoadingPayroll(false)
      setPayrollInitialLoad(false)
    }
  }

  // Function to refresh all data (for use by child components)
  const refreshAllData = async () => {
    await fetchTimecards()
    if (isSupervisor || isAdmin) {
      await fetchPendingTimecards()
    }
    if (isAdmin) {
      await fetchPayrollSummary(true) // Force refresh
      await fetchSubmittedTimecards()
    }
  }

  // useEffect hooks - placed after all function declarations to avoid initialization errors
  useEffect(() => {
    if (user && !globalSettings && !fetchingSettings) {
      fetchGlobalSettings()
    }
  }, [user?.id, globalSettings, fetchingSettings])

  useEffect(() => {
    if (user && !initialLoadComplete) {
      setInitialLoadComplete(true)
      fetchTimecards()
      if (isSupervisor || isAdmin) {
        fetchPendingTimecards()
      }
      if (isAdmin) {
        fetchPayrollSummary()
        fetchSubmittedTimecards()
      }
    }
  }, [user?.id, isSupervisor, isAdmin, initialLoadComplete])

  // Separate effect for status filter changes (after initial load)
  useEffect(() => {
    if (initialLoadComplete && user) {
      fetchTimecards()
    }
  }, [statusFilter, initialLoadComplete, user?.id])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Database Connection Error</h3>
                <p className="text-muted-foreground mt-2">{error}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This may be due to database permissions or missing data. Please contact your administrator.
                </p>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show empty state if no data
  if (!hasData && timecards.length === 0 && !loading) {
    return (
      <div className="p-6">
        {!isAdmin && (
          <div className="flex justify-end mb-6">
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
                    ? "No timecards have been submitted yet. Staff members can submit timecards once they start working on projects."
                    : "You haven't submitted any timecards yet. Click the button above to submit your first timecard."
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
    <div className="min-h-screen flex flex-col">
      <div className="p-6 flex-1">
        <Tabs defaultValue="my-timecards" className="h-full flex flex-col">
        <TabsList className="bg-transparent border border-border rounded-lg p-1 gap-1">
          <TabsTrigger 
            value="my-timecards"
            className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent"
          >
            {isAdmin ? "Breakdown" : "My Timecards"}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger 
              value="approve"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent"
            >
              Approve
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger 
              value="summary"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:shadow-sm hover:bg-muted/60 text-muted-foreground border-transparent"
            >
              Summary
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-timecards" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
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
              </div>
            </CardContent>
          </Card>

          <TimecardList timecards={timecards} onUpdate={refreshAllData} showUserColumn={isAdmin} />
        </TabsContent>



        {isAdmin && (
          <TabsContent value="approve" className="flex-1 flex flex-col">
            {submittedTimecards.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">No Timecards to Approve</h3>
                    <p className="text-muted-foreground mt-2">
                      All submitted timecards have been processed. New submissions will appear here for approval.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Current Timecard Display */}
                {(() => {
                  const currentTimecard = submittedTimecards[currentApprovalIndex]
                  if (!currentTimecard) return null

                  return (
                    <div className="flex-1 flex flex-col">
                      <div className="flex-1 space-y-6">
                        {/* Header with navigation info */}
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-xl">
                                  {Array.isArray(currentTimecard.profiles) 
                                    ? currentTimecard.profiles[0]?.full_name || 'Unknown User'
                                    : currentTimecard.profiles?.full_name || 'Unknown User'}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {Array.isArray(currentTimecard.projects)
                                    ? currentTimecard.projects[0]?.name || 'Unknown Project'
                                    : currentTimecard.projects?.name || 'Unknown Project'} • 
                                  {currentTimecard.is_multi_day 
                                    ? `${new Date(currentTimecard.period_start_date || currentTimecard.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })} - ${new Date(currentTimecard.period_end_date || currentTimecard.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric' 
                                      })} (${currentTimecard.working_days || 1} days)`
                                    : new Date(currentTimecard.date).toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })
                                  }
                                </p>
                                {currentTimecard.submitted_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Submitted {new Date(currentTimecard.submitted_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}

                              </div>
                              <div className="text-sm text-muted-foreground">
                                {currentApprovalIndex + 1} of {submittedTimecards.length}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>

                        {/* Time Summary */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <DollarSign className="w-5 h-5 mr-2" />
                              Time Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="text-center sm:text-left">
                                <label className="text-sm font-medium text-muted-foreground">Total Hours</label>
                                <p className="text-3xl font-bold text-foreground">
                                  {(currentTimecard.total_hours || 0).toFixed(1)}
                                </p>
                                {currentTimecard.is_multi_day && currentTimecard.working_days > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    {((currentTimecard.total_hours || 0) / (currentTimecard.working_days || 1)).toFixed(1)}h avg/day
                                  </p>
                                )}
                              </div>
                              <div className="text-center sm:text-left">
                                <label className="text-sm font-medium text-muted-foreground">Break Duration</label>
                                <p className="text-xl font-semibold text-foreground">
                                  {Math.round((currentTimecard.total_break_duration || currentTimecard.break_duration || 0) * 60)} min
                                </p>
                                {currentTimecard.is_multi_day && currentTimecard.working_days > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    {Math.round(((currentTimecard.total_break_duration || 0) * 60) / (currentTimecard.working_days || 1))} min avg/day
                                  </p>
                                )}
                              </div>
                              <div className="text-center sm:text-left">
                                <label className="text-sm font-medium text-muted-foreground">Pay Rate</label>
                                <p className="text-xl font-semibold text-foreground">${(currentTimecard.pay_rate || 0).toFixed(2)}/hr</p>
                              </div>
                              <div className="text-center sm:text-left">
                                <label className="text-sm font-medium text-muted-foreground">Total Pay</label>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                  ${(currentTimecard.total_pay || 0).toFixed(2)}
                                </p>
                                {currentTimecard.is_multi_day && currentTimecard.working_days > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    ${((currentTimecard.total_pay || 0) / (currentTimecard.working_days || 1)).toFixed(0)} avg/day
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Time Details - MultiDayTimecardDisplay with header inside the card */}
                        <MultiDayTimecardDisplay 
                          timecard={currentTimecard} 
                          showUserName={false}
                          showHeaderStats={false}
                          showTimecardHeader={true}
                        />

                      </div>
                      
                      {/* Navigation and Approve Controls - Fixed to bottom */}
                      <div className="mt-auto py-4 bg-background">
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
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-8"
                          >
                            {loadingApproval ? (
                              <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Check className="w-5 h-5" />
                            )}
                            Approve
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
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Timecards</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{timecards.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Timecards</CardTitle>
                  <FileText className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {timecards.filter(tc => tc.status === 'approved').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Submitted Timecards</CardTitle>
                  <FileText className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingTimecards.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft Timecards</CardTitle>
                  <FileEdit className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {timecards.filter(tc => tc.status === 'draft').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pay</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${timecards.reduce((sum, tc) => sum + tc.total_pay, 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* New Payroll Summary Section */}
            <Card>
              <CardHeader>
                <CardTitle>Payroll Summary</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Staff members ordered by approval status: approved first, then submitted, then drafts
                </p>
              </CardHeader>
              <CardContent>
                {payrollInitialLoad ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : payrollSummary.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payroll data available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payrollSummary.map((item) => (
                      <div key={item.userId} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{item.userName}</h3>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">{item.projectName}</span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <span>{item.timecardCount} timecards</span>
                              <span>•</span>
                              <span>{item.totalHours.toFixed(1)} hours</span>
                            </div>
                            
                            {/* Status badges with proper ordering */}
                            <div className="flex flex-wrap gap-2">
                              {item.statusBreakdown.approved > 0 && (
                                <Badge variant="outline" className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950">
                                  {item.statusBreakdown.approved} approved
                                </Badge>
                              )}
                              {item.statusBreakdown.submitted > 0 && (
                                <Badge variant="outline" className="text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950">
                                  {item.statusBreakdown.submitted} submitted
                                </Badge>
                              )}
                              {item.statusBreakdown.draft > 0 && (
                                <Badge variant="outline" className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
                                  {item.statusBreakdown.draft} drafts
                                </Badge>
                              )}
                              {item.statusBreakdown.rejected > 0 && (
                                <Badge variant="outline" className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950">
                                  {item.statusBreakdown.rejected} rejected
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            <div className="text-xl font-bold">${item.totalPay.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        </Tabs>
      </div>
    </div>
  )
}
