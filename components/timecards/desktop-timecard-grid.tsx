"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Coffee, AlertTriangle } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { parseDate } from "@/lib/timezone-utils"
import { CustomTimePicker } from "./custom-time-picker"

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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
    
    // Use the same normalization logic as handleInputChange for consistency
    const normalizeTimeForComparison = (timeValue: string | null | undefined): string | null => {
      if (!timeValue) return null
      try {
        // Handle both ISO and simple time formats
        let date: Date;
        
        if (timeValue.includes('T')) {
          // Full datetime string
          date = new Date(timeValue)
        } else if (timeValue.includes(':')) {
          // Simple time format - combine with today's date
          const today = new Date().toISOString().split('T')[0]
          date = new Date(`${today}T${timeValue}`)
        } else {
          return null
        }
        
        if (isNaN(date.getTime())) return null
        
        // Extract only the time portion for comparison
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const seconds = date.getSeconds().toString().padStart(2, '0')
        return `${hours}:${minutes}:${seconds}`
      } catch {
        return null
      }
    }
    
    const editedValue = fieldEdits[fieldId]
    const normalizedOriginal = normalizeTimeForComparison(originalValue)
    const normalizedEdited = normalizeTimeForComparison(editedValue)
    
    return normalizedOriginal !== normalizedEdited
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
      // Use the same logic as formatTime to ensure consistency
      let date: Date;
      
      if (timeString.includes('T')) {
        // Full datetime - use as-is
        date = new Date(timeString)
      } else {
        // Time-only format (HH:MM:SS) - combine with today's date
        const today = new Date().toISOString().split('T')[0]
        date = new Date(`${today}T${timeString}`)
      }
      
      if (isNaN(date.getTime())) return ""
      
      // Convert to HH:MM format (24-hour)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch {
      return ""
    }
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

  // Helper function to get all field values for validation
  const getAllFieldValuesForDay = (dayIndex?: number) => {
    if (dayIndex !== undefined && timecard.daily_entries && timecard.daily_entries[dayIndex]) {
      const entry = timecard.daily_entries[dayIndex]
      return {
        check_in_time: entry.check_in_time,
        break_start_time: entry.break_start_time,
        break_end_time: entry.break_end_time,
        check_out_time: entry.check_out_time
      }
    } else {
      return {
        check_in_time: timecard.check_in_time,
        break_start_time: timecard.break_start_time,
        break_end_time: timecard.break_end_time,
        check_out_time: timecard.check_out_time
      }
    }
  }

  // Helper function to validate time sequence (same logic as SimpleEditableField)
  const validateTimeSequence = (fieldId: string, newValue: string, dayIndex?: number): string | null => {
    const allFieldValues = getAllFieldValuesForDay(dayIndex)
    
    console.log('🔍 Desktop validation debug:', {
      fieldId,
      newValue,
      dayIndex,
      allFieldValues,
      fieldEdits
    })
    
    try {
      // Parse the new value (could be simple time string or ISO)
      let newTime: Date;
      if (newValue.includes('T')) {
        console.log('🔍 Desktop: Parsing as ISO datetime')
        // Full datetime string
        newTime = new Date(newValue)
      } else if (newValue.includes(':')) {
        console.log('🔍 Desktop: Parsing as simple time format')
        // Simple time format (HH:MM:SS) - combine with today's date
        const today = new Date().toISOString().split('T')[0]
        const combinedDateTime = `${today}T${newValue}`
        console.log('🔍 Desktop: Combined datetime:', combinedDateTime)
        newTime = new Date(combinedDateTime)
      } else {
        console.log('🔍 Desktop: Validation failed - no T or colon found')
        return "Invalid time format"
      }
      
      console.log('🔍 Desktop: Parsed date:', {
        newTime: newTime.toString(),
        isValid: !isNaN(newTime.getTime()),
        timeValue: newTime.getTime()
      })
      
      if (isNaN(newTime.getTime())) {
        console.log('🔍 Desktop: Validation failed - parsed date is NaN')
        return "Invalid time format"
      }
      
      // Get current values (including any edits) for the same day
      const getCurrentValue = (baseField: string): Date | null => {
        const relatedFieldId = dayIndex !== undefined ? `${baseField}_day_${dayIndex}` : baseField
        
        console.log('🔍 Getting current value:', { baseField, relatedFieldId })
        
        // First check if there's an edit for this field
        if (fieldEdits[relatedFieldId] !== undefined) {
          const value = fieldEdits[relatedFieldId]
          console.log('🔍 Found edit value:', { relatedFieldId, value })
          if (!value) return null
          
          // Parse the edit value (could be simple time string or ISO)
          if (value.includes('T')) {
            return new Date(value)
          } else if (value.includes(':')) {
            const today = new Date().toISOString().split('T')[0]
            return new Date(`${today}T${value}`)
          }
          return null
        }
        
        // Then check the original values
        const value = allFieldValues[baseField as keyof typeof allFieldValues]
        console.log('🔍 Using original value:', { baseField, value })
        
        if (!value) return null
        
        // Handle different time formats
        try {
          let date: Date
          
          if (value.includes('T')) {
            // Full datetime string (ISO format)
            date = new Date(value)
          } else if (value.includes(':')) {
            // Time-only format (HH:MM:SS or HH:MM) - combine with today's date for consistent comparison
            const today = new Date().toISOString().split('T')[0]
            date = new Date(`${today}T${value}`)
            console.log('🔍 Time-only parsing:', { value, referenceDate: today, fullDateTime: `${today}T${value}` })
          } else {
            return null
          }
          
          if (isNaN(date.getTime())) {
            console.log('🔍 Failed to parse time:', { value })
            return null
          }
          
          console.log('🔍 Parsed time successfully:', { value, parsedTime: date.toLocaleTimeString(), fullDate: date.toISOString() })
          return date
        } catch (error) {
          console.log('🔍 Error parsing time:', { value, error })
          return null
        }
      }
      
      // Determine which field we're updating
      const baseFieldName = fieldId.replace(/_day_\d+$/, '')
      console.log('🔍 Base field name:', { fieldId, baseFieldName })
      
      // Apply the new value to the appropriate field
      const checkIn = baseFieldName === 'check_in_time' ? newTime : getCurrentValue('check_in_time')
      const breakStart = baseFieldName === 'break_start_time' ? newTime : getCurrentValue('break_start_time')
      const breakEnd = baseFieldName === 'break_end_time' ? newTime : getCurrentValue('break_end_time')
      const checkOut = baseFieldName === 'check_out_time' ? newTime : getCurrentValue('check_out_time')
      
      console.log('🔍 Time values for validation:', {
        checkIn: checkIn?.toLocaleTimeString(),
        breakStart: breakStart?.toLocaleTimeString(),
        breakEnd: breakEnd?.toLocaleTimeString(),
        checkOut: checkOut?.toLocaleTimeString(),
        newValueField: baseFieldName,
        newValueTime: newTime.toLocaleTimeString()
      })
      
      // Validate time sequence
      console.log('🔍 Validation checks:', {
        'checkIn && breakStart': !!(checkIn && breakStart),
        'breakStart <= checkIn': breakStart && checkIn ? breakStart <= checkIn : 'N/A',
        'breakStart && breakEnd': !!(breakStart && breakEnd),
        'breakEnd <= breakStart': breakStart && breakEnd ? breakEnd <= breakStart : 'N/A',
        'breakEnd && checkOut': !!(breakEnd && checkOut),
        'checkOut <= breakEnd': breakEnd && checkOut ? checkOut <= breakEnd : 'N/A',
        'checkIn && checkOut': !!(checkIn && checkOut),
        'checkOut <= checkIn': checkIn && checkOut ? checkOut <= checkIn : 'N/A'
      })
      
      // Detailed debugging for the first condition
      if (checkIn && breakStart) {
        console.log('🔍 Detailed check-in vs break start comparison:', {
          checkInTime: checkIn.getTime(),
          breakStartTime: breakStart.getTime(),
          checkInString: checkIn.toISOString(),
          breakStartString: breakStart.toISOString(),
          'breakStart <= checkIn': breakStart <= checkIn,
          'breakStart.getTime() <= checkIn.getTime()': breakStart.getTime() <= checkIn.getTime()
        })
      }
      
      if (checkIn && breakStart && breakStart <= checkIn) {
        console.log('🔍 Validation error: break start <= check in')
        return "Break start must be after check-in time"
      }
      
      if (breakStart && breakEnd && breakEnd <= breakStart) {
        console.log('🔍 Validation error: break end <= break start')
        return "Break end must be after break start"
      }
      
      if (breakEnd && checkOut && checkOut <= breakEnd) {
        console.log('🔍 Validation error: check out <= break end')
        return "Check-out must be after break end"
      }
      
      if (checkIn && checkOut && checkOut <= checkIn) {
        console.log('🔍 Validation error: check out <= check in')
        return "Check-out must be after check-in time"
      }
      
      // Additional validations can be added here if needed
      
      console.log('🔍 Validation passed: no errors found')
      return null // No validation errors
    } catch (error) {
      console.log('🔍 Validation error (exception):', error)
      return "Invalid time format"
    }
  }

  // Helper function to handle time change from CustomTimePicker
  const handleTimeChange = (fieldId: string, originalValue: any, newValue: string, dayIndex?: number) => {
    if (!onFieldEdit) return
    
    console.log('🖥️ Desktop validation check:', { fieldId, newValue, dayIndex })
    
    // Validate the new time value
    const validationError = validateTimeSequence(fieldId, newValue, dayIndex)
    console.log('🖥️ Desktop validation result:', { validationError })
    
    if (validationError) {
      // Store error for inline display and prevent change
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: validationError
      }))
      console.log('🖥️ Desktop: Validation failed - preventing change:', validationError)
      return // Prevent the change
    }
    
    // Clear any existing validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldId]
      return newErrors
    })
    
    // Use same normalization logic as SimpleEditableField
    // Extract only the time portion (HH:MM:SS) to avoid date-based comparison issues
    const normalizeTimeValue = (timeValue: string | null | undefined): string | null => {
      if (!timeValue) return null
      try {
        // Handle both ISO and simple time formats
        let date: Date;
        
        if (timeValue.includes('T')) {
          // Full datetime string
          date = new Date(timeValue)
        } else if (timeValue.includes(':')) {
          // Simple time format - combine with today's date
          const today = new Date().toISOString().split('T')[0]
          date = new Date(`${today}T${timeValue}`)
        } else {
          return null
        }
        
        if (isNaN(date.getTime())) return null
        
        // Extract only the time portion for comparison
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const seconds = date.getSeconds().toString().padStart(2, '0')
        return `${hours}:${minutes}:${seconds}`
      } catch {
        return null
      }
    }
    
    const normalizedNew = normalizeTimeValue(newValue)
    const normalizedOriginal = normalizeTimeValue(originalValue)
    
    if (normalizedNew === normalizedOriginal) {
      onFieldEdit(fieldId, undefined) // Remove edit if same as original
    } else {
      onFieldEdit(fieldId, newValue)
    }
  }

  // Helper function to handle time picker blur
  const handleTimePickerBlur = () => {
    // Clear validation error for the field that was being edited
    if (editingField) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[editingField]
        return newErrors
      })
    }
    setEditingField(null)
  }

  // Helper component to render editable time field with validation
  const renderTimeField = (fieldId: string, originalValue: any, currentValue: any, isEdited: boolean, isEditing: boolean, hasValue: boolean = true, dayIndex?: number) => {
    const validationError = validationErrors[fieldId]
    
    return (
      <div className="relative">
        <div className="flex flex-col items-center justify-center" style={{ height: '28px' }}>
          {isEditing && isRejectionMode ? (
            <div className="flex items-center justify-center h-full">
              <CustomTimePicker
                value={currentValue}
                onChange={(newValue) => handleTimeChange(fieldId, originalValue, newValue, dayIndex)}
                onBlur={handleTimePickerBlur}
                className="text-lg font-semibold leading-none"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-0">
              {/* Show original time above current time when edited */}
              {isEdited && (
                <div className="text-xs text-muted-foreground line-through text-center leading-tight whitespace-nowrap">
                  {formatTime(originalValue)}
                </div>
              )}
              
              {/* Current time value */}
              <p 
                className={`text-lg font-semibold m-0 text-center leading-none ${
                  isRejectionMode ? 'cursor-pointer' : ''
                } ${
                  validationError
                    ? 'text-red-600 dark:text-red-400'
                    : isEdited 
                      ? 'text-red-600 dark:text-red-400' 
                      : hasValue 
                        ? 'text-foreground' 
                        : 'text-muted-foreground'
                }`}
                onClick={() => handleFieldClick(fieldId)}
              >
                {formatTime(currentValue)}
              </p>
            </div>
          )}
        </div>
        {validationError && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 px-3 py-2 bg-background text-white rounded-md shadow-lg border border-border min-w-max">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span className="text-sm font-medium">{validationError}</span>
            </div>
            {/* Arrow pointing up */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-border"></div>
          </div>
        )}
      </div>
    )
  }

  // Helper function to handle field click
  const handleFieldClick = (fieldId: string) => {
    if (isRejectionMode) {
      // In rejection mode, allow field editing for rejection workflow
      if (onFieldEdit) {
        // Clear validation errors when starting to edit a field
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[fieldId]
          return newErrors
        })
        setEditingField(fieldId)
      } else if (onFieldToggle) {
        onFieldToggle(fieldId)
      }
    }
    // In approval mode (not rejection mode), fields are read-only - no editing allowed
  }

  // Helper function to check if field is rejected
  const isFieldRejected = (fieldId: string) => {
    return showRejectedFields && timecard.rejected_fields && timecard.rejected_fields.includes(fieldId)
  }

  // Prepare day columns
  const prepareDayColumns = (): DayColumn[] => {
    if (timecard.daily_entries && timecard.daily_entries.length > 0) {
      // Multi-day timecard - use daily entries
      return timecard.daily_entries
        .sort((a, b) => {
          const dateA = parseDate(a.work_date)
          const dateB = parseDate(b.work_date)
          return (dateA?.getTime() || 0) - (dateB?.getTime() || 0)
        })
        .map(entry => {
          const date = parseDate(entry.work_date)
          return {
            date: entry.work_date,
            dayName: date ? date.toLocaleDateString('en-US', { weekday: 'short' }) : 'Invalid',
            dayNumber: date ? date.toLocaleDateString('en-US', { day: 'numeric' }) : 'Invalid',
            entry
          }
        })
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
                <div className="flex flex-col items-center gap-2 p-3 border rounded-lg border-border">
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
              const hasValidationError = validationErrors[fieldId]
              
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-all relative ${
                    hasValidationError
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : isEditing
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
                  {renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, true, index)}
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
              const hasValidationError = validationErrors[fieldId]
              
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-all relative ${
                    hasValidationError
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : isEditing
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
                  {renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, hasBreak, index)}
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
              const hasValidationError = validationErrors[fieldId]
              
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-all relative ${
                    hasValidationError
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : isEditing
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
                  {renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, hasBreak, index)}
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
              const hasValidationError = validationErrors[fieldId]
              
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-all relative ${
                    hasValidationError
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : isEditing
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
                  {renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, true, index)}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
