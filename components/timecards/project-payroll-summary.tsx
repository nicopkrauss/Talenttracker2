"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DollarSign, FileText, FileEdit } from "lucide-react"
import { getRoleColor, getRoleDisplayName } from "@/lib/role-utils"

interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
}

interface PayrollSummaryItem {
  userId: string
  userName: string
  projectName: string
  projectRole?: string
  totalHours: number
  totalPay: number
  timecardCount: number
  paymentSent: boolean
  statusBreakdown: {
    approved: number
    submitted: number
    draft: number
    rejected: number
  }
}

interface ProjectPayrollSummaryProps {
  projectId: string
  project: Project
}

/**
 * Project-specific payroll summary component that shows payroll data
 * filtered to a specific project
 */
export function ProjectPayrollSummary({ projectId, project }: ProjectPayrollSummaryProps) {
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummaryItem[]>([])
  const [timecards, setTimecards] = useState<any[]>([])
  const [pendingTimecards, setPendingTimecards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<'single' | 'multiple'>('single')
  const [targetUserId, setTargetUserId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchPayrollSummary = async () => {
    try {
      // Fetch all timecards for the project
      const response = await fetch(`/api/timecards-v2?project_id=${projectId}`)
      const result = await response.json()

      if (!response.ok) {
        console.error("Error fetching payroll data:", result.error)
        setPayrollSummary([])
        setTimecards([])
        setPendingTimecards([])
        setError("Failed to load payroll data")
        return
      }

      const data = result.data || []
      setTimecards(data)

      // Fetch pending timecards separately
      const pendingResponse = await fetch(`/api/timecards-v2?status=submitted&project_id=${projectId}`)
      const pendingResult = await pendingResponse.json()

      if (pendingResponse.ok) {
        setPendingTimecards(pendingResult.data || [])
      }

      // Fetch team assignments to get project roles
      const teamResponse = await fetch(`/api/projects/${projectId}/team-assignments`)
      const teamResult = await teamResponse.json()
      const teamAssignments = teamResponse.ok ? teamResult.assignments || [] : []



      // Group by user and calculate summary
      const userSummaryMap = new Map<string, PayrollSummaryItem>()

      data?.forEach((timecard: any) => {
        const userId = timecard.user_id
        const userName = timecard.user?.full_name ||
          (Array.isArray(timecard.profiles) ? timecard.profiles[0]?.full_name : timecard.profiles?.full_name) ||
          'Unknown User'
        const projectName = project.name

        // Find the user's team assignment role
        const teamAssignment = teamAssignments.find((assignment: any) => assignment.user_id === userId)
        const projectRole = teamAssignment?.role || null



        if (!userSummaryMap.has(userId)) {
          userSummaryMap.set(userId, {
            userId,
            userName,
            projectName,
            projectRole,
            totalHours: 0,
            totalPay: 0,
            timecardCount: 0,
            paymentSent: timecard.payment_sent || false,
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
      setTimecards([])
      setPendingTimecards([])
      setError("Failed to process payroll data")
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSent = async (userIds: string[]) => {
    try {
      // API call to mark payment as sent
      const response = await fetch('/api/timecards/mark-payment-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, projectId })
      })

      if (response.ok) {
        // Update local state
        setPayrollSummary(prev => prev.map(item =>
          userIds.includes(item.userId)
            ? { ...item, paymentSent: true }
            : item
        ))
        setSelectedUsers(new Set())
      }
    } catch (error) {
      console.error('Error marking payment as sent:', error)
    }
  }

  const handleSinglePayment = (userId: string) => {
    setTargetUserId(userId)
    setPaymentTarget('single')
    setShowPaymentDialog(true)
  }

  const handleMultiplePayment = () => {
    setPaymentTarget('multiple')
    setShowPaymentDialog(true)
  }

  const confirmPayment = () => {
    if (paymentTarget === 'single' && targetUserId) {
      handlePaymentSent([targetUserId])
    } else if (paymentTarget === 'multiple') {
      handlePaymentSent(Array.from(selectedUsers))
    }
    setShowPaymentDialog(false)
    setTargetUserId(null)
  }

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  useEffect(() => {
    fetchPayrollSummary()
  }, [projectId])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Error Loading Payroll Data</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (payrollSummary.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">No Payroll Data</h3>
            <p className="text-muted-foreground mt-2">
              No approved timecards found for {project.name}. Payroll summary will appear here once timecards are approved.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics Cards */}
      {/* Mobile Layout - 2x3 Grid with Compact Design */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-4">
          {/* Row 1 */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Timecards</span>
            </div>
            <div className="text-2xl font-bold">{timecards.length}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Approved</span>
            </div>
            <div className="text-2xl font-bold">{timecards.filter(tc => tc.status === 'approved').length}</div>
          </div>

          {/* Row 2 */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-muted-foreground">Submitted</span>
            </div>
            <div className="text-2xl font-bold">{pendingTimecards.length}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileEdit className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-muted-foreground">Draft</span>
            </div>
            <div className="text-2xl font-bold">{timecards.filter(tc => tc.status === 'draft').length}</div>
          </div>

          {/* Row 3 */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Approved Pay</span>
            </div>
            <div className="text-lg font-bold">
              ${timecards.filter(tc => tc.status === 'approved').reduce((sum, tc) => sum + (tc.total_pay || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Final Pay</span>
            </div>
            <div className="text-lg font-bold">
              ${timecards.reduce((sum, tc) => sum + (tc.total_pay || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original Cards */}
      <div className="hidden md:grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            <CardTitle className="text-sm font-medium">Approved Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${timecards.filter(tc => tc.status === 'approved').reduce((sum, tc) => sum + (tc.total_pay || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Final Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${timecards.reduce((sum, tc) => sum + (tc.total_pay || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Summary Section */}
      <Card>
        <CardHeader className="relative">
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Payroll Summary
          </CardTitle>
          {selectedUsers.size > 0 && (
            <Button
              onClick={handleMultiplePayment}
              size="sm"
              className="absolute top-0 right-6 h-7 text-xs px-3"
            >
              Mark {selectedUsers.size} as Paid
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {payrollSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payroll data available
            </div>
          ) : (
            <>
              {/* Desktop Layout - Team-style Cards */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {payrollSummary.map((summary) => {
                  const isSelected = selectedUsers.has(summary.userId)
                  return (
                    <Card
                      key={summary.userId}
                      className={`relative transition-all cursor-pointer border-2 ${isSelected
                        ? 'bg-card border-primary shadow-md'
                        : 'hover:shadow-md border-border hover:border-muted-foreground/20'
                        }`}
                      onClick={() => toggleUserSelection(summary.userId)}
                    >
                      <CardContent className="px-4 py-0">
                        <div className="space-y-2.5">
                          {/* Header with name and status badges */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium text-base leading-tight ${isSelected ? 'text-foreground' : ''
                                }`}>
                                {summary.userName}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {summary.totalHours.toFixed(1)} hours • ${summary.totalPay.toFixed(2)}
                              </p>
                            </div>

                            {/* Status badges in top right */}
                            <div className="flex flex-wrap gap-1 justify-end">
                              {summary.statusBreakdown.approved > 0 && (
                                <Badge variant="outline" className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950 text-xs">
                                  {summary.statusBreakdown.approved} approved
                                </Badge>
                              )}
                              {summary.statusBreakdown.submitted > 0 && (
                                <Badge variant="outline" className="text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950 text-xs">
                                  {summary.statusBreakdown.submitted} submitted
                                </Badge>
                              )}
                              {summary.statusBreakdown.draft > 0 && (
                                <Badge variant="outline" className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 text-xs">
                                  {summary.statusBreakdown.draft} draft
                                </Badge>
                              )}
                              {summary.statusBreakdown.rejected > 0 && (
                                <Badge variant="outline" className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 text-xs">
                                  {summary.statusBreakdown.rejected} rejected
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="space-y-1.5 flex-1">
                              {summary.projectRole ? (
                                <Badge variant="outline" className={`text-sm ${getRoleColor(summary.projectRole)}`}>
                                  {getRoleDisplayName(summary.projectRole as any)}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-sm bg-muted text-muted-foreground border-border">
                                  Team Member
                                </Badge>
                              )}
                            </div>

                            <div className="flex-1 flex justify-end">
                              <div
                                onClick={(e) => e.stopPropagation()}
                              >
                                {summary.paymentSent ? (
                                  <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-xs">

                                    Paid
                                  </Badge>
                                ) : (
                                  <Button
                                    onClick={() => handleSinglePayment(summary.userId)}
                                    size="sm"
                                    className="h-7 text-xs px-3"
                                  >

                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Mobile Layout - Team-style Cards */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {payrollSummary.map((summary) => {
                  const isSelected = selectedUsers.has(summary.userId)
                  return (
                    <Card
                      key={summary.userId}
                      className={`relative transition-all cursor-pointer border-2 ${isSelected
                        ? 'bg-card border-primary shadow-md'
                        : 'hover:shadow-md border-border hover:border-muted-foreground/20'
                        }`}
                      onClick={() => toggleUserSelection(summary.userId)}
                    >
                      <CardContent className="px-4 py-0">
                        <div className="space-y-2.5">
                          {/* Header with name and status badges */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium text-base leading-tight ${isSelected ? 'text-foreground' : ''
                                }`}>
                                {summary.userName}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {summary.totalHours.toFixed(1)} hours • ${summary.totalPay.toFixed(2)}
                              </p>
                            </div>

                            {/* Status badges in top right */}
                            <div className="flex flex-wrap gap-1 justify-end">
                              {summary.statusBreakdown.approved > 0 && (
                                <Badge variant="outline" className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950 text-xs">
                                  {summary.statusBreakdown.approved} approved
                                </Badge>
                              )}
                              {summary.statusBreakdown.submitted > 0 && (
                                <Badge variant="outline" className="text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950 text-xs">
                                  {summary.statusBreakdown.submitted} submitted
                                </Badge>
                              )}
                              {summary.statusBreakdown.draft > 0 && (
                                <Badge variant="outline" className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 text-xs">
                                  {summary.statusBreakdown.draft} draft
                                </Badge>
                              )}
                              {summary.statusBreakdown.rejected > 0 && (
                                <Badge variant="outline" className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 text-xs">
                                  {summary.statusBreakdown.rejected} rejected
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="space-y-1.5 flex-1">
                              {summary.projectRole ? (
                                <Badge variant="outline" className={`text-sm ${getRoleColor(summary.projectRole)}`}>
                                  {getRoleDisplayName(summary.projectRole as any)}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-sm bg-muted text-muted-foreground border-border">
                                  Team Member
                                </Badge>
                              )}
                            </div>

                            <div className="flex-1 flex justify-end">
                              <div
                                onClick={(e) => e.stopPropagation()}
                              >
                                {summary.paymentSent ? (
                                  <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-xs">

                                    Paid
                                  </Badge>
                                ) : (
                                  <Button
                                    onClick={() => handleSinglePayment(summary.userId)}
                                    size="sm"
                                    className="h-7 text-xs px-3"
                                  >

                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              {paymentTarget === 'single'
                ? `Are you sure you want to mark payment as sent for ${payrollSummary.find(s => s.userId === targetUserId)?.userName}?`
                : `Are you sure you want to mark payment as sent for ${selectedUsers.size} selected team members?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPayment}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
