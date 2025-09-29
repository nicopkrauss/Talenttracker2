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
import { parseDate, formatDateSafe } from "@/lib/timezone-utils"

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
  onFieldEdit
}: MultiDayTimecardDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

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
                        10
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
                    10
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

        {/* Time Details Section - Desktop uses grid, mobile uses existing format */}
        {(timecard.check_in_time || timecard.daily_entries?.length > 0) && (!showBreakdownToggle || isExpanded) && (
          <div className={showBreakdownToggle ? "pt-4" : ""}>
            {/* Desktop: Use DesktopTimecardGrid (same as approve tab) */}
            <div className="hidden lg:block">
              <DesktopTimecardGrid
                timecard={timecard}
                isRejectionMode={isRejectionMode}
                selectedFields={[]}
                onFieldToggle={() => { }}
                showHeader={false}
                showRejectedFields={showRejectedFields}
                fieldEdits={fieldEdits}
                onFieldEdit={onFieldEdit}
              />
            </div>

            {/* Mobile: Keep existing format */}
            <div className="lg:hidden space-y-4">
              {/* First Day (always shown) */}
              <div className="space-y-1">
                <div className={`${isFirstDayRejected()
                  ? 'p-2 -m-2 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/20'
                  : ''
                  }`}>
                  <h3 className="text-lg font-semibold text-foreground">
                    {safeFormat(timecard.date, "MMM d, yyyy")}
                  </h3>
                </div>

                {/* Time Events Grid - using EditableTimeField components */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  <SimpleEditableField
                    fieldId={isMultiDay ? getFieldId('check_in_time', 0) : "check_in_time"}
                    originalValue={isMultiDay ? (dailyEntries[0]?.check_in_time || null) : (timecard.check_in_time || null)}
                    label="Check In"
                    isRejectionMode={isRejectionMode}
                    fieldEdits={fieldEdits}
                    onFieldEdit={onFieldEdit || (() => {})}
                    allFieldValues={{
                      check_in_time: isMultiDay ? dailyEntries[0]?.check_in_time : timecard.check_in_time,
                      break_start_time: isMultiDay ? dailyEntries[0]?.break_start_time : timecard.break_start_time,
                      break_end_time: isMultiDay ? dailyEntries[0]?.break_end_time : timecard.break_end_time,
                      check_out_time: isMultiDay ? dailyEntries[0]?.check_out_time : timecard.check_out_time
                    }}
                    isRejected={isFieldRejected(isMultiDay ? getFieldId('check_in_time', 0) : "check_in_time")}
                  />
                  <SimpleEditableField
                    fieldId={isMultiDay ? getFieldId('break_start_time', 0) : "break_start_time"}
                    originalValue={isMultiDay ? (dailyEntries[0]?.break_start_time || null) : (timecard.break_start_time || null)}
                    label="Break Start"
                    isRejectionMode={isRejectionMode}
                    fieldEdits={fieldEdits}
                    onFieldEdit={onFieldEdit || (() => {})}
                    allFieldValues={{
                      check_in_time: isMultiDay ? dailyEntries[0]?.check_in_time : timecard.check_in_time,
                      break_start_time: isMultiDay ? dailyEntries[0]?.break_start_time : timecard.break_start_time,
                      break_end_time: isMultiDay ? dailyEntries[0]?.break_end_time : timecard.break_end_time,
                      check_out_time: isMultiDay ? dailyEntries[0]?.check_out_time : timecard.check_out_time
                    }}
                    isRejected={isFieldRejected(isMultiDay ? getFieldId('break_start_time', 0) : "break_start_time")}
                  />
                  <SimpleEditableField
                    fieldId={isMultiDay ? getFieldId('break_end_time', 0) : "break_end_time"}
                    originalValue={isMultiDay ? (dailyEntries[0]?.break_end_time || null) : (timecard.break_end_time || null)}
                    label="Break End"
                    isRejectionMode={isRejectionMode}
                    fieldEdits={fieldEdits}
                    onFieldEdit={onFieldEdit || (() => {})}
                    allFieldValues={{
                      check_in_time: isMultiDay ? dailyEntries[0]?.check_in_time : timecard.check_in_time,
                      break_start_time: isMultiDay ? dailyEntries[0]?.break_start_time : timecard.break_start_time,
                      break_end_time: isMultiDay ? dailyEntries[0]?.break_end_time : timecard.break_end_time,
                      check_out_time: isMultiDay ? dailyEntries[0]?.check_out_time : timecard.check_out_time
                    }}
                    isRejected={isFieldRejected(isMultiDay ? getFieldId('break_end_time', 0) : "break_end_time")}
                  />
                  <SimpleEditableField
                    fieldId={isMultiDay ? getFieldId('check_out_time', 0) : "check_out_time"}
                    originalValue={isMultiDay ? (dailyEntries[0]?.check_out_time || null) : (timecard.check_out_time || null)}
                    label="Check Out"
                    isRejectionMode={isRejectionMode}
                    fieldEdits={fieldEdits}
                    onFieldEdit={onFieldEdit || (() => {})}
                    allFieldValues={{
                      check_in_time: isMultiDay ? dailyEntries[0]?.check_in_time : timecard.check_in_time,
                      break_start_time: isMultiDay ? dailyEntries[0]?.break_start_time : timecard.break_start_time,
                      break_end_time: isMultiDay ? dailyEntries[0]?.break_end_time : timecard.break_end_time,
                      check_out_time: isMultiDay ? dailyEntries[0]?.check_out_time : timecard.check_out_time
                    }}
                    isRejected={isFieldRejected(isMultiDay ? getFieldId('check_out_time', 0) : "check_out_time")}
                  />
                </div>
              </div>

              {/* Additional Days (when expanded) */}
              {isMultiDay && isExpanded && dailyEntries.length > 1 && (
                <div className="space-y-0">
                  {dailyEntries.slice(1).map((entry, index) => {
                    const dayNumber = index + 2

                    return (
                      <div key={`day-${dayNumber}`} className="space-y-1">
                        {/* Dividing line between days */}
                        <div className="border-t border-border my-4"></div>

                        <div className={`${isDayRejected(index + 1)
                          ? 'p-2 -m-2 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/20'
                          : ''
                          }`}>
                          <h3 className="text-lg font-semibold text-foreground">
                            {safeFormat(entry.work_date, "MMM d, yyyy")}
                          </h3>
                        </div>

                        {/* Time grid for this specific day - using EditableTimeField components */}
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                          <SimpleEditableField
                            fieldId={getFieldId('check_in_time', index + 1)}
                            originalValue={entry.check_in_time || null}
                            label="Check In"
                            isRejectionMode={isRejectionMode}
                            fieldEdits={fieldEdits}
                            onFieldEdit={onFieldEdit || (() => {})}
                            allFieldValues={{
                              check_in_time: entry.check_in_time,
                              break_start_time: entry.break_start_time,
                              break_end_time: entry.break_end_time,
                              check_out_time: entry.check_out_time
                            }}
                            isRejected={isFieldRejected(getFieldId('check_in_time', index + 1))}
                          />
                          <SimpleEditableField
                            fieldId={getFieldId('break_start_time', index + 1)}
                            originalValue={entry.break_start_time || null}
                            label="Break Start"
                            isRejectionMode={isRejectionMode}
                            fieldEdits={fieldEdits}
                            onFieldEdit={onFieldEdit || (() => {})}
                            allFieldValues={{
                              check_in_time: entry.check_in_time,
                              break_start_time: entry.break_start_time,
                              break_end_time: entry.break_end_time,
                              check_out_time: entry.check_out_time
                            }}
                            isRejected={isFieldRejected(getFieldId('break_start_time', index + 1))}
                          />
                          <SimpleEditableField
                            fieldId={getFieldId('break_end_time', index + 1)}
                            originalValue={entry.break_end_time || null}
                            label="Break End"
                            isRejectionMode={isRejectionMode}
                            fieldEdits={fieldEdits}
                            onFieldEdit={onFieldEdit || (() => {})}
                            allFieldValues={{
                              check_in_time: entry.check_in_time,
                              break_start_time: entry.break_start_time,
                              break_end_time: entry.break_end_time,
                              check_out_time: entry.check_out_time
                            }}
                            isRejected={isFieldRejected(getFieldId('break_end_time', index + 1))}
                          />
                          <SimpleEditableField
                            fieldId={getFieldId('check_out_time', index + 1)}
                            originalValue={entry.check_out_time || null}
                            label="Check Out"
                            isRejectionMode={isRejectionMode}
                            fieldEdits={fieldEdits}
                            onFieldEdit={onFieldEdit || (() => {})}
                            allFieldValues={{
                              check_in_time: entry.check_in_time,
                              break_start_time: entry.break_start_time,
                              break_end_time: entry.break_end_time,
                              check_out_time: entry.check_out_time
                            }}
                            isRejected={isFieldRejected(getFieldId('check_out_time', index + 1))}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

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
          </div>
        )}

      </CardContent>
    </Card>
  )
}