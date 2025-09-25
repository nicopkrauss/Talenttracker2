"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, DollarSign, AlertTriangle, FileText, Edit, Save, X } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { format } from "date-fns"
import { utcToDatetimeLocal } from "@/lib/timezone-utils"
import { useAuth } from "@/lib/auth-context"
import { canApproveTimecardsWithSettings } from "@/lib/role-utils"

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
}

export function MultiDayTimecardDetail({ 
  timecard, 
  isEditing = false, 
  editedTimecard = {}, 
  calculatedValues,
  onTimeChange,
  actionButtons,
  globalSettings
}: MultiDayTimecardDetailProps) {
  const { userProfile } = useAuth()
  const [isEditingAdminNotes, setIsEditingAdminNotes] = useState(false)
  const [adminNotesValue, setAdminNotesValue] = useState(timecard.admin_notes || '')
  const [savingAdminNotes, setSavingAdminNotes] = useState(false)

  // Check if user can manage admin notes
  const canManageAdminNotes = userProfile ? canApproveTimecardsWithSettings(
    userProfile.role || null,
    globalSettings
  ) : false

  // Helper function to safely format dates and times
  const formatDate = (dateValue: string | null | undefined, formatString: string, fallback: string = "Not Recorded") => {
    if (!dateValue) return fallback
    try {
      let date: Date
      
      // Check if it's a time-only value (HH:MM:SS format)
      if (/^\d{2}:\d{2}:\d{2}/.test(dateValue)) {
        // For time-only values, create a date with today's date
        const today = new Date().toISOString().split('T')[0]
        date = new Date(`${today}T${dateValue}`)
      } else {
        // For full datetime values
        date = new Date(dateValue)
      }
      
      if (isNaN(date.getTime())) return fallback
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

      {/* Time Summary - Enhanced for Multi-Day */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            {isEditing 
              ? 'Time Summary (Editing)' 
              : isMultiDay 
                ? 'Total Time Summary' 
                : 'Time Summary'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 bg-card rounded-lg border">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 text-muted-foreground mr-1" />
                <span className="text-sm font-medium text-muted-foreground">
                  {isMultiDay ? 'Total Hours' : 'Hours Worked'}
                </span>
              </div>
              <p className={`text-3xl font-bold ${isEditing ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                {isEditing 
                  ? (calculatedValues?.total_hours || 0).toFixed(1)
                  : (timecard.total_hours || 0).toFixed(1)
                }
              </p>
              {isMultiDay && !isEditing ? (
                <p className="text-xs text-muted-foreground">
                  {avgHoursPerDay.toFixed(1)} hours/day avg
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">hours worked</p>
              )}
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg border">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 text-muted-foreground mr-1" />
                <span className="text-sm font-medium text-muted-foreground">
                  {isMultiDay ? 'Total Break Time' : 'Break Duration'}
                </span>
              </div>
              <p className={`text-3xl font-bold ${isEditing ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                {Math.round(isEditing 
                  ? (calculatedValues?.break_duration || 0)
                  : (timecard.break_duration || 0)
                )}
              </p>
              {isMultiDay && !isEditing ? (
                <p className="text-xs text-muted-foreground">
                  {Math.round(avgBreakPerDay)} min/day avg
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">minutes</p>
              )}
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg border">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground mr-1" />
                <span className="text-sm font-medium text-muted-foreground">Pay Rate</span>
              </div>
              <p className="text-3xl font-bold text-foreground">${(timecard.pay_rate || 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">per hour</p>
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg border">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
                <span className="text-sm font-medium text-muted-foreground">
                  {isMultiDay ? 'Total Compensation' : 'Total Pay'}
                </span>
              </div>
              <p className={`text-3xl font-bold ${isEditing ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                ${isEditing 
                  ? (calculatedValues?.total_pay || 0).toFixed(2)
                  : (timecard.total_pay || 0).toFixed(2)
                }
              </p>
              {isMultiDay && !isEditing ? (
                <p className="text-xs text-muted-foreground">
                  ${avgPayPerDay.toFixed(2)}/day avg
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">total compensation</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Entries Breakdown - Matching timecards page format */}
      {timecard.daily_entries && timecard.daily_entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Daily Time Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {timecard.daily_entries.map((entry, index) => (
                <div key={index} className="space-y-4">
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2">
                    <h3 className="text-sm font-medium text-foreground">
                      Day {index + 1} - {formatDate(entry.work_date, "EEEE, MMM d, yyyy")}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{(entry.hours_worked || 0).toFixed(1)} hrs</span>
                      <span>${(entry.daily_pay || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Time Events Grid - matching timecards page format */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Check In */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Check In</label>
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <p className="text-lg font-semibold text-foreground">
                          {formatDate(entry.check_in_time, "h:mm:ss a", "Not Recorded")}
                        </p>
                      </div>
                    </div>

                    {/* Break Start */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Break Start</label>
                      <div className={`p-3 rounded-lg border ${entry.break_start_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                        {entry.break_start_time ? (
                          <p className="text-lg font-semibold text-foreground">
                            {formatDate(entry.break_start_time, "h:mm:ss a")}
                          </p>
                        ) : (
                          <p className="text-lg font-semibold text-muted-foreground">Not Recorded</p>
                        )}
                      </div>
                    </div>

                    {/* Break End */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Break End</label>
                      <div className={`p-3 rounded-lg border ${entry.break_end_time ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                        {entry.break_end_time ? (
                          <p className="text-lg font-semibold text-foreground">
                            {formatDate(entry.break_end_time, "h:mm:ss a")}
                          </p>
                        ) : (
                          <p className="text-lg font-semibold text-muted-foreground">Not Recorded</p>
                        )}
                      </div>
                    </div>

                    {/* Check Out */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <p className="text-lg font-semibold text-foreground">
                          {formatDate(entry.check_out_time, "h:mm:ss a", "Not Recorded")}
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
            </div>
          </CardContent>
        </Card>
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
                <div className="p-3 rounded-lg border border-border bg-card">
                  {isEditing && onTimeChange ? (
                    <Input
                      type="datetime-local"
                      value={utcToDatetimeLocal(editedTimecard.check_in_time || null)}
                      onChange={(e) => onTimeChange('check_in_time', e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-foreground">
                      {formatDate(timecard.check_in_time, "h:mm:ss a")}
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
                <div className={`p-3 rounded-lg border ${
                  (isEditing ? editedTimecard.break_start_time : timecard.break_start_time) 
                    ? 'border-border bg-card' 
                    : 'border-dashed border-muted-foreground/30 bg-muted/30'
                }`}>
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
                      {formatDate(timecard.break_start_time, "h:mm:ss a")}
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
                <div className={`p-3 rounded-lg border ${
                  (isEditing ? editedTimecard.break_end_time : timecard.break_end_time) 
                    ? 'border-border bg-card' 
                    : 'border-dashed border-muted-foreground/30 bg-muted/30'
                }`}>
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
                      {formatDate(timecard.break_end_time, "h:mm:ss a")}
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
                <div className="p-3 rounded-lg border border-border bg-card">
                  {isEditing && onTimeChange ? (
                    <Input
                      type="datetime-local"
                      value={utcToDatetimeLocal(editedTimecard.check_out_time || null)}
                      onChange={(e) => onTimeChange('check_out_time', e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-foreground">
                      {formatDate(timecard.check_out_time, "h:mm:ss a")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Notes Section - Only visible to authorized users */}
      {canManageAdminNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Admin Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditingAdminNotes ? (
              <div className="space-y-3">
                <Textarea
                  value={adminNotesValue}
                  onChange={(e) => setAdminNotesValue(e.target.value)}
                  placeholder="Enter admin notes..."
                  rows={4}
                  disabled={savingAdminNotes}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={saveAdminNotes} 
                    size="sm" 
                    className="gap-2"
                    disabled={savingAdminNotes}
                  >
                    <Save className="h-4 w-4" />
                    {savingAdminNotes ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={cancelAdminNotesEdit}
                    size="sm"
                    className="gap-2"
                    disabled={savingAdminNotes}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="min-h-[100px] p-3 border rounded-md bg-muted/50">
                  {timecard.admin_notes ? (
                    <span className="whitespace-pre-wrap">{timecard.admin_notes}</span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      No admin notes provided. Click edit to add notes.
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditingAdminNotes(true)}
                  size="sm"
                  disabled={savingAdminNotes}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Notes
                </Button>
              </div>
            )}
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
    </div>
  )
}