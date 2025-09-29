"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, DollarSign, AlertTriangle, FileText, Edit, Save, X, Bug, ChevronDown, ChevronUp } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import { utcToDatetimeLocal, parseDate, formatDateSafe } from "@/lib/timezone-utils"
import { useAuth } from "@/lib/auth-context"
import { canApproveTimecardsWithSettings } from "@/lib/role-utils"
import { DesktopTimecardGrid } from "@/components/timecards/desktop-timecard-grid"

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
  selectedFields?: string[]
  onFieldToggle?: (fieldId: string) => void
  showRejectedFields?: boolean
  showDebugInfo?: boolean
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
  selectedFields = [],
  onFieldToggle,
  showRejectedFields = false,
  showDebugInfo = false
}: MultiDayTimecardDetailProps) {
  const { userProfile } = useAuth()
  const [isEditingAdminNotes, setIsEditingAdminNotes] = useState(false)
  const [adminNotesValue, setAdminNotesValue] = useState(timecard.admin_notes || '')
  const [savingAdminNotes, setSavingAdminNotes] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null)

  // Check if user can manage admin notes
  const canManageAdminNotes = userProfile ? canApproveTimecardsWithSettings(
    userProfile.role || null,
    globalSettings
  ) : false

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

  const saveAdminNotes = async () => {
    setSavingAdminNotes(true)
    try {
      const response = await fetch('/api/timecards/admin-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecard.id,
          adminNotes: adminNotesValue.trim()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save admin notes')
      }

      // Update the timecard object
      timecard.admin_notes = adminNotesValue.trim()
      setIsEditingAdminNotes(false)
    } catch (error) {
      console.error('Error saving admin notes:', error)
      // Reset to original value on error
      setAdminNotesValue(timecard.admin_notes || '')
    } finally {
      setSavingAdminNotes(false)
    }
  }

  const cancelAdminNotesEdit = () => {
    setAdminNotesValue(timecard.admin_notes || '')
    setIsEditingAdminNotes(false)
  }

  // Debug functionality
  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true)
    setAuditLogsError(null)
    try {
      const response = await fetch(`/api/timecards/${timecard.id}/audit-logs`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.auditLogs || [])
        setAuditLogsError(null)
      } else {
        const errorMessage = `API Error ${response.status}: ${response.statusText}`
        console.error('Failed to load audit logs:', errorMessage)
        // Try to get the error details from the response
        try {
          const errorData = await response.json()
          console.error('API error details:', errorData)
          setAuditLogsError(`${errorMessage} - ${errorData.error || 'Unknown error'}`)
        } catch (e) {
          console.error('Could not parse error response')
          setAuditLogsError(errorMessage)
        }
        setAuditLogs([])
      }
    } catch (error) {
      const errorMessage = `Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('Error loading audit logs:', error)
      setAuditLogsError(errorMessage)
      setAuditLogs([])
    } finally {
      setLoadingAuditLogs(false)
    }
  }

  useEffect(() => {
    if (showDebugPanel && auditLogs.length === 0) {
      loadAuditLogs()
    }
  }, [showDebugPanel, timecard.id])

  const formatAuditLogTime = (timestamp: string | Date) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
      return format(date, "MMM d, yyyy 'at' h:mm:ss a")
    } catch (error) {
      return String(timestamp)
    }
  }
  // Determine if this is a multi-day timecard based on actual data
  const isMultiDay = timecard.daily_entries && timecard.daily_entries.length > 1
  const workingDays = timecard.daily_entries?.length || 1
  
  // Extract description and pattern from admin_notes for display (optional)
  const extractDisplayInfo = (notes: string | undefined) => {
    if (!notes) return { description: '', pattern: '' }
    
    // Extract the pattern description
    const descriptionMatch = notes.match(/^([^-]+) - /)
    const description = descriptionMatch ? descriptionMatch[1].trim() : ''
    
    // Extract pattern name from parentheses
    const patternMatch = notes.match(/\(([^)]+)\)/)
    const pattern = patternMatch ? patternMatch[1] : ''
    
    return { description, pattern }
  }

  const { description, pattern } = extractDisplayInfo(timecard.admin_notes)

  // Helper functions for rejection mode
  const getFieldId = (fieldType: string, dayIndex?: number) => {
    if (dayIndex !== undefined) {
      return `${fieldType}_day_${dayIndex}`
    }
    return fieldType
  }

  const isFieldSelected = (fieldId: string) => {
    return isRejectionMode && selectedFields.includes(fieldId)
  }

  const handleFieldClick = (fieldId: string) => {
    if (isRejectionMode && onFieldToggle) {
      onFieldToggle(fieldId)
    }
  }

  const isFieldRejected = (fieldId: string) => {
    return showRejectedFields && timecard.rejected_fields && timecard.rejected_fields.includes(fieldId)
  }

  const isDayRejected = (dayIndex: number) => {
    if (!showRejectedFields || !timecard.rejected_fields) return false
    
    const dayFieldIds = [
      getFieldId('check_in_time', dayIndex),
      getFieldId('break_start_time', dayIndex),
      getFieldId('break_end_time', dayIndex),
      getFieldId('check_out_time', dayIndex)
    ]
    
    return dayFieldIds.every(fieldId => timecard.rejected_fields!.includes(fieldId))
  }
  
  // Calculate average values for multi-day timecards
  const avgHoursPerDay = isMultiDay ? (timecard.total_hours || 0) / workingDays : (timecard.total_hours || 0)
  const avgPayPerDay = isMultiDay ? (timecard.total_pay || 0) / workingDays : (timecard.total_pay || 0)
  const avgBreakPerDay = isMultiDay ? (timecard.break_duration || 0) / workingDays : (timecard.break_duration || 0)

  return (
    <div className="space-y-6 pt-4 sm:pt-0">
      {/* Multi-Day Overview */}
      {isMultiDay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Multi-Day Work Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">Working Days</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{workingDays}</p>
                <p className="text-xs text-muted-foreground">days worked</p>
              </div>

              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">Avg Hours/Day</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{avgHoursPerDay.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">hours per day</p>
              </div>

              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">Avg Break/Day</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{Math.round(avgBreakPerDay)}</p>
                <p className="text-xs text-muted-foreground">minutes per day</p>
              </div>

              <div className="text-center p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">Avg Pay/Day</span>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">${avgPayPerDay.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">per working day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Responsive Timecard Display */}
      {timecard.daily_entries && timecard.daily_entries.length > 0 && (
        <>
          {/* Desktop Layout - Days as columns, categories as rows */}
          <div className="hidden lg:block">
            <DesktopTimecardGrid
              timecard={timecard}
              isRejectionMode={isRejectionMode}
              selectedFields={selectedFields}
              onFieldToggle={onFieldToggle}
              actionButtons={actionButtons}
              showSummaryInHeader={true}
              showRejectedFields={showRejectedFields}
            />
          </div>

          {/* Mobile Layout - Keep existing format */}
          <div className="lg:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Daily Time Breakdown
                    <span className={`ml-2 text-sm text-red-600 dark:text-red-400 font-normal transition-opacity ${
                      isRejectionMode ? 'opacity-100' : 'opacity-0'
                    }`}>
                      (Click fields to flag issues)
                    </span>
                  </div>
                  {actionButtons && (
                    <div className="flex items-center space-x-2">
                      {actionButtons}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {timecard.daily_entries.map((entry, index) => (
                    <div key={index} className="space-y-4">
                      {/* Day Header - Clickable in rejection mode */}
                      {(() => {
                        // Check if all fields for this day are selected
                        const dayFieldIds = [
                          getFieldId('check_in_time', index),
                          getFieldId('break_start_time', index),
                          getFieldId('break_end_time', index),
                          getFieldId('check_out_time', index)
                        ]
                        const allDayFieldsSelected = dayFieldIds.every(fieldId => isFieldSelected(fieldId))
                        
                        const handleDayClick = () => {
                          if (isRejectionMode && onFieldToggle) {
                            if (allDayFieldsSelected) {
                              // If all fields are selected, deselect them
                              dayFieldIds.forEach(fieldId => onFieldToggle(fieldId))
                            } else {
                              // If not all fields are selected, select all of them
                              dayFieldIds.forEach(fieldId => {
                                if (!isFieldSelected(fieldId)) {
                                  onFieldToggle(fieldId)
                                }
                              })
                            }
                          }
                        }

                        return (
                          <div 
                            className={`flex items-center justify-between pb-2 transition-all ${
                              isRejectionMode 
                                ? allDayFieldsSelected
                                  ? 'p-2 -m-2 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                                  : 'p-2 -m-2 rounded-lg hover:bg-muted/50 cursor-pointer'
                                : isDayRejected(index)
                                  ? 'p-2 -m-2 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/20'
                                  : ''
                            }`}
                            onClick={handleDayClick}
                          >
                            <h3 className="text-sm font-medium text-foreground">
                              Day {index + 1} - {formatDate(entry.work_date, "EEEE, MMM d, yyyy")}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{(entry.hours_worked || 0).toFixed(1)} hrs</span>
                              <span>${(entry.daily_pay || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Time Events Grid - matching timecards page format */}
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Check In */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Check In</label>
                          <div 
                            className={`p-3 rounded-lg border transition-all ${
                              isFieldSelected(getFieldId('check_in_time', index))
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                                : isFieldRejected(getFieldId('check_in_time', index))
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                  : isRejectionMode
                                    ? 'border-border bg-card hover:border-white cursor-pointer'
                                    : 'border-border bg-card'
                            }`}
                            onClick={() => handleFieldClick(getFieldId('check_in_time', index))}
                          >
                            <p className="text-lg font-semibold text-foreground">
                              {formatDate(entry.check_in_time, "h:mm a", "Not Recorded")}
                            </p>
                          </div>
                        </div>

                        {/* Break Start */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Break Start</label>
                          <div 
                            className={`p-3 rounded-lg border transition-all ${
                              isFieldSelected(getFieldId('break_start_time', index))
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                                : isFieldRejected(getFieldId('break_start_time', index))
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                  : isRejectionMode
                                    ? entry.break_start_time 
                                      ? 'border-border bg-card hover:border-white cursor-pointer'
                                      : 'border-dashed border-muted-foreground/30 bg-muted/30 hover:border-white cursor-pointer'
                                    : entry.break_start_time 
                                      ? 'border-border bg-card' 
                                      : 'border-dashed border-muted-foreground/30 bg-muted/30'
                            }`}
                            onClick={() => handleFieldClick(getFieldId('break_start_time', index))}
                          >
                            {entry.break_start_time ? (
                              <p className="text-lg font-semibold text-foreground">
                                {formatDate(entry.break_start_time, "h:mm a")}
                              </p>
                            ) : (
                              <p className="text-lg font-semibold text-muted-foreground">Not Recorded</p>
                            )}
                          </div>
                        </div>

                        {/* Break End */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Break End</label>
                          <div 
                            className={`p-3 rounded-lg border transition-all ${
                              isFieldSelected(getFieldId('break_end_time', index))
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                                : isFieldRejected(getFieldId('break_end_time', index))
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                  : isRejectionMode
                                    ? entry.break_end_time 
                                      ? 'border-border bg-card hover:border-white cursor-pointer'
                                      : 'border-dashed border-muted-foreground/30 bg-muted/30 hover:border-white cursor-pointer'
                                    : entry.break_end_time 
                                      ? 'border-border bg-card' 
                                      : 'border-dashed border-muted-foreground/30 bg-muted/30'
                            }`}
                            onClick={() => handleFieldClick(getFieldId('break_end_time', index))}
                          >
                            {entry.break_end_time ? (
                              <p className="text-lg font-semibold text-foreground">
                                {formatDate(entry.break_end_time, "h:mm a")}
                              </p>
                            ) : (
                              <p className="text-lg font-semibold text-muted-foreground">Not Recorded</p>
                            )}
                          </div>
                        </div>

                        {/* Check Out */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                          <div 
                            className={`p-3 rounded-lg border transition-all ${
                              isFieldSelected(getFieldId('check_out_time', index))
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                                : isFieldRejected(getFieldId('check_out_time', index))
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                  : isRejectionMode
                                    ? 'border-border bg-card hover:border-white cursor-pointer'
                                    : 'border-border bg-card'
                            }`}
                            onClick={() => handleFieldClick(getFieldId('check_out_time', index))}
                          >
                            <p className="text-lg font-semibold text-foreground">
                              {formatDate(entry.check_out_time, "h:mm a", "Not Recorded")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Dividing line between days (except for last entry) */}
                      {index < timecard.daily_entries.length - 1 && (
                        <div className="border-t border-border my-6"></div>
                      )}
                    </div>
                  ))}

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
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}



      {/* Representative Schedule (for multi-day) or Actual Times (for single day) */}
      {/* Show this section if we have main timecard times OR if we don't have daily entries */}
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {isEditing 
                    ? 'Check In' 
                    : isMultiDay 
                      ? 'Typical Check In' 
                      : 'Check In'
                  }
                </label>
                <div 
                  className={`p-3 rounded-lg border transition-all ${
                    isFieldSelected('check_in_time')
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                      : isFieldRejected('check_in_time')
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : isRejectionMode
                          ? 'border-border bg-card hover:border-white cursor-pointer'
                          : 'border-border bg-card'
                  }`}
                  onClick={() => handleFieldClick('check_in_time')}
                >
                  {isEditing && onTimeChange ? (
                    <Input
                      type="datetime-local"
                      value={utcToDatetimeLocal(editedTimecard.check_in_time || null)}
                      onChange={(e) => onTimeChange('check_in_time', e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-foreground">
                      {formatDate(timecard.check_in_time, "h:mm a")}
                    </p>
                  )}
                </div>
              </div>

              {/* Break Start */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {isEditing 
                    ? 'Break Start' 
                    : isMultiDay 
                      ? 'Typical Break Start' 
                      : 'Break Start'
                  }
                </label>
                <div 
                  className={`p-3 rounded-lg border transition-all ${
                    isFieldSelected('break_start_time')
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                      : isFieldRejected('break_start_time')
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : isRejectionMode
                          ? (isEditing ? editedTimecard.break_start_time : timecard.break_start_time) 
                            ? 'border-border bg-card hover:border-white cursor-pointer'
                            : 'border-dashed border-muted-foreground/30 bg-muted/30 hover:border-white cursor-pointer'
                          : (isEditing ? editedTimecard.break_start_time : timecard.break_start_time) 
                            ? 'border-border bg-card' 
                            : 'border-dashed border-muted-foreground/30 bg-muted/30'
                  }`}
                  onClick={() => handleFieldClick('break_start_time')}
                >
                  {isEditing && onTimeChange ? (
                    <Input
                      type="datetime-local"
                      value={utcToDatetimeLocal(editedTimecard.break_start_time || null)}
                      onChange={(e) => onTimeChange('break_start_time', e.target.value)}
                      className="text-sm"
                      placeholder="Optional"
                    />
                  ) : timecard.break_start_time ? (
                    <p className="text-lg font-semibold text-foreground">
                      {formatDate(timecard.break_start_time, "h:mm a")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Recorded</p>
                  )}
                </div>
              </div>

              {/* Break End */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {isEditing 
                    ? 'Break End' 
                    : isMultiDay 
                      ? 'Typical Break End' 
                      : 'Break End'
                  }
                </label>
                <div 
                  className={`p-3 rounded-lg border transition-all ${
                    isFieldSelected('break_end_time')
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                      : isFieldRejected('break_end_time')
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : isRejectionMode
                          ? (isEditing ? editedTimecard.break_end_time : timecard.break_end_time) 
                            ? 'border-border bg-card hover:border-white cursor-pointer'
                            : 'border-dashed border-muted-foreground/30 bg-muted/30 hover:border-white cursor-pointer'
                          : (isEditing ? editedTimecard.break_end_time : timecard.break_end_time) 
                            ? 'border-border bg-card' 
                            : 'border-dashed border-muted-foreground/30 bg-muted/30'
                  }`}
                  onClick={() => handleFieldClick('break_end_time')}
                >
                  {isEditing && onTimeChange ? (
                    <Input
                      type="datetime-local"
                      value={utcToDatetimeLocal(editedTimecard.break_end_time || null)}
                      onChange={(e) => onTimeChange('break_end_time', e.target.value)}
                      className="text-sm"
                      placeholder="Optional"
                    />
                  ) : timecard.break_end_time ? (
                    <p className="text-lg font-semibold text-foreground">
                      {formatDate(timecard.break_end_time, "h:mm a")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Recorded</p>
                  )}
                </div>
              </div>

              {/* Check Out */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {isEditing 
                    ? 'Check Out' 
                    : isMultiDay 
                      ? 'Typical Check Out' 
                      : 'Check Out'
                  }
                </label>
                <div 
                  className={`p-3 rounded-lg border transition-all ${
                    isFieldSelected('check_out_time')
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 cursor-pointer'
                      : isFieldRejected('check_out_time')
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : isRejectionMode
                          ? 'border-border bg-card hover:border-white cursor-pointer'
                          : 'border-border bg-card'
                  }`}
                  onClick={() => handleFieldClick('check_out_time')}
                >
                  {isEditing && onTimeChange ? (
                    <Input
                      type="datetime-local"
                      value={utcToDatetimeLocal(editedTimecard.check_out_time || null)}
                      onChange={(e) => onTimeChange('check_out_time', e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-foreground">
                      {formatDate(timecard.check_out_time, "h:mm a")}
                    </p>
                  )}
                </div>
              </div>
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

      {/* Debug Panel - Only show if showDebugInfo is true */}
      {showDebugInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Bug className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                Debug Information
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="text-purple-600 dark:text-purple-400"
              >
                {showDebugPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          {showDebugPanel && (
            <CardContent className="space-y-4">
              {/* Timecard Raw Data */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Timecard Raw Data</h4>
                <div className="p-3 bg-muted rounded-lg">
                  <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(timecard, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Audit Logs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Audit Logs</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAuditLogs}
                    disabled={loadingAuditLogs}
                  >
                    {loadingAuditLogs ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="p-3 bg-muted rounded-lg text-center text-sm">
                      {loadingAuditLogs ? (
                        <span className="text-muted-foreground">Loading audit logs...</span>
                      ) : auditLogsError ? (
                        <div className="text-red-600 dark:text-red-400">
                          <div className="font-medium">Failed to load audit logs</div>
                          <div className="text-xs mt-1">{auditLogsError}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No audit logs found</span>
                      )}
                    </div>
                  ) : (
                    auditLogs.map((log, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={
                            log.action_type === 'status_change' ? 'default' :
                            log.action_type === 'admin_edit' ? 'secondary' :
                            log.action_type === 'rejection_edit' ? 'destructive' :
                            log.action_type === 'user_edit' ? 'outline' :
                            'outline'
                          }>
                            {log.action_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatAuditLogTime(log.changed_at)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">
                            {log.field_name ? `${log.field_name} changed` : 'Status change'}
                          </p>
                          {log.old_value && log.new_value && (
                            <div className="mt-1 text-xs">
                              <span className="text-red-600 dark:text-red-400">From: {log.old_value}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-600 dark:text-green-400">To: {log.new_value}</span>
                            </div>
                          )}
                          {log.changed_by_profile?.full_name && (
                            <p className="text-muted-foreground mt-1">by {log.changed_by_profile.full_name}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Rejected Fields Debug */}
              {timecard.rejected_fields && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Rejected Fields</h4>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <pre className="text-xs text-foreground whitespace-pre-wrap">
                      {JSON.stringify(timecard.rejected_fields, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Current State Debug */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Component State</h4>
                <div className="p-3 bg-muted rounded-lg">
                  <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify({
                      isRejectionMode,
                      selectedFields,
                      showRejectedFields,
                      isEditing,
                      editedTimecard,
                      calculatedValues
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}