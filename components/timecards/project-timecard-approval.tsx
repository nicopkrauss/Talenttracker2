"use client"

import { useState, useEffect } from "react"
import { useIsDesktop } from "@/hooks/use-media-query"
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
import { parseDate } from "@/lib/timezone-utils"

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

  // Calendar week navigation state
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)

  // Responsive rendering
  const isDesktop = useIsDesktop()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchSubmittedTimecards = async () => {
    try {
      setError(null) // Clear any previous errors

      const response = await fetch(`/api/timecards/submitted?project_id=${projectId}`)

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorResult = await response.json()
          errorMessage = errorResult.error || errorMessage
          console.error("API Error Details:", errorResult)
        } catch (parseError) {
          console.error("Could not parse error response:", parseError)
        }

        console.error("Error fetching submitted timecards for approval:", errorMessage)
        setError(`Failed to fetch timecards: ${errorMessage}`)
        setSubmittedTimecards([])
        return
      }

      const result = await response.json()
      const data = result.data || []
      console.log(`Loaded ${data.length} submitted timecards using ${result.structure} structure`)
      setSubmittedTimecards(data)

      // Fetch team assignments to get project roles
      try {
        const teamResponse = await fetch(`/api/projects/${projectId}/team-assignments`)
        if (teamResponse.ok) {
          const teamResult = await teamResponse.json()
          const assignments = teamResult.assignments || []
          setTeamAssignments(assignments)
        } else {
          console.warn("Could not fetch team assignments:", teamResponse.status)
          setTeamAssignments([])
        }
      } catch (teamError) {
        console.warn("Error fetching team assignments:", teamError)
        setTeamAssignments([])
      }

      // Reset current index if it's out of bounds
      if (data.length > 0 && currentApprovalIndex >= data.length) {
        setCurrentApprovalIndex(0)
      }
    } catch (error) {
      console.error("Network error fetching submitted timecards:", error)
      setSubmittedTimecards([])
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  // Helper function to get the original value for a field
  const getOriginalValue = (fieldId: string) => {
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
  }

  // Helper function to normalize time values for comparison
  // Handle both simple time strings and ISO format for backward compatibility
  const normalizeTimeValue = (timeValue: string | null | undefined): string | null => {
    if (!timeValue) return null

    try {
      // If it's already a simple time string (HH:MM:SS), return as-is
      if (timeValue.includes(':') && !timeValue.includes('T')) {
        // Ensure it's in HH:MM:SS format
        const parts = timeValue.split(':')
        if (parts.length >= 2) {
          const hours = parts[0].padStart(2, '0')
          const minutes = parts[1].padStart(2, '0')
          const seconds = parts[2] ? parts[2].padStart(2, '0') : '00'
          return `${hours}:${minutes}:${seconds}`
        }
      }

      // If it's an ISO string, parse and extract time
      const date = new Date(timeValue)
      if (isNaN(date.getTime())) return timeValue.trim()

      // Extract only the time portion for comparison
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const seconds = date.getSeconds().toString().padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    } catch {
      return timeValue.trim()
    }
  }

  const handleFieldEdit = (fieldId: string, newValue: any) => {
    console.log(`🔧 handleFieldEdit called:`, {
      fieldId,
      newValue,
      newValueType: typeof newValue,
      currentFieldEdits: fieldEdits
    })

    setFieldEdits(prev => {
      let newFieldEdits
      if (newValue === undefined) {
        // Remove the field from edits if value is undefined (matches original)
        const { [fieldId]: removed, ...rest } = prev
        newFieldEdits = rest
        console.log(`🗑️ Removing field edit (undefined):`, {
          fieldId,
          removedValue: removed,
          newFieldEdits
        })
      } else {
        // Get the original value for comparison
        const originalValue = getOriginalValue(fieldId)

        // Compare normalized values to determine if they match
        const normalizedNew = normalizeTimeValue(newValue)
        const normalizedOriginal = normalizeTimeValue(originalValue as string)

        console.log(`🔍 Comparing values:`, {
          fieldId,
          originalValue,
          originalValueType: typeof originalValue,
          newValue,
          newValueType: typeof newValue,
          normalizedOriginal,
          normalizedNew,
          valuesMatch: normalizedNew === normalizedOriginal
        })

        if (normalizedNew === normalizedOriginal) {
          // Values match - remove the field from edits
          const { [fieldId]: removed, ...rest } = prev
          newFieldEdits = rest
          console.log(`🗑️ Removing field edit (values match):`, {
            fieldId,
            removedValue: removed,
            newFieldEdits
          })
        } else {
          // Values differ - add or update the field edit
          newFieldEdits = {
            ...prev,
            [fieldId]: newValue
          }
          console.log(`📝 Adding/updating field edit:`, {
            fieldId,
            originalValue,
            newValue,
            normalizedOriginal,
            normalizedNew,
            newFieldEdits
          })
        }
      }
      return newFieldEdits
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
        console.log('🔧 Rejection with edits:', {
          timecardId: currentTimecard.id,
          fieldEdits,
          rejectedFields,
          rejectionReason: rejectionReason.trim()
        })

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
          console.error('Edit API error:', errorData)
          throw new Error(errorData.error || 'Failed to edit and reject timecard')
        }

        const result = await response.json()
        console.log('✅ Edit API success:', result)
      } else {
        console.log('🔧 Rejection without edits:', {
          timecardId: currentTimecard.id,
          rejectionReason: rejectionReason.trim(),
          rejectedFields
        })

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
          console.error('Reject API error:', errorData)
          throw new Error(errorData.error || 'Failed to reject timecard')
        }

        const result = await response.json()
        console.log('✅ Reject API success:', result)
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
        const date = parseDate(entry.work_date)?.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }) || 'Invalid'
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

  // Calendar week logic for multi-day timecards
  const dailyEntries = currentTimecard.daily_entries || []
  const needsPagination = dailyEntries.length > 7

  // Group daily entries by calendar weeks (Sunday = 0, Saturday = 6)
  const getCalendarWeeks = () => {
    if (dailyEntries.length === 0) return [[]]

    const weeks: any[][] = []
    const weekMap = new Map<string, any[]>()

    // Find the date range using proper date parsing
    const dates = dailyEntries
      .map(entry => parseDate(entry.work_date))
      .filter(date => date !== null)
      .sort((a, b) => a!.getTime() - b!.getTime())
    if (dates.length === 0) return [[]]

    const startDate = dates[0]!
    const endDate = dates[dates.length - 1]!

    // Find the Sunday of the week containing the start date
    const firstSunday = new Date(startDate)
    firstSunday.setDate(startDate.getDate() - startDate.getDay())

    // Find the Saturday of the week containing the end date
    const lastSaturday = new Date(endDate)
    lastSaturday.setDate(endDate.getDate() + (6 - endDate.getDay()))

    // Create week buckets from first Sunday to last Saturday
    let currentWeekStart = new Date(firstSunday)
    while (currentWeekStart <= lastSaturday) {
      const weekKey = currentWeekStart.toISOString().split('T')[0]
      weekMap.set(weekKey, [])

      // Move to next Sunday
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    }

    // Place each daily entry in the correct week bucket
    dailyEntries.forEach(entry => {
      const entryDate = parseDate(entry.work_date)
      if (!entryDate) return

      const entrySunday = new Date(entryDate)
      entrySunday.setDate(entryDate.getDate() - entryDate.getDay())
      const weekKey = entrySunday.toISOString().split('T')[0]

      if (weekMap.has(weekKey)) {
        weekMap.get(weekKey)!.push(entry)
      }
    })

    // Convert map to array of weeks, ensuring each week has 7 slots (some may be empty)
    currentWeekStart = new Date(firstSunday)
    while (currentWeekStart <= lastSaturday) {
      const weekKey = currentWeekStart.toISOString().split('T')[0]
      const weekEntries = weekMap.get(weekKey) || []

      // Create full week with 7 slots
      const fullWeek = []
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = new Date(currentWeekStart)
        dayDate.setDate(currentWeekStart.getDate() + dayOffset)
        const dayKey = dayDate.toISOString().split('T')[0]

        // Find entry for this specific date
        const dayEntry = weekEntries.find(entry => entry.work_date === dayKey)
        fullWeek.push(dayEntry || null) // null for empty days
      }

      weeks.push(fullWeek)

      // Move to next Sunday
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    }

    return weeks
  }

  const calendarWeeks = getCalendarWeeks()
  const totalWeeks = calendarWeeks.length
  const currentWeekEntries = needsPagination ? (calendarWeeks[currentWeekIndex] || []) : dailyEntries

  // Reset to first week if current index is out of bounds
  if (currentWeekIndex >= totalWeeks && totalWeeks > 0) {
    setCurrentWeekIndex(0)
  }

  // Simplified button logic
  const hasEdits = Object.keys(fieldEdits).length > 0
  const buttonText = hasEdits ? "Apply Changes & Return" : "Reject Without Changes"

  return (
    <div className="space-y-4">


      {/* Responsive Timecard Display */}
      {/* Desktop Layout - Days as columns, categories as rows */}
      {isDesktop && (
        <div className="relative">
          {/* Previous Arrow - Larger and more rounded */}
          <button
            onClick={goToPreviousTimecard}
            disabled={currentApprovalIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-20 p-2.5 rounded-lg bg-background border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous timecard"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Next Arrow - Larger and more rounded */}
          <button
            onClick={goToNextTimecard}
            disabled={currentApprovalIndex === submittedTimecards.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-20 p-2.5 rounded-lg bg-background border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next timecard"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <DesktopTimecardGrid
            timecard={currentTimecard}
            isRejectionMode={isRejectionMode}
            selectedFields={Object.keys(fieldEdits)}
            fieldEdits={fieldEdits}
            onFieldEdit={handleFieldEdit}
            showSummaryInHeader={true}
            showRejectedFields={currentTimecard.status === 'rejected'}
            currentWeekEntries={currentWeekEntries.filter(entry => entry !== null)} // Remove null entries for desktop grid
            currentWeekIndex={currentWeekIndex}
            totalWeeks={totalWeeks}
            onWeekChange={setCurrentWeekIndex}
            isCalendarWeekMode={true} // Always use calendar week mode for approval tab
            personName={Array.isArray(currentTimecard.profiles)
              ? currentTimecard.profiles[0]?.full_name || 'Unknown User'
              : currentTimecard.profiles?.full_name || 'Unknown User'}
            personRoleBadge={
              <Badge variant="outline" className={`text-sm ${getRoleColor(userProjectRole || 'team_member')}`}>
                {userProjectRole ? getRoleDisplayName(userProjectRole as any) : 'Team Member'}
              </Badge>
            }
            timecardCount={`${currentApprovalIndex + 1} of ${submittedTimecards.length}`}
            actionButtons={
              <div className="flex items-center gap-2">
                {isRejectionMode ? (
                  <>
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
                  </>
                ) : (
                  <>
                    {/* Reject Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={enterRejectionMode}
                      disabled={loadingApproval}
                      className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-white dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/50 hover:border-red-100 dark:hover:border-red-800 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Reject</span>
                    </Button>

                    {/* Approve Button */}
                    <Button
                      size="sm"
                      onClick={approveCurrentTimecard}
                      disabled={loadingApproval}
                      className="bg-green-600/20 border border-green-600 text-green-400 hover:bg-green-600/30 hover:border-green-700 flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      <span className="hidden sm:inline">{loadingApproval ? 'Approving...' : 'Approve'}</span>
                    </Button>
                  </>
                )}
              </div>
            }
          />
        </div>
      )}

      {/* Mobile Layout - Simplified */}
      <div className="xl:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {/* Title and info */}
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {Array.isArray(currentTimecard.profiles)
                      ? currentTimecard.profiles[0]?.full_name || 'Unknown User'
                      : currentTimecard.profiles?.full_name || 'Unknown User'}
                  </span>
                  <Badge variant="outline" className={`text-sm ${getRoleColor(userProjectRole || 'team_member')}`}>
                    {userProjectRole ? getRoleDisplayName(userProjectRole as any) : 'Team Member'}
                  </Badge>
                </div>
              </div>

              {/* Navigation arrows */}
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPreviousTimecard}
                  disabled={currentApprovalIndex === 0}
                  className="p-1.5 rounded-lg bg-background border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous timecard"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={goToNextTimecard}
                  disabled={currentApprovalIndex === submittedTimecards.length - 1}
                  className="p-1.5 rounded-lg bg-background border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next timecard"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </CardTitle>

            {/* Rejection mode indicator */}
            {isRejectionMode && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-2">
                Click fields to edit them
              </div>
            )}
          </CardHeader>
          <CardContent className="pb-0">
            <MultiDayTimecardDisplay
              timecard={currentTimecard}
              isRejectionMode={isRejectionMode}
              fieldEdits={fieldEdits}
              onFieldEdit={handleFieldEdit}
              showHeaderStats={false}
              showUserName={false}
              isApproveContext={true}
            />
          </CardContent>

          {/* Bottom Action Buttons - Inside Card */}
          <div className="border-t border-border p-6">
            <div className="flex gap-2">
              {isRejectionMode ? (
                <>
                  {/* Cancel Button - 50% width */}
                  <Button
                    variant="outline"
                    onClick={exitRejectionMode}
                    className="flex-1 h-12 text-base"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancel
                  </Button>

                  {/* Confirm Rejection Button - 50% width */}
                  <Button
                    onClick={confirmRejection}
                    className="flex-1 h-12 text-base bg-red-600 dark:bg-red-800 hover:bg-red-700 dark:hover:bg-red-900 text-white"
                  >
                    {buttonText}
                  </Button>
                </>
              ) : (
                <>
                  {/* Reject Button - 50% width */}
                  <Button
                    variant="outline"
                    onClick={enterRejectionMode}
                    disabled={loadingApproval}
                    className="flex-1 h-12 text-base bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/50"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Reject
                  </Button>

                  {/* Approve Button - 50% width */}
                  <Button
                    onClick={approveCurrentTimecard}
                    disabled={loadingApproval}
                    className="flex-1 h-12 text-base bg-green-600/20 border border-green-600 text-green-400 hover:bg-green-600/30 hover:border-green-700"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    {loadingApproval ? 'Approving...' : 'Approve'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>



      {/* Enhanced Rejection Reason Dialog */}
      {showReasonDialog && (
        <>
          {/* Desktop: Use original Dialog */}
          {isDesktop ? (
            <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className={Object.keys(fieldEdits).length > 0 ? "text-white" : "text-red-600 dark:text-red-400"}>
                    {Object.keys(fieldEdits).length > 0 ? 'Reject Timecard with Changes' : 'Reject Timecard'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {Object.keys(fieldEdits).length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Changes made:</Label>
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="space-y-2">
                          {Object.entries(fieldEdits).map(([fieldId, newValue]) => {
                            const originalValue = getOriginalValue(fieldId)

                            const formatTime = (timeString: string | null) => {
                              if (!timeString) return "Not Recorded"

                              try {
                                // Handle both full datetime and simple time formats
                                let date: Date;

                                if (timeString.includes('T')) {
                                  // Full datetime string
                                  date = new Date(timeString)
                                } else if (timeString.includes(':')) {
                                  // Simple time format (HH:MM:SS) - combine with today's date
                                  const today = new Date().toISOString().split('T')[0]
                                  date = new Date(`${today}T${timeString}`)
                                } else {
                                  return "Not Recorded"
                                }

                                if (isNaN(date.getTime())) return "Not Recorded"

                                return date.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })
                              } catch {
                                return "Not Recorded"
                              }
                            }

                            return (
                              <div key={fieldId} className="text-sm">
                                <span className="font-medium text-white">
                                  {getFieldDisplayName(fieldId)}:
                                </span>
                                <span className="ml-2 text-muted-foreground line-through">
                                  {formatTime(originalValue as string)}
                                </span>
                                <span className="mx-2 text-white">→</span>
                                <span className="font-medium text-red-600 dark:text-red-400">
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
          ) : (
            /* Mobile: Custom popup styled to match desktop Dialog */
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-background border rounded-lg shadow-lg mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header - matches DialogHeader styling */}
                <div className="flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-4">
                  <h2 className={`text-lg font-semibold leading-none tracking-tight ${Object.keys(fieldEdits).length > 0 ? "text-white" : "text-red-600 dark:text-red-400"}`}>
                    {Object.keys(fieldEdits).length > 0 ? 'Reject Timecard with Changes' : 'Reject Timecard'}
                  </h2>
                </div>

                {/* Content - matches Dialog content spacing */}
                <div className="p-6 pt-0">
                  <div className="space-y-4">
                  {Object.keys(fieldEdits).length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Changes made:</Label>
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="space-y-2">
                          {Object.entries(fieldEdits).map(([fieldId, newValue]) => {
                            const originalValue = getOriginalValue(fieldId)

                            const formatTime = (timeString: string | null) => {
                              if (!timeString) return "Not Recorded"

                              try {
                                // Handle both full datetime and simple time formats
                                let date: Date;

                                if (timeString.includes('T')) {
                                  // Full datetime string
                                  date = new Date(timeString)
                                } else if (timeString.includes(':')) {
                                  // Simple time format (HH:MM:SS) - combine with today's date
                                  const today = new Date().toISOString().split('T')[0]
                                  date = new Date(`${today}T${timeString}`)
                                } else {
                                  return "Not Recorded"
                                }

                                if (isNaN(date.getTime())) return "Not Recorded"

                                return date.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })
                              } catch {
                                return "Not Recorded"
                              }
                            }

                            return (
                              <div key={fieldId} className="text-sm">
                                <span className="font-medium text-white">
                                  {getFieldDisplayName(fieldId)}:
                                </span>
                                <span className="ml-2 text-muted-foreground line-through">
                                  {formatTime(originalValue as string)}
                                </span>
                                <span className="mx-2 text-white">→</span>
                                <span className="font-medium text-red-600 dark:text-red-400">
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
                      <Label htmlFor="mobile-rejection-reason" className="text-sm font-medium">
                        {Object.keys(fieldEdits).length > 0 ? 'Explanation of changes' : 'Reason for rejection'} <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="mobile-rejection-reason"
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
                </div>

                {/* Footer - matches DialogFooter styling */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0">
                  <Button
                    variant="outline"
                    onClick={closeReasonDialog}
                    disabled={loadingRejection}
                    className="mt-3 sm:mt-0"
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
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}