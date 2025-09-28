"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DollarSign, FileText, AlertCircle, ChevronLeft, ChevronRight, Check, Clock, X, Edit3 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Timecard } from "@/lib/types"
import { MultiDayTimecardDisplay } from "@/components/timecards/multi-day-timecard-display"
import { DesktopTimecardGrid } from "@/components/timecards/desktop-timecard-grid"
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
 * 
Project-specific timecard approval component that shows submitted timecards
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

  // Simple rejection mode state - only what we need
  const [isRejectionMode, setIsRejectionMode] = useState(false)
  const [fieldEdits, setFieldEdits] = useState<Record<string, any>>({})
  const [showReasonDialog, setShowReasonDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [loadingRejection, setLoadingRejection] = useState(false)

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

  // Simplified rejection mode functions
  const enterRejectionMode = () => {
    setIsRejectionMode(true)
    setFieldEdits({})
  }

  const exitRejectionMode = () => {
    setIsRejectionMode(false)
    setFieldEdits({})
  }

  const handleFieldEdit = (fieldId: string, newValue: any) => {
    setFieldEdits(prev => {
      if (newValue === undefined) {
        // Remove the field from edits if value is undefined (matches original)
        const { [fieldId]: removed, ...rest } = prev
        return rest
      } else {
        // Add or update the field edit
        return {
          ...prev,
          [fieldId]: newValue
        }
      }
    })
  }

  const confirmRejection = () => {
    setShowReasonDialog(true)
  }

  const submitRejection = async () => {
    const currentTimecard = submittedTimecards[currentApprovalIndex]
    if (!currentTimecard || !rejectionReason.trim()) return

    setLoadingRejection(true)
    try {
      const hasEdits = Object.keys(fieldEdits).length > 0
      const rejectedFields = Object.keys(fieldEdits) // Fields that were edited are the rejected fields

      if (hasEdits) {
        // Apply edits and reject the timecard
        const response = await fetch('/api/timecards/edit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timecardId: currentTimecard.id,
            updates: {
              ...fieldEdits,
              status: 'rejected' // Set status to rejected when editing during rejection
            },
            editComment: rejectionReason.trim(),
            // Don't automatically generate admin notes - rejection reason goes in rejection_reason field
            returnToDraft: false, // Don't return to draft, we want to reject
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to edit and reject timecard')
        }
      } else {
        // Standard rejection without edits
        const response = await fetch('/api/timecards/reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timecardId: currentTimecard.id,
            comments: rejectionReason.trim(),
            rejectedFields: rejectedFields,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to reject timecard')
        }
      }

      // Reset rejection state and refresh data
      exitRejectionMode()
      setShowReasonDialog(false)
      setRejectionReason("")

      await fetchSubmittedTimecards()
      if (onRefreshData) {
        onRefreshData()
      }

      // If this was the last timecard, go to previous, otherwise stay at same index
      if (currentApprovalIndex >= submittedTimecards.length - 1 && submittedTimecards.length > 1) {
        setCurrentApprovalIndex(Math.max(0, currentApprovalIndex - 1))
      }
    } catch (error) {
      console.error('Error processing timecard:', error)
      setError(error instanceof Error ? error.message : 'Failed to process timecard')
    } finally {
      setLoadingRejection(false)
    }
  }

  const closeReasonDialog = () => {
    setShowReasonDialog(false)
    setRejectionReason("")
  }

  // Field mapping for rejection
  const getFieldDisplayName = (fieldId: string) => {
    const fieldMap: Record<string, string> = {
      'total_hours': 'Total Hours',
      'total_break_duration': 'Total Break Time',
      'pay_rate': 'Pay Rate',
      'total_pay': 'Total Pay',
      'check_in_time': 'Check In',
      'break_start_time': 'Break Start',
      'break_end_time': 'Break End',
      'check_out_time': 'Check Out'
    }

    // Handle day-specific fields
    if (fieldId.includes('_day_')) {
      const parts = fieldId.split('_day_')
      const baseField = parts[0]
      const dayIndex = parseInt(parts[1])

      if (!isNaN(dayIndex) && currentTimecard?.daily_entries && currentTimecard.daily_entries[dayIndex]) {
        const entry = currentTimecard.daily_entries[dayIndex]
        const date = new Date(entry.work_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
        return `${date} - ${fieldMap[baseField] || baseField}`
      }

      return `${fieldMap[baseField] || baseField} (Day ${dayIndex + 1})`
    }

    return fieldMap[fieldId] || fieldId
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
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Error Loading Timecards</h3>
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

  // Simplified button logic
  const hasEdits = Object.keys(fieldEdits).length > 0
  const buttonText = hasEdits ? "Apply Changes & Return" : "Reject Without Changes"

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

      {/* Responsive Timecard Display */}
      {/* Desktop Layout - Days as columns, categories as rows */}
      <div className="hidden lg:block">
        <DesktopTimecardGrid
          timecard={currentTimecard}
          isRejectionMode={isRejectionMode}
          selectedFields={Object.keys(fieldEdits)}
          fieldEdits={fieldEdits}
          onFieldEdit={handleFieldEdit}
          showSummaryInHeader={true}
          actionButtons={
            isRejectionMode ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exitRejectionMode}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={confirmRejection}
                  className="bg-red-600 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-900 text-white"
                >
                  {buttonText}
                </Button>
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Mobile Layout - Simplified */}
      <div className="lg:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                {currentTimecard.is_multi_day ? 'Daily Time Breakdown' : 'Time Details'}
                <span className={`ml-2 text-sm font-normal transition-opacity ${isRejectionMode
                  ? 'text-red-600 dark:text-red-400 opacity-100'
                  : 'opacity-0'
                  }`}>
                  (Click fields to edit)
                </span>
              </div>
            </CardTitle>

            <div className={`mt-3 flex items-center justify-end gap-2 transition-opacity ${isRejectionMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
              <Button
                variant="outline"
                size="sm"
                onClick={exitRejectionMode}
                disabled={!isRejectionMode}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmRejection}
                disabled={!isRejectionMode}
                className="bg-red-600 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-900 text-white"
              >
                {buttonText}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <MultiDayTimecardDisplay
              timecard={currentTimecard}
              isRejectionMode={isRejectionMode}
              fieldEdits={fieldEdits}
              onFieldEdit={handleFieldEdit}
            />
          </CardContent>
        </Card>
      </div>

      {/* Navigation and Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button - Arrow only on mobile */}
            <Button
              variant="outline"
              size="lg"
              onClick={goToPreviousTimecard}
              disabled={currentApprovalIndex === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {/* Reject Button - Icon + text on all sizes */}
            <Button
              variant="outline"
              size="lg"
              onClick={isRejectionMode ? exitRejectionMode : enterRejectionMode}
              disabled={loadingApproval}
              className={`flex items-center gap-2 ${isRejectionMode
                ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-950/40'
                : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-white dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/50 hover:border-red-100 dark:hover:border-red-800'
                }`}
            >
              {isRejectionMode ? (
                <>
                  <X className="w-5 h-5" />
                  <span className="hidden sm:inline">Cancel</span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5" />
                  <span className="hidden sm:inline">Reject</span>
                </>
              )}
            </Button>

            {/* Approve Button - Icon + text on all sizes */}
            <Button
              size="lg"
              onClick={approveCurrentTimecard}
              disabled={loadingApproval}
              className="bg-green-600/20 border border-green-600 text-green-400 hover:bg-green-600/30 hover:border-green-700 flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span className="hidden sm:inline">{loadingApproval ? 'Approving...' : 'Approve'}</span>
            </Button>

            {/* Next Button - Arrow only on mobile */}
            <Button
              variant="outline"
              size="lg"
              onClick={goToNextTimecard}
              disabled={currentApprovalIndex === submittedTimecards.length - 1}
              className="flex items-center gap-2"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Rejection Reason Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className={Object.keys(fieldEdits).length > 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}>
              {Object.keys(fieldEdits).length > 0 ? 'Return Timecard with Changes' : 'Reject Timecard'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {Object.keys(fieldEdits).length > 0 && (
              <div>
                <Label className="text-sm font-medium">Modified fields:</Label>
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(fieldEdits).map((fieldId, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs font-medium"
                      >
                        {getFieldDisplayName(fieldId)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Show changes made */}
            {Object.keys(fieldEdits).length > 0 && (
              <div>
                <Label className="text-sm font-medium">Changes made:</Label>
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    {Object.entries(fieldEdits).map(([fieldId, newValue]) => {
                      const originalValue = (() => {
                        if (fieldId.includes('_day_')) {
                          const parts = fieldId.split('_day_')
                          const dayIndex = parseInt(parts[1])
                          const fieldName = parts[0]

                          if (!isNaN(dayIndex) && currentTimecard?.daily_entries && currentTimecard.daily_entries[dayIndex]) {
                            return currentTimecard.daily_entries[dayIndex][fieldName as keyof typeof currentTimecard.daily_entries[0]]
                          }
                        } else {
                          return currentTimecard[fieldId as keyof typeof currentTimecard]
                        }
                        return null
                      })()

                      const formatTime = (timeString: string | null) => {
                        if (!timeString) return "Not Recorded"
                        return new Date(timeString).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })
                      }

                      return (
                        <div key={fieldId} className="text-sm">
                          <span className="font-medium text-blue-700 dark:text-blue-300">
                            {getFieldDisplayName(fieldId)}:
                          </span>
                          <span className="ml-2 text-muted-foreground line-through">
                            {formatTime(originalValue as string)}
                          </span>
                          <span className="mx-2 text-blue-600 dark:text-blue-400">→</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {formatTime(newValue)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="rejection-reason" className="text-sm font-medium">
                {Object.keys(fieldEdits).length > 0 ? 'Explanation of changes' : 'Reason for rejection'} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder={Object.keys(fieldEdits).length > 0
                  ? "Explain the corrections made and any remaining issues..."
                  : "Please explain the issues with this timecard..."
                }
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1 min-h-[100px]"
              />
              {!rejectionReason.trim() && (
                <p className="text-xs text-red-500 mt-1">
                  {Object.keys(fieldEdits).length > 0
                    ? 'An explanation is required when making changes'
                    : 'A reason is required when rejecting a timecard'
                  }
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeReasonDialog}
              disabled={loadingRejection}
            >
              Cancel
            </Button>
            <Button
              onClick={submitRejection}
              disabled={!rejectionReason.trim() || loadingRejection}
              className="bg-red-600 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-900 text-white"
            >
              {loadingRejection ? 'Processing...' : buttonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}