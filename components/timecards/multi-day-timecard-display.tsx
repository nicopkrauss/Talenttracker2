"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { SimpleEditableField } from "./simple-editable-field"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import { getRoleColor, getRoleDisplayName } from "@/lib/role-utils"
import { DesktopTimecardGrid } from "./desktop-timecard-grid"
import { useIsDesktop } from "@/hooks/use-media-query"
import { MobileTimecardGrid } from "./mobile-timecard-grid"
import { parseDate, formatDateSafe } from "@/lib/timezone-utils"
import { calculateAdjustedHours } from "@/lib/adjusted-hours-calculation"

interface MultiDayTimecardDisplayProps {
  timecard: Timecard
  showUserName?: boolean
  showAdminNotes?: boolean
  showHeaderStats?: boolean
  showTimecardHeader?: boolean
  defaultExpanded?: boolean
  hideExpandToggle?: boolean
  userProjectRole?: string | null
  showRejectedFields?: boolean
  showBreakdownToggle?: boolean
  // Simplified rejection mode props
  isRejectionMode?: boolean
  fieldEdits?: Record<string, any>
  onFieldEdit?: (fieldId: string, newValue: any) => void
  isApproveContext?: boolean
}

export function MultiDayTimecardDisplay({ 
  timecard, 
  showUserName = false, 
  showAdminNotes = false, 
  showHeaderStats = true, 
  showTimecardHeader = false, 
  defaultExpanded = false, 
  hideExpandToggle = false, 
  userProjectRole = null, 
  showRejectedFields = false, 
  showBreakdownToggle = false,
  isRejectionMode = false,
  fieldEdits = {},
  onFieldEdit,
  isApproveContext = false
}: MultiDayTimecardDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)

  // Responsive rendering
  const isDesktop = useIsDesktop()

  // Update expanded state when defaultExpanded changes (for expand/collapse all)
  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [defaultExpanded])

  // Always show all days for multi-day timecards
  useEffect(() => {
    if (timecard.is_multi_day) {
      setIsExpanded(true)
    }
  }, [timecard.is_multi_day])

  // Helper function to safely format dates and times
  const safeFormat = (dateString: string | null | undefined, formatString: string, fallback: string = 'Invalid') => {
    return formatDateSafe(dateString, formatString, fallback)
  }

  // Use the new multi-day fields from the API
  const dailyEntries = timecard.daily_entries || []
  const isMultiDay = dailyEntries.length > 1
  const workingDays = timecard.working_days || dailyEntries.length || 1

  // Calendar week logic for timecards with more than 7 days
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

  // Helper function to check if a field is rejected
  const isFieldRejected = (fieldId: string) => {
    return showRejectedFields && timecard.rejected_fields && timecard.rejected_fields.includes(fieldId)
  }

  // Enhanced rejection mode helper functions
  const getFieldId = (fieldType: string, dayIndex?: number) => {
    return dayIndex !== undefined ? `${fieldType}_day_${dayIndex}` : fieldType
  }

  const isFieldEdited = (fieldId: string) => {
    return fieldEdits[fieldId] !== undefined
  }

  const getFieldValue = (fieldId: string, originalValue: any) => {
    return fieldEdits[fieldId] !== undefined ? fieldEdits[fieldId] : originalValue
  }



  // Helper function to check if all fields for a day are rejected
  const isDayRejected = (dayIndex: number) => {
    if (!showRejectedFields || !timecard.rejected_fields) return false

    const dayFieldIds = [
      `check_in_time_day_${dayIndex}`,
      `break_start_time_day_${dayIndex}`,
      `break_end_time_day_${dayIndex}`,
      `check_out_time_day_${dayIndex}`
    ]

    return dayFieldIds.every(fieldId => timecard.rejected_fields!.includes(fieldId))
  }

  // Helper function to check if the first day (single day timecard) is rejected
  const isFirstDayRejected = () => {
    if (!showRejectedFields || !timecard.rejected_fields) return false

    const dayFieldIds = [
      'check_in_time',
      'break_start_time',
      'break_end_time',
      'check_out_time'
    ]

    return dayFieldIds.every(fieldId => timecard.rejected_fields!.includes(fieldId))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground border-border"
      case "submitted":
        return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
      case "approved":
        return "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
      case "rejected":
        return "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
      default:
        return "bg-muted text-muted-foreground border-border"
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

  return (
    <div>
      {/* Mobile: Time breakdown grid - moved outside Card to be in same container as name/role badge */}
      {(timecard.check_in_time || timecard.daily_entries?.length > 0) && (!showBreakdownToggle || isExpanded) && (
        <MobileTimecardGrid
          timecard={timecard}
          isRejectionMode={isRejectionMode}
          selectedFields={[]}
          onFieldToggle={() => { }}
          showRejectedFields={showRejectedFields}
          fieldEdits={fieldEdits}
          onFieldEdit={onFieldEdit}
          currentWeekEntries={currentWeekEntries.filter(entry => entry !== null)} // Remove null entries
          currentWeekIndex={currentWeekIndex}
          totalWeeks={totalWeeks}
          onWeekChange={setCurrentWeekIndex}
          isCalendarWeekMode={false} // Mobile doesn't need calendar week mode
          showBreakdownToggle={showBreakdownToggle}
          isApproveContext={isApproveContext}
        />
      )}

      {/* Only render Card if there's content to show */}
      {((showUserName || showHeaderStats) || 
        (isDesktop && (timecard.check_in_time || timecard.daily_entries?.length > 0) && (!showBreakdownToggle || isExpanded)) ||
        (timecard.status === 'rejected' && timecard.rejection_reason)) && (
        <Card className="hover:shadow-md transition-shadow">
        {(showUserName || showHeaderStats) && (
        <CardHeader className="pb-0 gap-0">
          <div className="space-y-3 sm:space-y-0">
            {/* Name and badges row - on desktop this includes stats */}
            <div className="flex flex-col sm:grid sm:grid-cols-3 sm:items-center sm:gap-4">
              {/* Left section: Name and role badge */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-start">
                {showUserName && (
                  <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
                    {/* Mobile: Two-row layout to prevent name wrapping */}
                    <div className="sm:hidden space-y-2">
                      {/* Top row: Name (left) + Status badges (right) */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-lg text-foreground flex-1">
                          {Array.isArray(timecard.profiles)
                            ? timecard.profiles[0]?.full_name || 'Unknown User'
                            : timecard.profiles?.full_name || 'Unknown User'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={getStatusColor(timecard.status)}
                          >
                            {getStatusText(timecard.status)}
                          </Badge>
                        </div>
                      </div>

                      {/* Bottom row: Role badge only */}
                      <div className="flex items-center justify-start">
                        <div>
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
                      </div>
                    </div>

                    {/* Desktop: Single row layout */}
                    <div className="hidden sm:flex sm:items-center sm:gap-3">
                      <h3 className="font-semibold text-lg text-foreground">
                        {Array.isArray(timecard.profiles)
                          ? timecard.profiles[0]?.full_name || 'Unknown User'
                          : timecard.profiles?.full_name || 'Unknown User'}
                      </h3>
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
                  </div>
                )}
              </div>

              {/* Center section: Breakdown Toggle Button */}
              {showBreakdownToggle && (
                <div className="hidden sm:flex sm:justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsExpanded(!isExpanded)
                    }}
                    className="flex items-center gap-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show Details
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Right section: Stats and badges */}
              <div className="hidden sm:flex sm:items-center sm:justify-end sm:gap-4">
                {showHeaderStats && (
                  <>
                    <div className="flex items-baseline gap-1 text-right">
                      <p className="text-lg font-semibold text-foreground">
                        ${(timecard.pay_rate || 0).toFixed(0)}/h
                      </p>
                      <p className="text-xs text-muted-foreground">Rate</p>
                    </div>
                    <div className="flex items-baseline gap-1 text-right">
                      <p className="text-lg font-bold text-foreground">
                        {(timecard.total_hours || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Hours</p>
                    </div>
                    <div className="flex items-baseline gap-1 text-right">
                      <p className="text-lg font-bold text-foreground">
                        {calculateAdjustedHours(timecard).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">Adjusted Hours</p>
                    </div>
                    <div className="flex items-baseline gap-1 text-right">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${(timecard.total_pay || 0).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </>
                )}

                <Badge
                  variant="outline"
                  className={getStatusColor(timecard.status)}
                >
                  {getStatusText(timecard.status)}
                </Badge>
              </div>
            </div>

            {/* Mobile: Stats grid on separate row */}
            {showHeaderStats && (
              <div className="grid grid-cols-2 gap-3 sm:hidden">
                {/* Rate - Top Left on mobile */}
                <div className="text-center p-3 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground">Rate</p>
                  <p className="text-lg font-semibold text-foreground">
                    ${(timecard.pay_rate || 0).toFixed(0)}/h
                  </p>
                </div>

                {/* Hours - Top Right on mobile */}
                <div className="text-center p-3 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground">Hours</p>
                  <p className="text-lg font-bold text-foreground">
                    {(timecard.total_hours || 0).toFixed(1)}
                  </p>
                </div>

                {/* Adjusted Hours - Bottom Left on mobile */}
                <div className="text-center p-3 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">Adjusted Hours</p>
                  <p className="text-lg font-bold text-foreground">
                    {calculateAdjustedHours(timecard).toFixed(1)}
                  </p>
                </div>

                {/* Total - Bottom Right on mobile */}
                <div className="text-center p-3 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${(timecard.total_pay || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      )}

      {showTimecardHeader && (
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Timecard
          </CardTitle>
        </CardHeader>
      )}

      <CardContent>

        {/* Admin Notes Section - Full Display with Good Styling */}
        {timecard.admin_notes && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Admin Notes</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                  {timecard.admin_notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Week Info for Multi-Week Timecards - Navigation handled by desktop grid arrows */}
        {needsPagination && (!showBreakdownToggle || isExpanded) && (
          <div className="mb-4 flex items-center justify-center p-3 bg-muted/50 rounded-lg border lg:hidden">
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Week {currentWeekIndex + 1} of {totalWeeks}
              </span>
              {/* Show date range for current calendar week */}
              {(() => {
                const currentWeek = calendarWeeks[currentWeekIndex] || []
                const workingDaysInWeek = currentWeek.filter(entry => entry !== null)
                if (workingDaysInWeek.length > 0) {
                  const firstWorkingDay = workingDaysInWeek[0]
                  const lastWorkingDay = workingDaysInWeek[workingDaysInWeek.length - 1]
                  const startDate = safeFormat(firstWorkingDay.work_date, "MMM d", "")
                  const endDate = safeFormat(lastWorkingDay.work_date, "MMM d", "")
                  return (
                    <span className="text-xs text-muted-foreground">
                      {startDate === endDate ? startDate : `${startDate} - ${endDate}`}
                    </span>
                  )
                }
                return null
              })()}
              <div className="flex gap-1">
                {Array.from({ length: totalWeeks }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentWeekIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentWeekIndex 
                        ? 'bg-primary' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to week ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Breakdown Toggle Button - Hide for multi-day timecards since we always show all days */}
        {showBreakdownToggle && !timecard.is_multi_day && (
          <div className="flex justify-center mb-4 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="flex items-center gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Daily Breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show Daily Breakdown
                </>
              )}
            </Button>
          </div>
        )}

        {/* Time Details Section - Desktop uses desktop grid, mobile uses mobile grid */}
        {(timecard.check_in_time || timecard.daily_entries?.length > 0) && (!showBreakdownToggle || isExpanded) && (
          <>
            {/* Desktop: Use DesktopTimecardGrid (same as approve tab) */}
            {isDesktop && (
              <div className={showBreakdownToggle ? "pt-4" : ""}>
                <DesktopTimecardGrid
                  timecard={timecard}
                  isRejectionMode={isRejectionMode}
                  selectedFields={[]}
                  onFieldToggle={() => { }}
                  showHeader={false}
                  showRejectedFields={showRejectedFields}
                  fieldEdits={fieldEdits}
                  onFieldEdit={onFieldEdit}
                  currentWeekEntries={currentWeekEntries.filter(entry => entry !== null)} // Remove null entries for desktop grid
                  currentWeekIndex={currentWeekIndex}
                  totalWeeks={totalWeeks}
                  onWeekChange={setCurrentWeekIndex}
                  isCalendarWeekMode={true} // Enable calendar week mode for breakdown view
                />
              </div>
            )}



            {/* Rejection Comments - Only show for rejected timecards when details are expanded */}
            {timecard.status === 'rejected' && timecard.rejection_reason && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="w-4 h-4 text-red-700 dark:text-red-300 mt-0.5" />
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    Rejection Reason:
                  </p>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {timecard.rejection_reason}
                </p>
              </div>
            )}
          </>
        )}

      </CardContent>
        </Card>
      )}
    </div>
  )
}