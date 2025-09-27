"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Coffee } from "lucide-react"
import type { Timecard } from "@/lib/types"

interface DesktopTimecardGridProps {
  timecard: Timecard
  isRejectionMode?: boolean
  selectedFields?: string[]
  onFieldToggle?: (fieldId: string) => void
  actionButtons?: React.ReactNode
  showHeader?: boolean
  showSummaryInHeader?: boolean
  showRejectedFields?: boolean
  // New props for direct editing
  fieldEdits?: Record<string, any>
  onFieldEdit?: (fieldId: string, newValue: any) => void
}

interface DayColumn {
  date: string
  dayName: string
  dayNumber: string
  entry?: any
}

export function DesktopTimecardGrid({
  timecard,
  isRejectionMode = false,
  selectedFields = [],
  onFieldToggle,
  actionButtons,
  showHeader = true,
  showSummaryInHeader = false,
  showRejectedFields = false,
  fieldEdits = {},
  onFieldEdit
}: DesktopTimecardGridProps) {

  const [editingField, setEditingField] = useState<string | null>(null)
  const [activeSegment, setActiveSegment] = useState<'hours' | 'minutes' | 'ampm' | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // CSS to hide time picker completely and style segment highlighting
  const timeInputStyles = `
    input[type="time"]::-webkit-calendar-picker-indicator {
      display: none;
      -webkit-appearance: none;
    }
    input[type="time"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
    }
    input[type="time"]::-webkit-clear-button {
      -webkit-appearance: none;
    }
    .time-input-overlay input[type="time"] {
      opacity: 0;
    }
    .time-segment {
      padding: 2px 4px;
      border-radius: 3px;
      transition: all 0.2s ease;
      display: inline-block;
    }
    .time-segment.active {
      background: rgba(59, 130, 246, 0.25);
      color: rgb(29, 78, 216);
      font-weight: 600;
    }
    .dark .time-segment.active {
      background: rgba(59, 130, 246, 0.35);
      color: rgb(147, 197, 253);
    }
    .time-segment-compact {
      border-radius: 3px;
      transition: all 0.2s ease;
      display: inline;
    }
    .time-segment-compact.active {
      background: rgba(59, 130, 246, 0.25);
      color: rgb(29, 78, 216);
      font-weight: 600;
    }
    .dark .time-segment-compact.active {
      background: rgba(59, 130, 246, 0.35);
      color: rgb(147, 197, 253);
    }
    .time-separator {
      color: inherit;
    }
  `

  // Helper function to get field ID for rejection mode
  const getFieldId = (fieldType: string, dayIndex?: number) => {
    if (dayIndex !== undefined) {
      return `${fieldType}_day_${dayIndex}`
    }
    return fieldType
  }

  // Helper function to check if field is selected for rejection
  const isFieldSelected = (fieldId: string) => {
    return isRejectionMode && selectedFields.includes(fieldId)
  }

  // Helper functions for direct editing
  const isFieldEdited = (fieldId: string, originalValue: any) => {
    if (fieldEdits[fieldId] === undefined) return false
    
    // Compare the actual values to see if they're different
    const editedValue = fieldEdits[fieldId]
    const originalFormatted = formatTimeForInput(originalValue)
    const editedFormatted = formatTimeForInput(editedValue)
    
    return originalFormatted !== editedFormatted
  }

  const getFieldValue = (fieldId: string, originalValue: any) => {
    return fieldEdits[fieldId] || originalValue
  }

  const isFieldEditing = (fieldId: string) => {
    return editingField === fieldId
  }

  const formatTimeForInput = (timeString: string | null) => {
    if (!timeString) return ""
    try {
      const date = new Date(timeString)
      return date.toTimeString().slice(0, 5) // HH:MM format
    } catch {
      return ""
    }
  }

  // Helper function to validate time order
  const validateTimeOrder = (fieldId: string, newTimeValue: string, dayIndex: number) => {
    const fieldType = fieldId.split('_')[0] + '_' + fieldId.split('_')[1] + '_' + fieldId.split('_')[2] // e.g., "check_in_time"
    const dayEntry = dayColumns[dayIndex]?.entry
    
    if (!dayEntry) return true
    
    // Convert time string to minutes for comparison
    const timeToMinutes = (timeStr: string) => {
      if (!timeStr) return null
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const newMinutes = timeToMinutes(newTimeValue)
    if (newMinutes === null) return true
    
    // Get current times (use edited values if they exist)
    const getFieldValue = (field: string) => {
      const editedFieldId = `${field}_day_${dayIndex}`
      const editedValue = fieldEdits[editedFieldId]
      if (editedValue) return formatTimeForInput(editedValue)
      return formatTimeForInput(dayEntry[field])
    }
    
    const checkInTime = fieldType === 'check_in_time' ? newTimeValue : getFieldValue('check_in_time')
    const breakStartTime = fieldType === 'break_start_time' ? newTimeValue : getFieldValue('break_start_time')
    const breakEndTime = fieldType === 'break_end_time' ? newTimeValue : getFieldValue('break_end_time')
    const checkOutTime = fieldType === 'check_out_time' ? newTimeValue : getFieldValue('check_out_time')
    
    const checkInMinutes = timeToMinutes(checkInTime)
    const breakStartMinutes = timeToMinutes(breakStartTime)
    const breakEndMinutes = timeToMinutes(breakEndTime)
    const checkOutMinutes = timeToMinutes(checkOutTime)
    
    // Validation rules - return error message instead of showing alert
    if (checkInMinutes && breakStartMinutes && checkInMinutes >= breakStartMinutes) {
      return 'Check-in time must be before break start time'
    }
    
    if (breakStartMinutes && breakEndMinutes && breakStartMinutes >= breakEndMinutes) {
      return 'Break start time must be before break end time'
    }
    
    if (breakEndMinutes && checkOutMinutes && breakEndMinutes >= checkOutMinutes) {
      return 'Break end time must be before check-out time'
    }
    
    if (checkInMinutes && checkOutMinutes && checkInMinutes >= checkOutMinutes) {
      return 'Check-in time must be before check-out time'
    }
    
    return null // No error
  }

  const handleInputChange = (fieldId: string, timeValue: string, originalValue: any) => {
    if (onFieldEdit && timeValue) {
      // Extract day index from field ID
      const dayIndex = parseInt(fieldId.split('_').pop() || '0')
      
      // Validate time order
      const validationError = validateTimeOrder(fieldId, timeValue, dayIndex)
      if (validationError) {
        // Show inline error and don't save
        setValidationErrors(prev => ({ ...prev, [fieldId]: validationError }))
        return
      } else {
        // Clear any existing error for this field
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[fieldId]
          return newErrors
        })
      }
      
      // Convert HH:MM to full datetime string
      const today = new Date()
      const [hours, minutes] = timeValue.split(':')
      const newValue = today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      const newISOString = new Date(newValue).toISOString()
      
      // Check if the new value is different from the original
      const originalFormatted = formatTimeForInput(originalValue)
      const newFormatted = formatTimeForInput(newISOString)
      
      if (originalFormatted === newFormatted) {
        // If it's the same as original, remove from edits
        onFieldEdit(fieldId, undefined)
      } else {
        // If it's different, add to edits
        onFieldEdit(fieldId, newISOString)
      }
    }
  }

  const handleInputBlur = () => {
    setEditingField(null)
    setActiveSegment(null)
    // Clear validation errors when field stops being edited
    setValidationErrors({})
  }

  // Helper function to create segmented time display that matches normal text exactly
  const createSegmentedTimeDisplay = (timeString: string, isEdited: boolean, hasValue: boolean = true) => {
    const formatted = formatTime(timeString)
    if (formatted === "Not Recorded") {
      return formatted
    }

    // Parse the formatted time (e.g., "8:30 AM")
    const timeMatch = formatted.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!timeMatch) {
      return formatted
    }

    const [, hours, minutes, ampm] = timeMatch

    return (
      <>
        <span className={`time-segment-compact ${activeSegment === 'hours' ? 'active' : ''}`}>
          {hours}
        </span>
        <span>:</span>
        <span className={`time-segment-compact ${activeSegment === 'minutes' ? 'active' : ''}`}>
          {minutes}
        </span>
        <span> </span>
        <span className={`time-segment-compact ${activeSegment === 'ampm' ? 'active' : ''}`}>
          {ampm}
        </span>
      </>
    )
  }

  // Handle input events to detect active segment
  const handleTimeInputEvent = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement
    
    // Use a small delay to let the browser update selection
    setTimeout(() => {
      const selectionStart = input.selectionStart || 0
      const selectionEnd = input.selectionEnd || 0
      const value = input.value // HH:MM format
      
      // More robust segment detection
      if (selectionStart <= 2 && selectionEnd <= 2) {
        setActiveSegment('hours')
      } else if (selectionStart >= 3 && selectionEnd <= 5) {
        setActiveSegment('minutes')
      } else {
        // For AM/PM, we need to detect it differently since native time picker
        // doesn't always expose AM/PM selection properly
        setActiveSegment('ampm')
      }
    }, 50) // Increased delay for better detection
  }

  // Handle click events with position-based detection
  const handleTimeInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement
    const rect = input.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const inputWidth = rect.width
    
    // Position-based segment detection for clicks
    setTimeout(() => {
      if (clickX < inputWidth * 0.35) {
        setActiveSegment('hours')
      } else if (clickX < inputWidth * 0.65) {
        setActiveSegment('minutes')
      } else {
        setActiveSegment('ampm')
      }
    }, 10)
  }

  // Handle keyboard navigation - use logical state tracking since selectionStart doesn't work
  const handleTimeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key to confirm edit
    if (e.key === 'Enter') {
      e.preventDefault()
      handleInputBlur() // This will exit editing mode
      return
    }
    
    // Don't prevent default - let native time picker handle navigation
    
    // Since selectionStart doesn't work with native time pickers,
    // use logical state tracking based on current segment and key pressed
    if (e.key === 'ArrowRight') {
      const currentSegment = activeSegment || 'hours' // Default to hours if no segment
      
      console.log('ArrowRight pressed, current segment:', currentSegment)
      
      // Move to next segment logically
      if (currentSegment === 'hours') {
        setActiveSegment('minutes')
        console.log('Moving from hours to minutes')
      } else if (currentSegment === 'minutes') {
        setActiveSegment('ampm')
        console.log('Moving from minutes to ampm')
      }
      // Stay on ampm if already there
    }
    
    if (e.key === 'ArrowLeft') {
      const currentSegment = activeSegment || 'hours'
      
      console.log('ArrowLeft pressed, current segment:', currentSegment)
      
      // Move to previous segment logically
      if (currentSegment === 'ampm') {
        setActiveSegment('minutes')
        console.log('Moving from ampm to minutes')
      } else if (currentSegment === 'minutes') {
        setActiveSegment('hours')
        console.log('Moving from minutes to hours')
      }
      // Stay on hours if already there
    }
    
    // Tab navigation - move forward
    if (e.key === 'Tab' && !e.shiftKey) {
      const currentSegment = activeSegment || 'hours'
      
      if (currentSegment === 'hours') {
        setActiveSegment('minutes')
      } else if (currentSegment === 'minutes') {
        setActiveSegment('ampm')
      }
    }
    
    // Shift+Tab navigation - move backward
    if (e.key === 'Tab' && e.shiftKey) {
      const currentSegment = activeSegment || 'hours'
      
      if (currentSegment === 'ampm') {
        setActiveSegment('minutes')
      } else if (currentSegment === 'minutes') {
        setActiveSegment('hours')
      }
    }
    
    // Detect direct AM/PM navigation
    if (e.key === 'a' || e.key === 'A' || e.key === 'p' || e.key === 'P') {
      setActiveSegment('ampm')
      console.log('AM/PM key pressed, moving to ampm segment')
    }
    
    // Number keys - stay on current segment or default to hours
    if (e.key >= '0' && e.key <= '9') {
      if (!activeSegment) {
        setActiveSegment('hours')
        console.log('Number key pressed, defaulting to hours segment')
      }
    }
  }

  // Handle initial focus - always start with hours
  const handleTimeInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setActiveSegment('hours')
    console.log('Time input focused, setting segment to hours')
  }

  // Format time for display (matching existing format)
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "Not Recorded"

    try {
      // Handle both full datetime and time-only formats
      if (timeStr.includes('T')) {
        return new Date(timeStr).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        })
      }

      // Already in time format (HH:MM:SS)
      const today = new Date().toISOString().split('T')[0]
      const date = new Date(`${today}T${timeStr}`)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch (error) {
      return "Not Recorded"
    }
  }

  // Helper component to render editable time field
  const renderTimeField = (fieldId: string, originalValue: any, currentValue: any, isEdited: boolean, isEditing: boolean, hasValue: boolean = true) => (
    <div className="flex flex-col items-center justify-center h-full">
      {isEdited && !isEditing && (
        <div className="text-xs text-muted-foreground line-through leading-none mb-0">
          {formatTime(originalValue)}
        </div>
      )}
      <div className="relative">
        {isEditing ? (
          <p className="text-lg font-semibold leading-tight m-0">
            {createSegmentedTimeDisplay(currentValue, isEdited, hasValue)}
          </p>
        ) : (
          <p className={`text-lg font-semibold leading-tight m-0 ${
            isEdited 
              ? 'text-red-600 dark:text-red-400' 
              : hasValue 
                ? 'text-foreground' 
                : 'text-muted-foreground'
          }`}>
            {formatTime(currentValue)}
          </p>
        )}
        {isEditing && (
          <input
            type="time"
            step="300"
            value={formatTimeForInput(currentValue)}
            onChange={(e) => handleInputChange(fieldId, e.target.value, originalValue)}
            onFocus={handleTimeInputFocus}
            onClick={handleTimeInputClick}
            onKeyDown={handleTimeInputKeyDown}
            onBlur={handleInputBlur}
            className="absolute inset-0 opacity-0"

            autoFocus
          />
        )}

      </div>
    </div>
  )

  // Helper function to handle field click in rejection mode
  const handleFieldClick = (fieldId: string) => {
    if (isRejectionMode) {
      // If we have onFieldEdit, use direct editing approach
      if (onFieldEdit) {
        setEditingField(fieldId)
      }
      // Otherwise fall back to selection approach
      else if (onFieldToggle) {
        onFieldToggle(fieldId)
      }
    }
  }

  // Helper function to check if field is rejected
  const isFieldRejected = (fieldId: string) => {
    return showRejectedFields && timecard.rejected_fields && timecard.rejected_fields.includes(fieldId)
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

  // Prepare day columns
  const prepareDayColumns = (): DayColumn[] => {
    if (timecard.daily_entries && timecard.daily_entries.length > 0) {
      // Multi-day timecard - use daily entries
      return timecard.daily_entries
        .sort((a, b) => new Date(a.work_date).getTime() - new Date(b.work_date).getTime())
        .map(entry => ({
          date: entry.work_date,
          dayName: new Date(entry.work_date).toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: new Date(entry.work_date).toLocaleDateString('en-US', { day: 'numeric' }),
          entry
        }))
    } else {
      // Single day timecard
      const date = timecard.date || timecard.period_start_date || new Date().toISOString()
      return [{
        date,
        dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: new Date(date).toLocaleDateString('en-US', { day: 'numeric' }),
        entry: {
          work_date: date,
          check_in_time: timecard.check_in_time,
          check_out_time: timecard.check_out_time,
          break_start_time: timecard.break_start_time,
          break_end_time: timecard.break_end_time,
          hours_worked: timecard.total_hours,
          break_duration: timecard.break_duration,
          daily_pay: timecard.total_pay
        }
      }]
    }
  }

  const dayColumns = prepareDayColumns()
  const isMultiDay = dayColumns.length > 1

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: timeInputStyles }} />
      <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between min-h-[2rem]">
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              {isMultiDay ? 'Daily Time Breakdown' : 'Time Details'}
              <span className={`ml-2 text-sm text-red-600 dark:text-red-400 font-normal transition-opacity ${
                isRejectionMode ? 'opacity-100' : 'opacity-0'
              }`}>
                (Click fields to edit)
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Summary Stats in Header */}
              {showSummaryInHeader && (
                <div className="hidden lg:flex lg:items-center lg:gap-4">
                  <div className="flex items-baseline gap-1 text-right">
                    <p className="text-lg font-semibold text-foreground">
                      ${(timecard.pay_rate || 0).toFixed(0)}/h
                    </p>
                    <p className="text-xs text-muted-foreground">Rate</p>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <p className="text-lg font-bold text-foreground">
                      {Math.round((timecard.total_break_duration || timecard.break_duration || 0) * 60)}
                    </p>
                    <p className="text-xs text-muted-foreground">Break (min)</p>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <p className="text-lg font-bold text-foreground">
                      {(timecard.total_hours || 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">Hours</p>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      ${(timecard.total_pay || 0).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              )}
              
              {actionButtons}
            </div>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {/* Day Headers */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `120px repeat(${dayColumns.length}, 1fr)` }}>
          {/* Empty space for row labels */}
          <div></div>

          {/* Day column headers */}
          {dayColumns.map((day, index) => {

            


            return (
              <div key={index} className="text-center">
                <div 
                  className="flex flex-col items-center gap-2 p-3 border rounded-lg border-border"

                >
                {/* Day name with small labels */}
                <div className="relative w-full text-xs">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium text-muted-foreground">Hours</span>
                    <span className="text-xs font-medium text-muted-foreground">Pay</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{day.dayName}</span>
                  </div>
                </div>
                {/* Date number with hours and pay */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span className="font-medium text-foreground">
                      {(day.entry?.hours_worked || 0).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">{day.dayNumber}</span>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ${(day.entry?.daily_pay || 0).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
          })}
        </div>

        {/* Time Event Rows */}
        <div className="space-y-4">
          {/* Check In Row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${dayColumns.length}, 1fr)` }}>
            <div className="flex items-center gap-2 py-3">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Check In</span>
            </div>
            {dayColumns.map((day, index) => {
              const fieldId = getFieldId('check_in_time', index)
              const originalValue = day.entry?.check_in_time
              const isSelected = isFieldSelected(fieldId)
              const isEdited = isFieldEdited(fieldId, originalValue)
              const isEditing = isFieldEditing(fieldId)
              const currentValue = getFieldValue(fieldId, originalValue)
              
              return (
                <div
                  key={index}
                  className={`${isEdited ? 'py-1 px-3' : 'p-3'} rounded-lg border transition-all relative ${
                    isEditing
                      ? 'border-red-500 bg-red-100 dark:bg-red-900/30 cursor-text shadow-lg'
                      : isEdited
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                        : isSelected
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                          : isFieldRejected(fieldId)
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                            : isRejectionMode
                              ? 'border-border bg-card hover:border-white cursor-pointer'
                              : 'border-border bg-card'
                  }`}
                  onClick={() => !isEditing && handleFieldClick(fieldId)}
                >
                  {renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, true)}
                  {validationErrors[fieldId] && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-background border border-white rounded-lg text-xs text-white z-10 flex items-center gap-2">
                      <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{validationErrors[fieldId]}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Break Start Row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${dayColumns.length}, 1fr)` }}>
            <div className="flex items-center gap-2 py-3">
              <Coffee className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Break Start</span>
            </div>
            {dayColumns.map((day, index) => {
              const fieldId = getFieldId('break_start_time', index)
              const originalValue = day.entry?.break_start_time
              const isSelected = isFieldSelected(fieldId)
              const isEdited = isFieldEdited(fieldId, originalValue)
              const isEditing = isFieldEditing(fieldId)
              const currentValue = getFieldValue(fieldId, originalValue)
              const hasBreak = currentValue || originalValue
              
              return (
                <div
                  key={index}
                  className={`${isEdited ? 'py-1 px-3' : 'p-3'} rounded-lg border transition-all relative ${
                    isEditing
                      ? 'border-red-500 bg-red-100 dark:bg-red-900/30 cursor-text shadow-lg'
                      : isEdited
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                        : isSelected
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                          : isFieldRejected(fieldId)
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                            : isRejectionMode
                              ? hasBreak
                                ? 'border-border bg-card hover:border-white cursor-pointer'
                                : 'border-dashed border-muted-foreground/30 bg-muted/30 hover:border-white cursor-pointer'
                              : hasBreak
                                ? 'border-border bg-card'
                                : 'border-dashed border-muted-foreground/30 bg-muted/30'
                  }`}
                  onClick={() => !isEditing && handleFieldClick(fieldId)}
                >
                  {renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, hasBreak)}
                  {validationErrors[fieldId] && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-background border border-white rounded-lg text-xs text-white z-10 flex items-center gap-2">
                      <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{validationErrors[fieldId]}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Break End Row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${dayColumns.length}, 1fr)` }}>
            <div className="flex items-center gap-2 py-3">
              <Coffee className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Break End</span>
            </div>
            {dayColumns.map((day, index) => {
              const fieldId = getFieldId('break_end_time', index)
              const originalValue = day.entry?.break_end_time
              const isSelected = isFieldSelected(fieldId)
              const isEdited = isFieldEdited(fieldId, originalValue)
              const isEditing = isFieldEditing(fieldId)
              const currentValue = getFieldValue(fieldId, originalValue)
              const hasBreak = currentValue || originalValue
              
              return (
                <div
                  key={index}
                  className={`${isEdited ? 'py-1 px-3' : 'p-3'} rounded-lg border transition-all relative ${
                    isEditing
                      ? 'border-red-500 bg-red-100 dark:bg-red-900/30 cursor-text shadow-lg'
                      : isEdited
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                        : isSelected
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                          : isFieldRejected(fieldId)
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                            : isRejectionMode
                              ? hasBreak
                                ? 'border-border bg-card hover:border-white cursor-pointer'
                                : 'border-dashed border-muted-foreground/30 bg-muted/30 hover:border-white cursor-pointer'
                              : hasBreak
                                ? 'border-border bg-card'
                                : 'border-dashed border-muted-foreground/30 bg-muted/30'
                  }`}
                  onClick={() => !isEditing && handleFieldClick(fieldId)}
                >
                  {renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, hasBreak)}
                  {validationErrors[fieldId] && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-background border border-white rounded-lg text-xs text-white z-10 flex items-center gap-2">
                      <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{validationErrors[fieldId]}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Check Out Row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${dayColumns.length}, 1fr)` }}>
            <div className="flex items-center gap-2 py-3">
              <Clock className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-muted-foreground">Check Out</span>
            </div>
            {dayColumns.map((day, index) => {
              const fieldId = getFieldId('check_out_time', index)
              const originalValue = day.entry?.check_out_time
              const isSelected = isFieldSelected(fieldId)
              const isEdited = isFieldEdited(fieldId, originalValue)
              const isEditing = isFieldEditing(fieldId)
              const currentValue = getFieldValue(fieldId, originalValue)
              
              return (
                <div
                  key={index}
                  className={`${isEdited ? 'py-1 px-3' : 'p-3'} rounded-lg border transition-all relative ${
                    isEditing
                      ? 'border-red-500 bg-red-100 dark:bg-red-900/30 cursor-text shadow-lg'
                      : isEdited
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                        : isSelected
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                          : isFieldRejected(fieldId)
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                            : isRejectionMode
                              ? 'border-border bg-card hover:border-white cursor-pointer'
                              : 'border-border bg-card'
                  }`}
                  onClick={() => !isEditing && handleFieldClick(fieldId)}
                >
                  {renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, true)}
                  {validationErrors[fieldId] && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-background border border-white rounded-lg text-xs text-white z-10 flex items-center gap-2">
                      <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{validationErrors[fieldId]}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  )
}
