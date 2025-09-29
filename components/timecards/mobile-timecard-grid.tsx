"use client"

import { useState } from "react"

import { Clock, Coffee, AlertTriangle, ChevronDown } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { parseDate } from "@/lib/timezone-utils"
import { CustomTimePicker } from "./custom-time-picker"

interface MobileTimecardGridProps {
  timecard: Timecard
  isRejectionMode?: boolean
  selectedFields?: string[]
  onFieldToggle?: (fieldId: string) => void
  showRejectedFields?: boolean
  // New props for direct editing
  fieldEdits?: Record<string, any>
  onFieldEdit?: (fieldId: string, newValue: any) => void
  // Week pagination props
  currentWeekEntries?: any[]
  currentWeekIndex?: number
  totalWeeks?: number
  onWeekChange?: (weekIndex: number) => void
  isCalendarWeekMode?: boolean
  showBreakdownToggle?: boolean
  isApproveContext?: boolean
}

interface TimeColumn {
  fieldType: string
  label: string
  icon: React.ReactNode
}

export function MobileTimecardGrid({
  timecard,
  isRejectionMode = false,
  selectedFields = [],
  onFieldToggle,
  showRejectedFields = false,
  fieldEdits = {},
  onFieldEdit,
  currentWeekEntries,
  currentWeekIndex = 0,
  totalWeeks = 1,
  onWeekChange,
  isCalendarWeekMode = false,
  showBreakdownToggle = false,
  isApproveContext = false
}: MobileTimecardGridProps) {

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

  // Format time for display (matching existing format)
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "—"

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
      return "—"
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
    
    try {
      // Parse the new value (could be simple time string or ISO)
      let newTime: Date;
      if (newValue.includes('T')) {
        // Full datetime string
        newTime = new Date(newValue)
      } else if (newValue.includes(':')) {
        // Simple time format (HH:MM:SS) - combine with today's date
        const today = new Date().toISOString().split('T')[0]
        const combinedDateTime = `${today}T${newValue}`
        newTime = new Date(combinedDateTime)
      } else {
        return "Invalid time format"
      }
      
      if (isNaN(newTime.getTime())) {
        return "Invalid time format"
      }
      
      // Get current values (including any edits) for the same day
      const getCurrentValue = (baseField: string): Date | null => {
        const relatedFieldId = dayIndex !== undefined ? `${baseField}_day_${dayIndex}` : baseField
        
        // First check if there's an edit for this field
        if (fieldEdits[relatedFieldId] !== undefined) {
          const value = fieldEdits[relatedFieldId]
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
          } else {
            return null
          }
          
          if (isNaN(date.getTime())) {
            return null
          }
          
          return date
        } catch (error) {
          return null
        }
      }
      
      // Determine which field we're updating
      const baseFieldName = fieldId.replace(/_day_\d+$/, '')
      
      // Apply the new value to the appropriate field
      const checkIn = baseFieldName === 'check_in_time' ? newTime : getCurrentValue('check_in_time')
      const breakStart = baseFieldName === 'break_start_time' ? newTime : getCurrentValue('break_start_time')
      const breakEnd = baseFieldName === 'break_end_time' ? newTime : getCurrentValue('break_end_time')
      const checkOut = baseFieldName === 'check_out_time' ? newTime : getCurrentValue('check_out_time')
      
      // Validate time sequence
      if (checkIn && breakStart && breakStart <= checkIn) {
        return "Break start must be after check-in time"
      }
      
      if (breakStart && breakEnd && breakEnd <= breakStart) {
        return "Break end must be after break start"
      }
      
      if (breakEnd && checkOut && checkOut <= breakEnd) {
        return "Check-out must be after break end"
      }
      
      if (checkIn && checkOut && checkOut <= checkIn) {
        return "Check-out must be after check-in time"
      }
      
      return null // No validation errors
    } catch (error) {
      return "Invalid time format"
    }
  }

  // Helper function to handle time change from CustomTimePicker
  const handleTimeChange = (fieldId: string, originalValue: any, newValue: string, dayIndex?: number) => {
    if (!onFieldEdit) return
    
    // Validate the new time value
    const validationError = validateTimeSequence(fieldId, newValue, dayIndex)
    
    if (validationError) {
      // Store error for inline display and prevent change
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: validationError
      }))
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
        <div className="flex flex-col items-center justify-center min-h-[2.5rem]">
          {isEditing && isRejectionMode ? (
            <div className="flex items-center justify-center h-full">
              <CustomTimePicker
                value={currentValue}
                onChange={(newValue) => handleTimeChange(fieldId, originalValue, newValue, dayIndex)}
                onBlur={handleTimePickerBlur}
                className="text-sm font-semibold leading-none text-center"
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
                className={`text-sm font-semibold m-0 text-center leading-none ${
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

  // Prepare day rows - use currentWeekEntries if provided for pagination
  const prepareDayRows = () => {
    const entriesToUse = currentWeekEntries || timecard.daily_entries || []
    
    if (entriesToUse.length > 0) {
      // Multi-day timecard - use provided entries (could be paginated week)
      return entriesToUse
        .sort((a, b) => {
          const dateA = parseDate(a.work_date)
          const dateB = parseDate(b.work_date)
          return (dateA?.getTime() || 0) - (dateB?.getTime() || 0)
        })
        .map(entry => {
          const date = parseDate(entry.work_date)
          const baseData = {
            date: entry.work_date,
            dayNumber: date ? date.toLocaleDateString('en-US', { day: 'numeric' }) : '0',
            monthAbbr: date ? date.toLocaleDateString('en-US', { month: 'short' }) : 'Jan',
            entry
          }
          
          // Add day of week only in approve context
          if (isApproveContext) {
            return {
              ...baseData,
              dayOfWeek: date ? date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : 'MON'
            }
          }
          
          return baseData
        })
    } else {
      // Single day timecard
      const date = timecard.date || timecard.period_start_date || new Date().toISOString()
      const parsedDate = parseDate(date)
      const baseData = {
        date,
        dayNumber: parsedDate?.toLocaleDateString('en-US', { day: 'numeric' }) || '0',
        monthAbbr: parsedDate?.toLocaleDateString('en-US', { month: 'short' }) || 'Jan',
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
      }
      
      // Add day of week only in approve context
      if (isApproveContext) {
        return [{
          ...baseData,
          dayOfWeek: parsedDate?.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() || 'MON',
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
      
      return [baseData]
    }
  }

  // Define time columns (horizontal axis on mobile)
  const timeColumns: TimeColumn[] = [
    {
      fieldType: 'check_in_time',
      label: 'Check In',
      icon: <Clock className="w-4 h-4 text-blue-600 dark:text-blue-500" />
    },
    {
      fieldType: 'break_start_time',
      label: 'Break Start',
      icon: <Coffee className="w-4 h-4 text-orange-600" />
    },
    {
      fieldType: 'break_end_time',
      label: 'Break End',
      icon: <Coffee className="w-4 h-4 text-orange-600" />
    },
    {
      fieldType: 'check_out_time',
      label: 'Check Out',
      icon: <Clock className="w-4 h-4 text-red-600" />
    }
  ]

  const isMultiDay = (timecard.daily_entries?.length || 0) > 1
  const needsPagination = totalWeeks > 1
  const dayRows = prepareDayRows()

  return (
    <div className={`lg:hidden ${showBreakdownToggle ? "pt-4" : ""}`}>
      {/* Week navigation for multi-week timecards */}
      {needsPagination && (
        <div className="mb-4 flex items-center justify-center p-3 bg-muted/50 rounded-lg border">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Week {currentWeekIndex + 1} of {totalWeeks}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onWeekChange && onWeekChange(Math.max(0, currentWeekIndex - 1))
                }}
                disabled={currentWeekIndex === 0}
                className="p-1.5 rounded-md bg-background border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous week"
              >
                <ChevronDown className="w-4 h-4 rotate-90 text-muted-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onWeekChange && onWeekChange(Math.min(totalWeeks - 1, currentWeekIndex + 1))
                }}
                disabled={currentWeekIndex >= totalWeeks - 1}
                className="p-1.5 rounded-md bg-background border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next week"
              >
                <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Column Headers (horizontal axis) */}
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `70px repeat(${timeColumns.length}, 1fr)` }}>
        {/* Empty corner cell */}
        <div className="p-2"></div>
        
        {/* Time column headers */}
        {timeColumns.map((timeCol, index) => (
          <div key={index} className="text-center">
            <div className="flex flex-col items-center gap-1 p-2 border rounded-lg border-border bg-muted/30">
              {timeCol.icon}
              <span className="text-xs font-medium text-muted-foreground">{timeCol.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Date Rows with Time Values */}
      <div className="space-y-2">
        {dayRows.map((day, dayIndex) => {
          // Calculate actual day index accounting for pagination
          let actualDayIndex = dayIndex
          if (needsPagination) {
            actualDayIndex = (currentWeekIndex * 7) + dayIndex
          }

          return (
            <div key={dayIndex} className="grid gap-2" style={{ gridTemplateColumns: `70px repeat(${timeColumns.length}, 1fr)` }}>
              {/* Date header (left column) - Compact format: MON 16 Sep (approve context) or 16 Sep (regular) */}
              <div className="flex items-center justify-center p-2 border rounded-lg border-border bg-card">
                <div className="text-center leading-tight space-y-0.5">
                  {isApproveContext && day.dayOfWeek && (
                    <div className="text-xs text-muted-foreground leading-none font-medium">
                      {day.dayOfWeek}
                    </div>
                  )}
                  <div className="text-lg font-bold text-foreground leading-none">
                    {day.dayNumber}
                  </div>
                  <div className="text-xs text-muted-foreground leading-none">
                    {day.monthAbbr}
                  </div>
                </div>
              </div>

              {/* Time value cells */}
              {timeColumns.map((timeCol, timeIndex) => {
                const fieldId = getFieldId(timeCol.fieldType, actualDayIndex)
                const originalValue = day.entry?.[timeCol.fieldType as keyof typeof day.entry]
                const isSelected = isFieldSelected(fieldId)
                const isEdited = isFieldEdited(fieldId, originalValue)
                const isEditing = isFieldEditing(fieldId)
                const currentValue = getFieldValue(fieldId, originalValue)
                const hasValidationError = validationErrors[fieldId]
                const hasValue = !!originalValue
                
                return (
                  <div
                    key={timeIndex}
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
                                  ? hasValue
                                    ? 'border-border bg-card hover:border-muted-foreground cursor-pointer'
                                    : 'border-dashed border-muted-foreground/30 bg-muted/30 hover:border-muted-foreground cursor-pointer'
                                  : hasValue
                                    ? 'border-border bg-card'
                                    : 'border-dashed border-muted-foreground/30 bg-muted/30'
                    }`}
                    onClick={() => !isEditing && handleFieldClick(fieldId)}
                  >
                    {day.entry ? 
                      renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, hasValue, actualDayIndex) :
                      <div className="flex items-center justify-center min-h-[2.5rem] text-muted-foreground text-sm">—</div>
                    }
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}