"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, AlertTriangle } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import Link from "next/link"
import { MissingBreakResolutionModal } from "./missing-break-resolution-modal"
import { MultiDayTimecardDisplay } from "./multi-day-timecard-display"
import { validateTimecardSubmission, resolveTimecardBreaks, canEditTimecard, getTimecardEditRestrictionMessage } from "@/lib/timecard-validation"

interface TimecardListProps {
  timecards: Timecard[]
  onUpdate: () => void
  showUserColumn?: boolean
  enableBulkSubmit?: boolean
  projectStartDate?: string // For show day validation
}

export function TimecardList({ timecards, onUpdate, showUserColumn = false, enableBulkSubmit = false, projectStartDate }: TimecardListProps) {
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [showMissingBreakModal, setShowMissingBreakModal] = useState(false)
  const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null)
  const [pendingSubmissionIds, setPendingSubmissionIds] = useState<string[]>([])
  const [resolvingBreaks, setResolvingBreaks] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const submitTimecard = async (timecardId: string) => {
    // Find the timecard being submitted
    const timecard = timecards.find(tc => tc.id === timecardId)
    if (!timecard) return

    // Validate the timecard for missing breaks and show day timing
    const validation = validateTimecardSubmission([timecard], projectStartDate)
    
    if (!validation.canSubmit) {
      if (validation.missingBreaks.length > 0) {
        // Show missing break resolution modal
        setPendingSubmissionId(timecardId)
        setShowMissingBreakModal(true)
        return
      } else {
        // Show other validation errors (including show day timing)
        console.error("Validation errors:", validation.errors)
        alert(validation.errors.join('\n')) // TODO: Replace with proper toast notification
        return
      }
    }

    // Proceed with submission if validation passes
    await performTimecardSubmission(timecardId)
  }

  const performTimecardSubmission = async (timecardId: string) => {
    setSubmitting(timecardId)
    try {
      const response = await fetch('/api/timecards/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecardId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit timecard')
      }

      onUpdate()
    } catch (error) {
      console.error("Error submitting timecard:", error)
    } finally {
      setSubmitting(null)
    }
  }

  const handleBreakResolution = async (resolutions: Record<string, 'add_break' | 'no_break'>) => {
    if (!pendingSubmissionId) return

    setResolvingBreaks(true)
    try {
      // Call API to resolve breaks
      const response = await fetch('/api/timecards/resolve-breaks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardIds: [pendingSubmissionId],
          resolutions
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resolve breaks')
      }

      // Refresh timecard data
      onUpdate()

      // Close modal and proceed with submission
      setShowMissingBreakModal(false)
      const submissionId = pendingSubmissionId
      setPendingSubmissionId(null)
      
      // Now submit the timecard
      await performTimecardSubmission(submissionId)
    } catch (error) {
      console.error("Error resolving breaks:", error)
      // TODO: Show user-friendly error message
    } finally {
      setResolvingBreaks(false)
    }
  }

  const handleModalClose = () => {
    setShowMissingBreakModal(false)
    setPendingSubmissionId(null)
    setPendingSubmissionIds([])
  }

  const submitAllDraftTimecards = async () => {
    const draftTimecards = timecards.filter(tc => tc.status === 'draft')
    if (draftTimecards.length === 0) return

    // Validate all draft timecards for missing breaks and show day timing
    const validation = validateTimecardSubmission(draftTimecards, projectStartDate)
    
    if (!validation.canSubmit) {
      if (validation.missingBreaks.length > 0) {
        // Show missing break resolution modal for all timecards with issues
        setPendingSubmissionIds(draftTimecards.map(tc => tc.id))
        setShowMissingBreakModal(true)
        return
      } else {
        // Show other validation errors (including show day timing)
        console.error("Validation errors:", validation.errors)
        alert(validation.errors.join('\n')) // TODO: Replace with proper toast notification
        return
      }
    }

    // Proceed with bulk submission if validation passes
    await performBulkTimecardSubmission(draftTimecards.map(tc => tc.id))
  }

  const performBulkTimecardSubmission = async (timecardIds: string[]) => {
    setBulkSubmitting(true)
    try {
      const response = await fetch('/api/timecards/submit-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardIds: timecardIds
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit timecards')
      }

      onUpdate()
    } catch (error) {
      console.error("Error submitting timecards:", error)
    } finally {
      setBulkSubmitting(false)
    }
  }

  const handleBulkBreakResolution = async (resolutions: Record<string, 'add_break' | 'no_break'>) => {
    if (pendingSubmissionIds.length === 0) return

    setResolvingBreaks(true)
    try {
      // Call API to resolve breaks for all pending timecards
      const response = await fetch('/api/timecards/resolve-breaks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardIds: pendingSubmissionIds,
          resolutions
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resolve breaks')
      }

      // Refresh timecard data
      onUpdate()

      // Close modal and proceed with bulk submission
      setShowMissingBreakModal(false)
      const submissionIds = [...pendingSubmissionIds]
      setPendingSubmissionIds([])
      
      // Now submit all the timecards
      await performBulkTimecardSubmission(submissionIds)
    } catch (error) {
      console.error("Error resolving breaks:", error)
      // TODO: Show user-friendly error message
    } finally {
      setResolvingBreaks(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted-foreground dark:bg-muted-foreground"
      case "submitted":
        return "bg-blue-500 dark:bg-blue-600"
      case "approved":
        return "bg-green-500 dark:bg-green-600"
      case "rejected":
        return "bg-red-500 dark:bg-red-600"
      default:
        return "bg-muted-foreground dark:bg-muted-foreground"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft"
      case "submitted":
        return "Submitted"
      case "approved":
        return "Approved"
      case "rejected":
        return "Rejected"
      default:
        return status
    }
  }

  if (timecards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No timecards found.</p>
        </CardContent>
      </Card>
    )
  }

  // Get missing breaks for the modal
  const pendingTimecards = pendingSubmissionId 
    ? timecards.filter(tc => tc.id === pendingSubmissionId)
    : pendingSubmissionIds.length > 0 
      ? timecards.filter(tc => pendingSubmissionIds.includes(tc.id))
      : []
  const missingBreaks = pendingTimecards.length > 0 ? validateTimecardSubmission(pendingTimecards, projectStartDate).missingBreaks : []

  // Check if there are draft timecards for bulk submit
  const draftTimecards = timecards.filter(tc => tc.status === 'draft')
  const hasDraftTimecards = draftTimecards.length > 0
  
  // Check if bulk submission is allowed (show day validation)
  const bulkValidation = hasDraftTimecards ? validateTimecardSubmission(draftTimecards, projectStartDate) : null
  const canBulkSubmit = bulkValidation?.canSubmit ?? false

  return (
    <>
      {/* Bulk submit only for staff, not admins */}
      {enableBulkSubmit && !showUserColumn && hasDraftTimecards && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Submit All Draft Timecards</h3>
              <p className="text-sm text-muted-foreground">
                You have {draftTimecards.length} draft timecard(s) ready for submission
              </p>
              {!canBulkSubmit && bulkValidation?.errors && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {bulkValidation.errors[0]}
                </p>
              )}
            </div>
            <Button 
              onClick={submitAllDraftTimecards}
              disabled={bulkSubmitting || !canBulkSubmit}
            >
              {bulkSubmitting ? "Submitting..." : `Submit All (${draftTimecards.length})`}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Sort timecards by status: approved → submitted → drafts */}
        {timecards
          .sort((a, b) => {
            const statusOrder = { approved: 0, submitted: 1, draft: 2, rejected: 3 }
            return (statusOrder[a.status as keyof typeof statusOrder] || 4) - (statusOrder[b.status as keyof typeof statusOrder] || 4)
          })
          .map((timecard) => (
          <div key={timecard.id} className="relative">
            <Link href={`/timecards/${timecard.id}`} className="block">
              <MultiDayTimecardDisplay 
                timecard={timecard} 
                showUserName={showUserColumn}
              />
            </Link>
            
            {/* Action Buttons Overlay - only for staff view and draft timecards */}
            {!showUserColumn && timecard.status === "draft" && canEditTimecard(timecard) && (
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="bg-background/95 backdrop-blur"
                >
                  <Link href={`/timecards/${timecard.id}/edit`}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Link>
                </Button>
                
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    submitTimecard(timecard.id)
                  }}
                  disabled={submitting === timecard.id}
                  className="bg-background/95 backdrop-blur"
                >
                  {submitting === timecard.id ? "Submitting..." : "Submit"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <MissingBreakResolutionModal
        isOpen={showMissingBreakModal}
        onClose={handleModalClose}
        missingBreaks={missingBreaks}
        onResolve={pendingSubmissionIds.length > 0 ? handleBulkBreakResolution : handleBreakResolution}
        isResolving={resolvingBreaks}
      />
    </>
  )
}
