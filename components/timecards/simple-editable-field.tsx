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
  
  const isEdited = fieldEdits[fieldId] !== undefined
  const currentValue = fieldEdits[fieldId] || originalValue

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
    if (timeValue) {
      // Convert HH:MM to full datetime string
      const today = new Date()
      const [hours, minutes] = timeValue.split(':')
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      onFieldEdit(fieldId, today.toISOString())
    } else {
      onFieldEdit(fieldId, null)
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