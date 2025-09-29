"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, Calendar, DollarSign, AlertTriangle, Check, X, Edit, Shield } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import { canApproveTimecardsWithSettings } from "@/lib/role-utils"
import { parseDate } from "@/lib/timezone-utils"

interface SupervisorApprovalQueueEnhancedProps {
  timecards: Timecard[]
  onUpdate: () => void
  userRole?: string | null
  globalSettings?: {
    in_house_can_approve_timecards?: boolean
    supervisor_can_approve_timecards?: boolean
    coordinator_can_approve_timecards?: boolean
  }
}

export function SupervisorApprovalQueueEnhanced({ 
  timecards, 
  onUpdate, 
  userRole, 
  globalSettings 
}: SupervisorApprovalQueueEnhancedProps) {
  const [selectedTimecards, setSelectedTimecards] = useState<string[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectingTimecard, setRejectingTimecard] = useState<string | null>(null)
  const [editingTimecard, setEditingTimecard] = useState<Timecard | null>(null)
  const [confirmationDialog, setConfirmationDialog] = useState<{
    type: 'bulk_approve' | 'edit_confirm'
    data?: any
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Check if user has approval permissions (requirement 6.1-6.6)
  const hasApprovalPermission = canApproveTimecardsWithSettings(
    userRole as any, 
    globalSettings
  )

  const handleTimecardSelection = (timecardId: string, checked: boolean) => {
    if (checked) {
      setSelectedTimecards([...selectedTimecards, timecardId])
    } else {
      setSelectedTimecards(selectedTimecards.filter((id) => id !== timecardId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTimecards(timecards.map((tc) => tc.id))
    } else {
      setSelectedTimecards([])
    }
  }

  const approveTimecard = async (timecardId: string) => {
    if (!hasApprovalPermission) {
      setError("You don't have permission to approve timecards")
      return
    }

    setProcessing(timecardId)
    setError(null)
    
    try {
      const response = await fetch('/api/timecards/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId,
          comments: comments[timecardId] || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve timecard')
      }

      onUpdate()
    } catch (error) {
      console.error("Error approving timecard:", error)
      setError(error instanceof Error ? error.message : 'Failed to approve timecard')
    } finally {
      setProcessing(null)
    }
  }

  const rejectTimecard = async (timecardId: string) => {
    if (!hasApprovalPermission) {
      setError("You don't have permission to reject timecards")
      return
    }

    // Required comments validation for rejection workflow (requirement 5.4)
    const rejectionComments = comments[timecardId]?.trim()
    if (!rejectionComments) {
      setError("Comments are required when rejecting a timecard")
      return
    }

    setProcessing(timecardId)
    setError(null)
    
    try {
      const response = await fetch('/api/timecards/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId,
          comments: rejectionComments,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject timecard')
      }

      onUpdate()
    } catch (error) {
      console.error("Error rejecting timecard:", error)
      setError(error instanceof Error ? error.message : 'Failed to reject timecard')
    } finally {
      setProcessing(null)
    }
  }

  const handleBulkApprove = () => {
    if (!hasApprovalPermission) {
      setError("You don't have permission to approve timecards")
      return
    }

    if (selectedTimecards.length === 0) {
      setError("No timecards selected for bulk approval")
      return
    }

    // Proper validation checks before bulk approval (requirement 5.9)
    const selectedTimecardData = timecards.filter(tc => selectedTimecards.includes(tc.id))
    const invalidTimecards = selectedTimecardData.filter(tc => tc.status !== 'submitted')
    const manuallyEditedCount = selectedTimecardData.filter(tc => tc.manually_edited).length

    setConfirmationDialog({
      type: 'bulk_approve',
      data: {
        count: selectedTimecards.length,
        invalidCount: invalidTimecards.length,
        manuallyEditedCount,
        invalidTimecards
      }
    })
  }

  const confirmBulkApprove = async () => {
    setProcessing("bulk")
    setError(null)
    
    try {
      const response = await fetch('/api/timecards/approve?bulk=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardIds: selectedTimecards,
          comments: undefined, // Bulk approval doesn't require comments
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to bulk approve timecards')
      }

      setSelectedTimecards([])
      setConfirmationDialog(null)
      onUpdate()
    } catch (error) {
      console.error("Error bulk approving timecards:", error)
      setError(error instanceof Error ? error.message : 'Failed to bulk approve timecards')
    } finally {
      setProcessing(null)
    }
  }

  // Two-way confirmation for administrator edits (requirement 5.3)
  const handleEditTimecard = (timecard: Timecard) => {
    if (userRole !== 'admin') {
      setError("Only administrators can edit timecards")
      return
    }
    setEditingTimecard(timecard)
  }

  const submitTimecardEdit = async (edits: any, adminNote: string) => {
    if (!editingTimecard) return

    setProcessing(editingTimecard.id)
    setError(null)
    
    try {
      const response = await fetch('/api/timecards/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: editingTimecard.id,
          edits,
          adminNote,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to edit timecard')
      }

      setEditingTimecard(null)
      onUpdate()
    } catch (error) {
      console.error("Error editing timecard:", error)
      setError(error instanceof Error ? error.message : 'Failed to edit timecard')
    } finally {
      setProcessing(null)
    }
  }

  // Show permission error if user doesn't have approval rights
  if (!hasApprovalPermission) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
          <p className="text-muted-foreground">You don't have permission to approve timecards.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Contact an administrator to configure approval permissions for your role.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (timecards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Check className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
          <p className="text-muted-foreground">No timecards awaiting approval.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox 
                checked={selectedTimecards.length === timecards.length && timecards.length > 0} 
                onCheckedChange={handleSelectAll} 
              />
              <span className="text-sm font-medium">
                {selectedTimecards.length} of {timecards.length} selected
              </span>
            </div>
            {selectedTimecards.length > 0 && (
              <Button
                onClick={handleBulkApprove}
                disabled={processing === "bulk"}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              >
                {processing === "bulk" ? "Approving..." : `Approve ${selectedTimecards.length} Timecards`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timecard List */}
      {timecards.map((timecard) => (
        <Card key={timecard.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedTimecards.includes(timecard.id)}
                  onCheckedChange={(checked) => handleTimecardSelection(timecard.id, checked as boolean)}
                />
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{parseDate(timecard.date) ? format(parseDate(timecard.date)!, "EEEE, MMMM d, yyyy") : "Invalid Date"}</CardTitle>
                  {timecard.profiles && (
                    <p className="text-sm text-muted-foreground">
                      {timecard.profiles.full_name}
                    </p>
                  )}
                  {timecard.projects && <p className="text-sm text-muted-foreground">{timecard.projects.name}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {timecard.manually_edited && (
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Manually Edited
                  </Badge>
                )}
                <Badge className="bg-blue-500 text-white dark:bg-blue-600 dark:text-blue-50">Submitted</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Hours Worked</p>
                  <p className="font-medium">{timecard.total_hours.toFixed(1)} hours</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Break Duration</p>
                  <p className="font-medium">{Math.round(timecard.break_duration)} minutes</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Pay</p>
                  <p className="font-medium">${timecard.total_pay.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {timecard.check_in_time && timecard.check_out_time && (
              <div className="text-sm text-muted-foreground">
                <p>
                  {format(new Date(timecard.check_in_time), "h:mm a")} -{" "}
                  {format(new Date(timecard.check_out_time), "h:mm a")}
                </p>
                {timecard.break_start_time && timecard.break_end_time && (
                  <p>
                    Break: {format(new Date(timecard.break_start_time), "h:mm a")} -{" "}
                    {format(new Date(timecard.break_end_time), "h:mm a")}
                  </p>
                )}
              </div>
            )}

            {timecard.manually_edited && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Manual Edit Flag</p>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  This timecard has been manually edited and requires supervisor review.
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">Edit Comments (Optional)</label>
              <Textarea
                placeholder="Add comments for this timecard..."
                value={comments[timecard.id] || ""}
                onChange={(e) => setComments({ ...comments, [timecard.id]: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingTimecard(timecard.id)}
                  disabled={processing === timecard.id}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
                >
                  <X className="w-4 h-4 mr-1" />
                  {processing === timecard.id ? "Processing..." : "Reject"}
                </Button>
                {userRole === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTimecard(timecard)}
                    disabled={processing === timecard.id}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/20"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => approveTimecard(timecard.id)}
                  disabled={processing === timecard.id}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {processing === timecard.id ? "Processing..." : "Approve"}
                </Button>
              </div>
              {timecard.submitted_at && (
                <p className="text-xs text-muted-foreground">
                  Submitted {format(new Date(timecard.submitted_at), "MMM d, h:mm a")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Rejection Confirmation Dialog */}
      <Dialog open={rejectingTimecard !== null} onOpenChange={() => setRejectingTimecard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timecard</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this timecard. The user will receive your comments and be able to make corrections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Explain why this timecard is being rejected..."
              value={rejectingTimecard ? (comments[rejectingTimecard] || '') : ''}
              onChange={(e) => {
                if (rejectingTimecard) {
                  setComments({ ...comments, [rejectingTimecard]: e.target.value })
                }
              }}
              className="min-h-[100px]"
            />
            {rejectingTimecard && !comments[rejectingTimecard]?.trim() && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Comments are required when rejecting a timecard.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingTimecard(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (rejectingTimecard) {
                  rejectTimecard(rejectingTimecard)
                  setRejectingTimecard(null)
                }
              }}
              disabled={!rejectingTimecard || !comments[rejectingTimecard]?.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject Timecard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approval Confirmation Dialog */}
      <Dialog 
        open={confirmationDialog?.type === 'bulk_approve'} 
        onOpenChange={() => setConfirmationDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Approval</DialogTitle>
            <DialogDescription>
              You are about to approve {confirmationDialog?.data?.count} timecard(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {confirmationDialog?.data?.invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {confirmationDialog.data.invalidCount} timecard(s) are not in submitted status and will be skipped.
                </AlertDescription>
              </Alert>
            )}
            {confirmationDialog?.data?.manuallyEditedCount > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {confirmationDialog.data.manuallyEditedCount} timecard(s) have been manually edited and require special attention.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. Are you sure you want to proceed?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmationDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmBulkApprove}
              disabled={processing === "bulk"}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processing === "bulk" ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}