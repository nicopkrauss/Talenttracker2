"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, DollarSign, AlertTriangle, FileText, Edit, Save, X, ChevronDown } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import { utcToDatetimeLocal, parseDate, formatDateSafe } from "@/lib/timezone-utils"
import { useAuth } from "@/lib/auth-context"
import { canApproveTimecardsWithSettings } from "@/lib/role-utils"
import { DesktopTimecardGrid } from "@/components/timecards/desktop-timecard-grid"
import { SimpleEditableField } from "@/components/timecards/simple-editable-field"

interface MultiDayTimecardDetailProps {
  timecard: Timecard
  isEditing?: boolean
  editedTimecard?: Partial<Timecard>
  calculatedValues?: {
    total_hours: number
    break_duration: number
    total_pay: number
  }
  onTimeChange?: (field: string, value: string) => void
  actionButtons?: React.ReactNode
  globalSettings?: any
  isRejectionMode?: boolean
  fieldEdits?: Record<string, any>
  onFieldEdit?: (fieldId: string, newValue: any) => void
  showRejectedFields?: boolean
}

export function MultiDayTimecardDetail({
  timecard,
  isEditing = false,
  editedTimecard = {},
  calculatedValues,
  onTimeChange,
  actionButtons,
  globalSettings,
  isRejectionMode = false,
  fieldEdits = {},
  onFieldEdit,
  showRejectedFields = false
}: MultiDayTimecardDetailProps) {
  const { userProfile } = useAuth()
  const [isEditingAdminNotes, setIsEditingAdminNotes] = useState(false)
  const [adminNotesValue, setAdminNotesValue] = useState(timecard.admin_notes || '')
  const [savingAdminNotes, setSavingAdminNotes] = useState(false)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)

  // Check if user can manage admin notes
  const canManageAdminNotes = userProfile ? canApproveTimecardsWithSettings(
    userProfile.role || null,
    globalSettings
  ) : false

  // Determine if this is a multi-day timecard based on actual data
  const isMultiDay = timecard.daily_entries && timecard.daily_entries.length > 1
  const workingDays = timecard.daily_entries?.length || 1

  // Desktop always uses calendar week layout (Sunday to Saturday)
  const dailyEntries = timecard.daily_entries || []
  const needsPagination = dailyEntries.length > 7

  // Group daily entries by calendar weeks (Sunday = 0, Saturday = 6) - always for desktop
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

      // Create 7-day week structure with empty slots for missing days
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
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    }

    return weeks
  }

  const weekChunks = getCalendarWeeks()
  const totalWeeks = weekChunks.length
  const currentWeekEntries = weekChunks[currentWeekIndex] || []

  // Reset to first week if current index is out of bounds
  useEffect(() => {
    if (currentWeekIndex >= totalWeeks && totalWeeks > 0) {
      setCurrentWeekIndex(0)
    }
  }, [currentWeekIndex, totalWeeks])

  // Helper function to safely format dates and times
  const formatDate = (dateValue: string | null | undefined, formatString: string, fallback: string = "Not Recorded") => {
    if (!dateValue) return fallback
    try {
      let date: Date | null

      // Check if it's a time-only value (HH:MM:SS format)
      if (/^\d{2}:\d{2}:\d{2}/.test(dateValue)) {
        // For time-only values, create a date with today's date
        const today = new Date().toISOString().split('T')[0]
        date = parseDate(`${today}T${dateValue}`)
      } else {
        // For date or datetime values, use safe parsing
        date = parseDate(dateValue)
      }

      if (!date || isNaN(date.getTime())) return fallback
      return format(date, formatString)
    } catch (error) {
      console.error('Date formatting error:', error, 'for value:', dateValue)
      return fallback
    }
  }

  // Helper functions for rejection mode
  const getFieldId = (fieldType: string, dayIndex?: number) => {
    if (dayIndex !== undefined) {
      return `${fieldType}_day_${dayIndex}`
    }
    return fieldType
  }

  const isFieldRejected = (fieldId: string) => {
    return showRejectedFields && timecard.rejected_fields && timecard.rejected_fields.includes(fieldId)
  }

  return (
    <div className="space-y-6 pt-4 sm:pt-0">
      {/* Responsive Timecard Display */}
      {timecard.daily_entries && timecard.daily_entries.length > 0 && (
        <>
          {/* Desktop Layout - Days as columns, categories as rows */}
          <div className="hidden lg:block">
            <DesktopTimecardGrid
              timecard={timecard}
              isRejectionMode={isRejectionMode}
              fieldEdits={fieldEdits}
              onFieldEdit={onFieldEdit}
              actionButtons={actionButtons}
              showSummaryInHeader={true}
              showRejectedFields={showRejectedFields}
              currentWeekEntries={currentWeekEntries.filter(entry => entry !== null)} // Remove null entries for desktop grid
              currentWeekIndex={currentWeekIndex}
              totalWeeks={totalWeeks}
              onWeekChange={setCurrentWeekIndex}
              isCalendarWeekMode={true} // Always use calendar week mode for desktop
            />
          </div>

          {/* Mobile Layout - Show all days without pagination */}
          <div className="lg:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span className="truncate">Daily Time Breakdown</span>
                  {isRejectionMode && (
                    <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-normal whitespace-nowrap">
                      (Tap to edit)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {dailyEntries.map((entry, entryIndex) => {

                    return (
                      <div key={`day-${entryIndex}`} className="space-y-4">
                        {/* Day Header */}
                        <div className="flex items-center justify-between pb-2">
                          <h3 className="text-sm font-medium text-foreground">
                            {formatDate(entry.work_date, "EEEE, MMM d, yyyy")}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{(entry.hours_worked || 0).toFixed(1)} hrs</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">${(entry.daily_pay || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Time Events Grid */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {/* Check In */}
                          <SimpleEditableField
                            fieldId={getFieldId('check_in_time', entryIndex)}
                            originalValue={entry.check_in_time || null}
                            label="Check In"
                            isRejectionMode={isRejectionMode}
                            fieldEdits={fieldEdits}
                            onFieldEdit={onFieldEdit || (() => { })}
                            allFieldValues={{
                              check_in_time: entry.check_in_time,
                              break_start_time: entry.break_start_time,
                              break_end_time: entry.break_end_time,
                              check_out_time: entry.check_out_time
                            }}
                            isRejected={isFieldRejected(getFieldId('check_in_time', entryIndex))}
                          />

                          {/* Break Start */}
                          <SimpleEditableField
                            fieldId={getFieldId('break_start_time', entryIndex)}
                            originalValue={entry.break_start_time || null}
                            label="Break Start"
                            isRejectionMode={isRejectionMode}
                            fieldEdits={fieldEdits}
                            onFieldEdit={onFieldEdit || (() => { })}
                            allFieldValues={{
                              check_in_time: entry.check_in_time,
                              break_start_time: entry.break_start_time,
                              break_end_time: entry.break_end_time,
                              check_out_time: entry.check_out_time
                            }}
                            isRejected={isFieldRejected(getFieldId('break_start_time', entryIndex))}
                          />

                          {/* Break End */}
                          <SimpleEditableField
                            fieldId={getFieldId('break_end_time', entryIndex)}
                            originalValue={entry.break_end_time || null}
                            label="Break End"
                            isRejectionMode={isRejectionMode}
                            fieldEdits={fieldEdits}
                            onFieldEdit={onFieldEdit || (() => { })}
                            allFieldValues={{
                              check_in_time: entry.check_in_time,
                              break_start_time: entry.break_start_time,
                              break_end_time: entry.break_end_time,
                              check_out_time: entry.check_out_time
                            }}
                            isRejected={isFieldRejected(getFieldId('break_end_time', entryIndex))}
                          />

                          {/* Check Out */}
                          <SimpleEditableField
                            fieldId={getFieldId('check_out_time', entryIndex)}
                            originalValue={entry.check_out_time || null}
                            label="Check Out"
                            isRejectionMode={isRejectionMode}
                            fieldEdits={fieldEdits}
                            onFieldEdit={onFieldEdit || (() => { })}
                            allFieldValues={{
                              check_in_time: entry.check_in_time,
                              break_start_time: entry.break_start_time,
                              break_end_time: entry.break_end_time,
                              check_out_time: entry.check_out_time
                            }}
                            isRejected={isFieldRejected(getFieldId('check_out_time', entryIndex))}
                          />
                        </div>

                        {/* Dividing line between days (except for last entry) */}
                        {entryIndex < dailyEntries.length - 1 && (
                          <div className="border-t border-border my-6"></div>
                        )}
                      </div>
                    )
                  })}

                  {/* Mobile: Time Summary Stats at bottom of Daily Time Breakdown */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Time Summary</h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="text-center p-3 bg-card rounded-lg border">
                        <p className="text-sm text-muted-foreground">Rate</p>
                        <p className="text-lg font-semibold text-foreground">
                          ${(timecard.pay_rate || 0).toFixed(0)}/h
                        </p>
                      </div>

                      <div className="text-center p-3 bg-card rounded-lg border">
                        <p className="text-sm text-muted-foreground">Break</p>
                        <p className="text-lg font-bold text-foreground">
                          {Math.round((timecard.break_duration || 0))} min
                        </p>
                      </div>

                      <div className="text-center p-3 bg-card rounded-lg border">
                        <p className="text-sm text-muted-foreground">Hours</p>
                        <p className="text-lg font-bold text-foreground">
                          {(timecard.total_hours || 0).toFixed(1)}
                        </p>
                      </div>

                      <div className="text-center p-3 bg-card rounded-lg border">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${(timecard.total_pay || 0).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  {actionButtons && (
                    <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-border">
                      {actionButtons}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Representative Schedule (for multi-day) or Actual Times (for single day) */}
      {(timecard.check_in_time || timecard.check_out_time || !timecard.daily_entries || timecard.daily_entries.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                {isMultiDay ? 'Representative Daily Schedule' : 'Time Details'}
              </div>
              {actionButtons && (
                <div className="flex items-center space-x-2">
                  {actionButtons}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMultiDay && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">Multi-Day Timecard</p>
                    <p className="text-muted-foreground">
                      The times shown below represent a typical day from this {workingDays}-day work period.
                      Actual daily schedules may have varied.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Date Header */}
            <div className="text-center pb-2 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">
                {isMultiDay
                  ? `Typical Day (${workingDays}-day period starting ${formatDate(timecard.date, "MMM d, yyyy")})`
                  : formatDate(timecard.date, "EEEE, MMMM d, yyyy")
                }
              </h3>
            </div>

            {/* Time Events Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Check In */}
              {isEditing && onTimeChange ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Check In</label>
                  <Input
                    type="datetime-local"
                    value={utcToDatetimeLocal(editedTimecard.check_in_time || null)}
                    onChange={(e) => onTimeChange('check_in_time', e.target.value)}
                    className="text-sm"
                  />
                </div>
              ) : (
                <SimpleEditableField
                  fieldId="check_in_time"
                  originalValue={timecard.check_in_time || null}
                  label={isMultiDay ? 'Typical Check In' : 'Check In'}
                  isRejectionMode={isRejectionMode}
                  fieldEdits={fieldEdits}
                  onFieldEdit={onFieldEdit || (() => { })}
                  allFieldValues={{
                    check_in_time: timecard.check_in_time,
                    break_start_time: timecard.break_start_time,
                    break_end_time: timecard.break_end_time,
                    check_out_time: timecard.check_out_time
                  }}
                  isRejected={isFieldRejected('check_in_time')}
                />
              )}

              {/* Break Start */}
              {isEditing && onTimeChange ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Break Start</label>
                  <Input
                    type="datetime-local"
                    value={utcToDatetimeLocal(editedTimecard.break_start_time || null)}
                    onChange={(e) => onTimeChange('break_start_time', e.target.value)}
                    className="text-sm"
                    placeholder="Optional"
                  />
                </div>
              ) : (
                <SimpleEditableField
                  fieldId="break_start_time"
                  originalValue={timecard.break_start_time || null}
                  label={isMultiDay ? 'Typical Break Start' : 'Break Start'}
                  isRejectionMode={isRejectionMode}
                  fieldEdits={fieldEdits}
                  onFieldEdit={onFieldEdit || (() => { })}
                  allFieldValues={{
                    check_in_time: timecard.check_in_time,
                    break_start_time: timecard.break_start_time,
                    break_end_time: timecard.break_end_time,
                    check_out_time: timecard.check_out_time
                  }}
                  isRejected={isFieldRejected('break_start_time')}
                />
              )}

              {/* Break End */}
              {isEditing && onTimeChange ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Break End</label>
                  <Input
                    type="datetime-local"
                    value={utcToDatetimeLocal(editedTimecard.break_end_time || null)}
                    onChange={(e) => onTimeChange('break_end_time', e.target.value)}
                    className="text-sm"
                    placeholder="Optional"
                  />
                </div>
              ) : (
                <SimpleEditableField
                  fieldId="break_end_time"
                  originalValue={timecard.break_end_time || null}
                  label={isMultiDay ? 'Typical Break End' : 'Break End'}
                  isRejectionMode={isRejectionMode}
                  fieldEdits={fieldEdits}
                  onFieldEdit={onFieldEdit || (() => { })}
                  allFieldValues={{
                    check_in_time: timecard.check_in_time,
                    break_start_time: timecard.break_start_time,
                    break_end_time: timecard.break_end_time,
                    check_out_time: timecard.check_out_time
                  }}
                  isRejected={isFieldRejected('break_end_time')}
                />
              )}

              {/* Check Out */}
              {isEditing && onTimeChange ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                  <Input
                    type="datetime-local"
                    value={utcToDatetimeLocal(editedTimecard.check_out_time || null)}
                    onChange={(e) => onTimeChange('check_out_time', e.target.value)}
                    className="text-sm"
                  />
                </div>
              ) : (
                <SimpleEditableField
                  fieldId="check_out_time"
                  originalValue={timecard.check_out_time || null}
                  label={isMultiDay ? 'Typical Check Out' : 'Check Out'}
                  isRejectionMode={isRejectionMode}
                  fieldEdits={fieldEdits}
                  onFieldEdit={onFieldEdit || (() => { })}
                  allFieldValues={{
                    check_in_time: timecard.check_in_time,
                    break_start_time: timecard.break_start_time,
                    break_end_time: timecard.break_end_time,
                    check_out_time: timecard.check_out_time
                  }}
                  isRejected={isFieldRejected('check_out_time')}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User-Facing Edit Comments - Only show if there are comments */}
      {timecard.edit_comments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Edit Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                {timecard.edit_comments}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Comments - Only show for rejected timecards */}
      {timecard.status === 'rejected' && timecard.rejection_reason && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
              Rejection Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {timecard.rejection_reason}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}