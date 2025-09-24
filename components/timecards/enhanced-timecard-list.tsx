"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, FileText, Send } from "lucide-react"
import type { Timecard } from "@/lib/types"
import Link from "next/link"
import { MultiDayTimecardDisplay } from "./multi-day-timecard-display"
import { MissingBreakResolutionModal } from "./missing-break-resolution-modal"
import { validateTimecardSubmission, resolveTimecardBreaks, canEditTimecard, getTimecardEditRestrictionMessage } from "@/lib/timecard-validation"

interface EnhancedTimecardListProps {
  timecards: Timecard[]
  onUpdate: () => void
  showUserColumn?: boolean
  enableBulkSubmit?: boolean
  projectStartDate?: string
}

export function EnhancedTimecardList({ 
  timecards, 
  onUpdate, 
  showUserColumn = false, 
  enableBulkSubmit = false, 
  projectStartDate 
}: EnhancedTimecardListProps) {
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
    const timecard = timecards.find(tc => tc.id === timecardId)
    if (!timecard) return

    const validation = validateTimecardSubmission([timecard], projectStartDate)
    
    if (!validation.canSubmit) {
      if (validation.missingBreaks.length > 0) {
        setPendingSubmissionId(timecardId)
        setShowMissingBreakModal(true)
        return
      } else {
        alert(validation.message)
        return
      }
    }

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
      alert("Failed to submit timecard")
    } finally {
      setSubmitting(null)
    }
  }

  const handleMissingBreakResolution = async (resolutions: Array<{ timecardId: string; breakStart: string; breakEnd: string }>) => {
    setResolvingBreaks(true)
    try {
      const success = await resolveTimecardBreaks(resolutions, supabase)
      if (success) {
        setShowMissingBreakModal(false)
        
        if (pendingSubmissionId) {
          await submitTimecard(pendingSubmissionId)
          setPendingSubmissionId(null)
        } else if (pendingSubmissionIds.length > 0) {
          await bulkSubmitTimecards()
          setPendingSubmissionIds([])
        }
      }
    } catch (error) {
      console.error("Error resolving breaks:", error)
    } finally {
      setResolvingBreaks(false)
    }
  }

  const bulkSubmitTimecards = async () => {
    const draftTimecards = timecards.filter(tc => tc.status === "draft")
    if (draftTimecards.length === 0) return

    const validation = validateTimecardSubmission(draftTimecards, projectStartDate)
    
    if (!validation.canSubmit) {
      if (validation.missingBreaks.length > 0) {
        setPendingSubmissionIds(draftTimecards.map(tc => tc.id))
        setShowMissingBreakModal(true)
        return
      } else {
        alert(validation.message)
        return
      }
    }

    setBulkSubmitting(true)
    try {
      const response = await fetch('/api/timecards/submit-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardIds: draftTimecards.map(tc => tc.id)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit timecards')
      }

      onUpdate()
    } catch (error) {
      console.error("Error bulk submitting timecards:", error)
      alert("Failed to submit timecards")
    } finally {
      setBulkSubmitting(false)
    }
  }

  // Group timecards by multi-day vs single-day
  const multiDayTimecards = timecards.filter(tc => {
    const notes = tc.admin_notes || ''
    const workingDaysMatch = notes.match(/Total of (\d+) working days/)
    return workingDaysMatch && parseInt(workingDaysMatch[1]) > 1
  })

  const singleDayTimecards = timecards.filter(tc => {
    const notes = tc.admin_notes || ''
    const workingDaysMatch = notes.match(/Total of (\d+) working days/)
    return !workingDaysMatch || parseInt(workingDaysMatch[1]) === 1
  })

  const draftTimecards = timecards.filter(tc => tc.status === "draft")

  if (timecards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">No Timecards Found</h3>
            <p className="text-muted-foreground mt-2">
              No timecards match the current filter criteria.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Bulk Submit Button */}
      {enableBulkSubmit && draftTimecards.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={bulkSubmitTimecards}
            disabled={bulkSubmitting}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Submit All Draft Timecards ({draftTimecards.length})
          </Button>
        </div>
      )}

      {/* Multi-Day Timecards Section */}
      {multiDayTimecards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Multi-Day Timecards</h2>
            <span className="text-sm text-muted-foreground">({multiDayTimecards.length})</span>
          </div>
          <div className="grid gap-4">
            {multiDayTimecards.map((timecard) => (
              <div key={timecard.id} className="relative">
                <Link href={`/timecards/${timecard.id}`} className="block">
                  <MultiDayTimecardDisplay 
                    timecard={timecard} 
                    showUserName={showUserColumn}
                  />
                </Link>
                
                {/* Action Buttons Overlay */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {timecard.status === "draft" && (
                    <>
                      {canEditTimecard(timecard) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="bg-background/95 backdrop-blur"
                        >
                          <Link href={`/timecards/${timecard.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          title={getTimecardEditRestrictionMessage(timecard)}
                          className="bg-background/95 backdrop-blur"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Flagged
                        </Button>
                      )}
                      
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
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single-Day Timecards Section */}
      {singleDayTimecards.length > 0 && (
        <div className="space-y-4">
          {multiDayTimecards.length > 0 && (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Single-Day Timecards</h2>
              <span className="text-sm text-muted-foreground">({singleDayTimecards.length})</span>
            </div>
          )}
          <div className="grid gap-4">
            {singleDayTimecards.map((timecard) => (
              <div key={timecard.id} className="relative">
                <Link href={`/timecards/${timecard.id}`} className="block">
                  <MultiDayTimecardDisplay 
                    timecard={timecard} 
                    showUserName={showUserColumn}
                  />
                </Link>
                
                {/* Action Buttons Overlay */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {timecard.status === "draft" && (
                    <>
                      {canEditTimecard(timecard) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="bg-background/95 backdrop-blur"
                        >
                          <Link href={`/timecards/${timecard.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          title={getTimecardEditRestrictionMessage(timecard)}
                          className="bg-background/95 backdrop-blur"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Flagged
                        </Button>
                      )}
                      
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
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Break Resolution Modal */}
      {showMissingBreakModal && (
        <MissingBreakResolutionModal
          timecards={pendingSubmissionId 
            ? timecards.filter(tc => tc.id === pendingSubmissionId)
            : timecards.filter(tc => pendingSubmissionIds.includes(tc.id))
          }
          onResolve={handleMissingBreakResolution}
          onCancel={() => {
            setShowMissingBreakModal(false)
            setPendingSubmissionId(null)
            setPendingSubmissionIds([])
          }}
          loading={resolvingBreaks}
        />
      )}
    </div>
  )
}