"use client"

import { useState } from "react"
import { Edit3 } from "lucide-react"
import { CustomTimePicker } from "./custom-time-picker"

interface SimpleEditableFieldProps {
  fieldId: string
  originalValue: string | null
  label: string
  isRejectionMode: boolean
  fieldEdits: Record<string, any>
  onFieldEdit: (fieldId: string, newValue: any) => void
  // Additional context for validation
  allFieldValues?: {
    check_in_time?: string | null
    break_start_time?: string | null
    break_end_time?: string | null
    check_out_time?: string | null
  }
}

export function SimpleEditableField({
  fieldId,
  originalValue,
  label,
  isRejectionMode,
  fieldEdits,
  onFieldEdit,
  allFieldValues
}: SimpleEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Get the current value (either edited value or original)
  const currentValue = fieldEdits[fieldId] !== undefined ? fieldEdits[fieldId] : originalValue
  
  // Helper function to normalize time values for comparison
  // Extract only the time portion (HH:MM:SS) to avoid date-based comparison issues
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
  
  // A field is considered "edited" only if the current value differs from original
  // This handles the case where a field was edited but then reverted to original
  const isEdited = normalizeTimeValue(currentValue) !== normalizeTimeValue(originalValue)

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





  const handleFieldClick = () => {
    if (isRejectionMode && !isEditing) {
      setIsEditing(true)
    }
  }

  // Helper function to extract base field name from multi-day field IDs
  const getBaseFieldName = (fieldId: string): string => {
    // Handle multi-day field IDs like "check_in_time_day_1" -> "check_in_time"
    const baseFields = ['check_in_time', 'break_start_time', 'break_end_time', 'check_out_time']
    for (const baseField of baseFields) {
      if (fieldId.startsWith(baseField)) {
        return baseField
      }
    }
    return fieldId
  }

  // Helper function to get related field ID for the same day
  const getRelatedFieldId = (baseFieldName: string): string => {
    // If current fieldId is multi-day (e.g., "check_in_time_day_1"), 
    // return the related field with the same day suffix
    if (fieldId.includes('_day_')) {
      const daySuffix = fieldId.substring(fieldId.indexOf('_day_'))
      return baseFieldName + daySuffix
    }
    return baseFieldName
  }

  // Validation function for time sequence
  const validateTimeSequence = (newValue: string): string | null => {
    console.log('🔍 Validation started:', {
      fieldId,
      newValue,
      newValueType: typeof newValue,
      newValueLength: newValue?.length,
      includesColon: newValue?.includes(':'),
      includesT: newValue?.includes('T'),
      allFieldValues,
      fieldEdits,
      hasContext: !!allFieldValues
    })
    
    if (!allFieldValues) {
      console.log('🔍 Validation skipped: no context provided')
      return null // Skip validation if no context provided
    }
    
    try {
      // Parse the new value (could be simple time string or ISO)
      let newTime: Date;
      if (newValue.includes('T')) {
        console.log('🔍 Parsing as ISO datetime')
        // Full datetime string
        newTime = new Date(newValue)
      } else if (newValue.includes(':')) {
        console.log('🔍 Parsing as simple time format')
        // Simple time format (HH:MM:SS) - combine with today's date
        const today = new Date().toISOString().split('T')[0]
        const combinedDateTime = `${today}T${newValue}`
        console.log('🔍 Combined datetime:', combinedDateTime)
        newTime = new Date(combinedDateTime)
      } else {
        console.log('🔍 Validation failed: invalid time format - no T or colon found')
        return "Invalid time format"
      }
      
      console.log('🔍 Parsed date:', {
        newTime: newTime.toString(),
        isValid: !isNaN(newTime.getTime()),
        timeValue: newTime.getTime()
      })
      
      if (isNaN(newTime.getTime())) {
        console.log('🔍 Validation failed: parsed date is NaN')
        return "Invalid time format"
      }
      
      // Get current values (including any edits) for the same day
      const getCurrentValue = (baseField: string): Date | null => {
        const relatedFieldId = getRelatedFieldId(baseField)
        console.log('🔍 Getting current value for:', { baseField, relatedFieldId })
        
        // First check if there's an edit for this field
        if (fieldEdits[relatedFieldId] !== undefined) {
          const value = fieldEdits[relatedFieldId]
          console.log('🔍 Found edit value:', { relatedFieldId, value })
          if (!value) return null
          
          // Parse the value (could be simple time string or ISO)
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
        
        // Parse the original value (could be simple time string or ISO)
        if (value.includes('T')) {
          return new Date(value)
        } else if (value.includes(':')) {
          const today = new Date().toISOString().split('T')[0]
          return new Date(`${today}T${value}`)
        }
        return null
      }
      
      // Determine which field we're updating
      const baseFieldName = getBaseFieldName(fieldId)
      console.log('🔍 Field mapping:', { fieldId, baseFieldName })
      
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
      
      // Additional validations
      if (breakStart && breakEnd) {
        const diffMs = breakEnd.getTime() - breakStart.getTime()
        const diffMinutes = diffMs / (1000 * 60)
        console.log('🔍 Break duration:', { diffMinutes })
        if (diffMinutes > 120) {
          return "Break duration cannot exceed 2 hours"
        }
      }
      
      if (checkIn && checkOut) {
        const diffMs = checkOut.getTime() - checkIn.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        console.log('🔍 Shift duration:', { diffHours })
        if (diffHours > 16) {
          return "Shift duration cannot exceed 16 hours"
        }
        if (diffHours < 0.25) {
          return "Shift duration must be at least 15 minutes"
        }
      }
      
      console.log('🔍 Validation passed: no errors found')
      return null // No validation errors
    } catch (error) {
      console.log('🔍 Validation error (exception):', error)
      return "Invalid time format"
    }
  }

  const handleTimeChange = (newValue: string) => {
    console.log('📝 SimpleEditableField handleTimeChange:', {
      fieldId,
      newValue,
      originalValue,
      currentValue,
      isRejectionMode,
      allFieldValues,
      newValueType: typeof newValue,
      newValueLength: newValue?.length,
      includesColon: newValue?.includes(':'),
      includesT: newValue?.includes('T')
    })
    
    // Validate the new time value
    const validationResult = validateTimeSequence(newValue)
    console.log('📝 Validation result:', { validationResult })
    setValidationError(validationResult)
    
    // If validation fails, show error but don't apply the change
    if (validationResult) {
      console.log('📝 Validation failed - preventing change:', validationResult)
      return // Don't apply the change
    }
    
    // Use same normalization logic for consistent comparison
    const normalizeTimeForComparison = (timeValue: string | null | undefined): string | null => {
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
    
    const normalizedNew = normalizeTimeForComparison(newValue)
    const normalizedOriginal = normalizeTimeForComparison(originalValue)
    
    console.log('📝 Normalization:', {
      newValue,
      normalizedNew,
      originalValue,
      normalizedOriginal,
      isSameAsOriginal: normalizedNew === normalizedOriginal
    })
    
    if (normalizedNew === normalizedOriginal) {
      console.log('📝 Removing edit (same as original)')
      onFieldEdit(fieldId, undefined) // Remove edit if same as original
    } else {
      console.log('📝 Adding/updating edit')
      onFieldEdit(fieldId, newValue) // Add/update edit
    }
  }

  const handleInputBlur = () => {
    setIsEditing(false)
    // Clear validation error when user finishes editing
    setTimeout(() => setValidationError(null), 3000) // Clear after 3 seconds
  }



  const getFieldStyles = () => {
    let baseStyles = "p-3 rounded-lg border transition-all "
    
    // Add error styling if there's a validation error
    if (validationError) {
      baseStyles += "border-red-500 bg-red-50 dark:bg-red-950/20 "
    } else if (isRejectionMode) {
      if (isEditing) {
        baseStyles += "border-2 border-blue-500 bg-blue-100 dark:bg-blue-900/30 cursor-text shadow-lg "
      } else if (isEdited) {
        baseStyles += "border-blue-500 bg-blue-50 dark:bg-blue-950/20 cursor-pointer "
      } else {
        baseStyles += "border-border bg-card hover:border-red-200 hover:bg-red-50 cursor-pointer "
      }
    } else {
      if (originalValue) {
        baseStyles += "border-border bg-card "
      } else {
        baseStyles += "border-dashed border-muted-foreground/30 bg-muted/30 "
      }
    }

    return baseStyles
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div
        className={getFieldStyles()}
        onClick={handleFieldClick}
      >
        <div className="relative" style={{ minHeight: '72px' }}>
          {isEdited && !isEditing && (
            <div className="absolute -top-1 left-0 text-xs text-muted-foreground line-through">
              Original: {formatTime(originalValue)}
            </div>
          )}
          
          <div className="flex flex-col justify-center" style={{ height: '72px' }}>
            {isEditing ? (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                    Editing
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <CustomTimePicker
                    value={currentValue}
                    onChange={handleTimeChange}
                    onBlur={handleInputBlur}
                    className="text-lg font-semibold"
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <p className={`text-lg font-semibold text-center ${
                  isEdited 
                    ? 'text-red-600 dark:text-red-400' 
                    : originalValue 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                }`}>
                  {formatTime(currentValue)}
                </p>
                {isRejectionMode && (
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    {isEdited ? '✏️ Modified' : 'Tap to edit'}
                  </div>
                )}
                {validationError && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1 text-center font-medium">
                    ⚠️ {validationError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}