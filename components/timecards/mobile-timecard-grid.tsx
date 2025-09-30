"use client"

import { useState } from "react"

import { Clock, Coffee, AlertTriangle, ChevronDown } from "lucide-react"
import type { Timecard } from "@/lib/types"
import { parseDate } from "@/lib/timezone-utils"
import { CustomTimePicker } from "./custom-time-picker"
import { useMediaQuery } from "@/hooks/use-media-query"

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
  
  // Use CustomTimePicker for the upper end of tablet range (1024px-1279px)
  const useCustomTimePicker = useMediaQuery('(min-width: 1024px) and (max-width: 1279px)')

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

  // Format time for display (flexible format: one line when possible, wraps when needed)
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return { time: "—", ampm: "", fullTime: "—" }

    try {
      let date: Date
      // Handle both full datetime and time-only formats
      if (timeStr.includes('T')) {
        date = new Date(timeStr)
      } else {
        // Already in time format (HH:MM:SS)
        const today = new Date().toISOString().split('T')[0]
        date = new Date(`${today}T${timeStr}`)
      }

      const hours24 = date.getHours()
      const minutes = date.getMinutes()
      const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
      const ampm = hours24 >= 12 ? 'PM' : 'AM'
      const timeOnly = `${hours12}:${minutes.toString().padStart(2, '0')}`
      const fullTime = `${timeOnly} ${ampm}`

      return { time: timeOnly, ampm: ampm, fullTime: fullTime }
    } catch (error) {
      return { time: "—", ampm: "", fullTime: "—" }
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

  // Helper function to convert time to HH:MM format for native input
  const formatTimeForInput = (timeStr?: string) => {
    if (!timeStr) return ""
    
    try {
      let date: Date
      if (timeStr.includes('T')) {
        date = new Date(timeStr)
      } else {
        const today = new Date().toISOString().split('T')[0]
        date = new Date(`${today}T${timeStr}`)
      }
      
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch {
      return ""
    }
  }

  // Helper function to convert HH:MM format back to time string with 5-minute rounding
  const formatTimeFromInput = (inputValue: string) => {
    if (!inputValue) return ""
    
    // Parse the time and round to nearest 5 minutes
    const [hours, minutes] = inputValue.split(':').map(Number)
    const roundedMinutes = Math.round(minutes / 5) * 5
    
    // Handle minute overflow (e.g., 59 minutes rounds to 60)
    let finalHours = hours
    let finalMinutes = roundedMinutes
    
    if (finalMinutes >= 60) {
      finalHours = (hours + 1) % 24
      finalMinutes = 0
    }
    
    // Format back to HH:MM:SS
    const hoursStr = finalHours.toString().padStart(2, '0')
    const minutesStr = finalMinutes.toString().padStart(2, '0')
    
    return `${hoursStr}:${minutesStr}:00`
  }

  // Helper function to round time to 5-minute intervals for display
  const roundTimeToFiveMinutes = (timeStr: string) => {
    if (!timeStr) return timeStr
    
    try {
      let date: Date
      if (timeStr.includes('T')) {
        date = new Date(timeStr)
      } else {
        const today = new Date().toISOString().split('T')[0]
        date = new Date(`${today}T${timeStr}`)
      }
      
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const roundedMinutes = Math.round(minutes / 5) * 5
      
      // Handle overflow
      let finalHours = hours
      let finalMinutes = roundedMinutes
      
      if (finalMinutes >= 60) {
        finalHours = (hours + 1) % 24
        finalMinutes = 0
      }
      
      const hoursStr = finalHours.toString().padStart(2, '0')
      const minutesStr = finalMinutes.toString().padStart(2, '0')
      
      return `${hoursStr}:${minutesStr}:00`
    } catch {
      return timeStr
    }
  }

  // Helper component to render editable time field with validation
  const renderTimeField = (fieldId: string, originalValue: any, currentValue: any, isEdited: boolean, isEditing: boolean, hasValue: boolean = true, dayIndex?: number) => {
    const validationError = validationErrors[fieldId]

    return (
      <div className="relative w-full">
        <div className="flex flex-col items-center justify-center min-h-[2.5rem] w-full">
          {isEditing && isRejectionMode ? (
            <div className="flex items-center justify-center h-full">
              {useCustomTimePicker ? (
                /* CustomTimePicker for upper tablet range (1024px-1279px) */
                <CustomTimePicker
                  value={currentValue}
                  onChange={(newValue) => handleTimeChange(fieldId, originalValue, newValue, dayIndex)}
                  onBlur={handleTimePickerBlur}
                  className="text-sm font-semibold leading-none"
                  autoFocus
                />
              ) : (
                <>
                  {/* Native time input for mobile and lower tablet range */}
                  <input
                    type="time"
                    step="300"
                    value={formatTimeForInput(roundTimeToFiveMinutes(currentValue))}
                    onChange={(e) => {
                      const newValue = formatTimeFromInput(e.target.value)
                      handleTimeChange(fieldId, originalValue, newValue, dayIndex)
                    }}
                    onBlur={handleTimePickerBlur}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    autoFocus
                    title="Times are automatically rounded to 5-minute intervals"
                    aria-label="Select time (rounded to 5-minute intervals)"
                  />
                  {/* Visual display that matches the non-editing state */}
                  <div className="text-sm font-semibold text-center leading-tight pointer-events-none">
                    {(() => {
                      const timeData = formatTime(currentValue)
                      return (
                        <div className="flex items-center justify-center flex-wrap">
                          <span>{timeData.time}</span>
                          {timeData.ampm && <span className="ml-1 text-xs">{timeData.ampm}</span>}
                        </div>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[2.5rem] gap-0 w-full">
              {/* Show original time above current time when edited */}
              {isEdited && (
                <div className="text-xs text-muted-foreground line-through text-center leading-tight whitespace-nowrap mb-1">
                  {(() => {
                    const timeData = formatTime(originalValue)
                    return (
                      <div className="flex items-center justify-center flex-wrap">
                        <span>{timeData.time}</span>
                        {timeData.ampm && <span className="ml-1">{timeData.ampm}</span>}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Current time value - flexible format */}
              <div
                className={`text-sm font-semibold m-0 text-center leading-tight ${isRejectionMode ? 'cursor-pointer' : ''
                  } ${validationError
                    ? 'text-red-600 dark:text-red-400'
                    : isEdited
                      ? 'text-red-600 dark:text-red-400'
                      : hasValue
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }`}
                onClick={() => handleFieldClick(fieldId)}
              >
                {(() => {
                  const timeData = formatTime(currentValue)
                  return (
                    <div className="flex items-center justify-center flex-wrap">
                      <span>{timeData.time}</span>
                      {timeData.ampm && <span className="ml-1 text-xs">{timeData.ampm}</span>}
                    </div>
                  )
                })()}
              </div>
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
    if (isCalendarWeekMode) {
      // Calendar week mode - always create 7 rows (Sun-Sat) with some potentially empty
      const weekStart = new Date()
      if (timecard.daily_entries && timecard.daily_entries.length > 0) {
        // Find the first date in current week entries
        const firstEntry = currentWeekEntries?.find(entry => entry !== null)
        if (firstEntry) {
          const firstDate = parseDate(firstEntry.work_date)
          if (firstDate) {
            weekStart.setTime(firstDate.getTime())
            weekStart.setDate(firstDate.getDate() - firstDate.getDay()) // Go to Sunday
          }
        }
      }
      
      const rows = []
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart)
        dayDate.setDate(weekStart.getDate() + i)
        const dayKey = dayDate.toISOString().split('T')[0]
        
        // Find entry for this specific date
        const dayEntry = currentWeekEntries?.find(entry => entry && entry.work_date === dayKey)
        
        const baseData = {
          date: dayKey,
          dayNumber: dayDate.toLocaleDateString('en-US', { day: 'numeric' }),
          monthAbbr: dayDate.toLocaleDateString('en-US', { month: 'short' }),
          entry: dayEntry || null
        }

        // Add day of week only in approve context
        if (isApproveContext) {
          rows.push({
            ...baseData,
            dayOfWeek: dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
          })
        } else {
          rows.push(baseData)
        }
      }
      
      return rows
    }

    const entriesToUse = currentWeekEntries || timecard.daily_entries || []

    if (entriesToUse.length > 0) {
      // Multi-day timecard - use provided entries (could be paginated week)
      return entriesToUse
        .filter(entry => entry !== null) // Filter out null entries for non-calendar mode
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
          dayOfWeek: parsedDate?.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() || 'MON'
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
    <div className={`xl:hidden ${showBreakdownToggle ? "pt-4" : ""}`}>
      {/* Time Column Headers (horizontal axis) */}
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `70px repeat(${timeColumns.length}, 1fr)` }}>
        {/* Week navigation in top left corner */}
        <div className="p-2">
          {needsPagination && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground text-center">
                Week
              </span>
              <span className="text-xs font-medium text-muted-foreground text-center">
                {currentWeekIndex + 1} of {totalWeeks}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onWeekChange && onWeekChange(Math.max(0, currentWeekIndex - 1))
                  }}
                  disabled={currentWeekIndex === 0}
                  className="p-1 rounded-md bg-background border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous week"
                >
                  <ChevronDown className="w-3 h-3 rotate-90 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onWeekChange && onWeekChange(Math.min(totalWeeks - 1, currentWeekIndex + 1))
                  }}
                  disabled={currentWeekIndex >= totalWeeks - 1}
                  className="p-1 rounded-md bg-background border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next week"
                >
                  <ChevronDown className="w-3 h-3 -rotate-90 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>

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
          
          // Only calculate field IDs for days that have entries
          if (day.entry) {
            if (isCalendarWeekMode && timecard.daily_entries) {
              // In calendar week mode, find the actual index in the original daily_entries array
              const originalIndex = timecard.daily_entries.findIndex(entry => 
                entry.work_date === day.entry?.work_date
              )
              actualDayIndex = originalIndex >= 0 ? originalIndex : dayIndex
            } else if (needsPagination) {
              actualDayIndex = (currentWeekIndex * 7) + dayIndex
            }
          }

          return (
            <div key={dayIndex} className="grid gap-2" style={{ gridTemplateColumns: `70px repeat(${timeColumns.length}, 1fr)` }}>
              {/* Date header (left column) - Compact format: MON 16 Sep (approve context) or 16 Sep (regular) */}
              <div className={`flex items-center justify-center p-2 border rounded-lg ${
                day.entry 
                  ? 'border-border bg-muted/30' 
                  : 'border-muted-foreground/30 bg-muted/10'
              }`}>
                <div className="text-center leading-tight space-y-0.5">
                  {isApproveContext && day.dayOfWeek && (
                    <div className="text-xs text-muted-foreground leading-none font-medium">
                      {day.dayOfWeek}
                    </div>
                  )}
                  <div className={`text-lg font-bold leading-none ${
                    day.entry ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {day.dayNumber}
                  </div>
                  <div className="text-xs text-muted-foreground leading-none">
                    {day.monthAbbr}
                  </div>
                </div>
              </div>

              {/* Time value cells */}
              {timeColumns.map((timeCol, timeIndex) => {
                // Only create field IDs for days that have entries
                const fieldId = day.entry ? getFieldId(timeCol.fieldType, actualDayIndex) : null
                const originalValue = day.entry?.[timeCol.fieldType as keyof typeof day.entry]
                const isSelected = fieldId ? isFieldSelected(fieldId) : false
                const isEdited = fieldId ? isFieldEdited(fieldId, originalValue) : false
                const isEditing = fieldId ? isFieldEditing(fieldId) : false
                const currentValue = fieldId ? getFieldValue(fieldId, originalValue) : originalValue
                const hasValidationError = fieldId ? validationErrors[fieldId] : false
                const hasValue = !!originalValue

                return (
                  <div
                    key={timeIndex}
                    className={`p-3 rounded-lg border transition-all relative flex items-center justify-center ${
                      !day.entry
                        ? 'border-muted-foreground/30 bg-muted/10'
                        : hasValidationError
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : isEditing
                            ? 'border-red-500 bg-red-100 dark:bg-red-900/30 cursor-text shadow-lg'
                            : isEdited
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                              : isSelected
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/20 cursor-pointer'
                                : fieldId && isFieldRejected(fieldId)
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                  : isRejectionMode && fieldId
                                    ? hasValue
                                      ? 'border-border hover:border-muted-foreground cursor-pointer'
                                      : 'border-muted-foreground/30 hover:border-muted-foreground cursor-pointer'
                                    : hasValue
                                      ? 'border-border'
                                      : 'border-muted-foreground/30'
                    }`}
                    onClick={() => !isEditing && fieldId && handleFieldClick(fieldId)}
                  >
                    {day.entry && fieldId ?
                      renderTimeField(fieldId, originalValue, currentValue, isEdited, isEditing, hasValue, actualDayIndex) :
                      <div className="flex items-center justify-center min-h-[2.5rem] text-muted-foreground text-sm w-full">—</div>
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