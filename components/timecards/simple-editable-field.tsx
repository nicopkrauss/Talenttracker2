"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Edit3 } from "lucide-react"

interface SimpleEditableFieldProps {
  fieldId: string
  originalValue: string | null | undefined
  label: string
  isRejectionMode: boolean
  fieldEdits: Record<string, any>
  onFieldEdit: (fieldId: string, newValue: any) => void
}

export function SimpleEditableField({
  fieldId,
  originalValue,
  label,
  isRejectionMode,
  fieldEdits,
  onFieldEdit
}: SimpleEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  
  // Check if field has been edited AND the value is different from original
  const hasFieldEdit = fieldEdits[fieldId] !== undefined
  const currentValue = fieldEdits[fieldId] || originalValue
  
  // Helper function to normalize time values for comparison
  const normalizeTimeValue = (timeValue: string | null | undefined): string | null => {
    if (!timeValue) return null
    // Convert to ISO string for consistent comparison
    try {
      return new Date(timeValue).toISOString()
    } catch {
      return null
    }
  }
  
  // A field is considered "edited" only if it has been modified AND the value differs from original
  const isEdited = hasFieldEdit && 
    normalizeTimeValue(currentValue) !== normalizeTimeValue(originalValue)

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "Not Recorded"
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatTimeForInput = (timeString: string | null) => {
    if (!timeString) return ""
    const date = new Date(timeString)
    return date.toTimeString().slice(0, 5) // HH:MM format
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value
    let newValue: string | null = null
    
    if (timeValue) {
      // Convert HH:MM to full datetime string
      const today = new Date()
      const [hours, minutes] = timeValue.split(':')
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      newValue = today.toISOString()
    }
    
    // Check if the new value matches the original value
    const normalizedNew = normalizeTimeValue(newValue)
    const normalizedOriginal = normalizeTimeValue(originalValue)
    
    if (normalizedNew === normalizedOriginal) {
      // Value matches original, remove from fieldEdits to clear highlighting
      onFieldEdit(fieldId, undefined)
    } else {
      // Value is different from original, add/update in fieldEdits
      onFieldEdit(fieldId, newValue)
    }
  }

  const handleFieldClick = () => {
    if (isRejectionMode && !isEditing) {
      setIsEditing(true)
    }
  }

  const handleInputBlur = () => {
    setIsEditing(false)
  }

  const getFieldStyles = () => {
    let baseStyles = "p-3 rounded-lg border transition-all "
    
    if (isRejectionMode) {
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
        {isEditing ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Edit3 className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                Editing
              </span>
            </div>
            <Input
              type="time"
              value={formatTimeForInput(currentValue)}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="border-0 p-0 h-auto bg-transparent text-lg font-semibold"
              autoFocus
            />
          </div>
        ) : (
          <div>
            {isEdited && (
              <div className="text-xs text-muted-foreground line-through mb-1">
                Original: {formatTime(originalValue)}
              </div>
            )}
            <p className={`text-lg font-semibold ${
              isEdited 
                ? 'text-red-600 dark:text-red-400' 
                : originalValue 
                  ? 'text-foreground' 
                  : 'text-muted-foreground'
            }`}>
              {formatTime(currentValue)}
            </p>
            {isRejectionMode && (
              <div className="text-xs text-gray-500 mt-1">
                {isEdited ? '✏️ Modified' : 'Tap to edit'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}