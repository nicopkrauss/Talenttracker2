'use client'

import React, { useState } from 'react'
import { CustomTimePicker } from './custom-time-picker'

interface EditableTimeFieldProps {
  fieldId: string
  originalValue: string | null
  currentValue: string | null
  isEdited: boolean
  onEdit: (fieldId: string, value: string) => void
  onCancel: (fieldId: string) => void
  className?: string
  style?: React.CSSProperties
}

export function EditableTimeField({
  fieldId,
  originalValue,
  currentValue,
  isEdited,
  onEdit,
  onCancel,
  className = '',
  style
}: EditableTimeFieldProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Format time for display (matching existing format)
  const formatTime = (timeStr?: string | null) => {
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

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleTimeChange = (newValue: string) => {
    onEdit(fieldId, newValue)
  }

  const handleBlur = () => {
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    onCancel(fieldId)
  }

  const displayValue = currentValue || originalValue

  return (
    <div 
      className={`flex items-center justify-center relative ${className}`} 
      style={{ height: '28px', ...style }}
    >
      {/* Show original value when edited */}
      {isEdited && !isEditing && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground line-through leading-none whitespace-nowrap">
          {formatTime(originalValue)}
        </div>
      )}
      
      <div className="relative w-full flex items-center justify-center" style={{ height: '28px' }}>
        {isEditing ? (
          <CustomTimePicker
            value={displayValue}
            onChange={handleTimeChange}
            onBlur={handleBlur}
            className="text-lg font-semibold"
            autoFocus
          />
        ) : (
          <p 
            className={`text-lg font-semibold m-0 text-center cursor-pointer ${
              isEdited 
                ? 'text-red-600 dark:text-red-400' 
                : displayValue 
                  ? 'text-foreground' 
                  : 'text-muted-foreground'
            }`}
            style={{ height: '28px', lineHeight: '28px' }}
            onClick={handleStartEdit}
          >
            {formatTime(displayValue)}
          </p>
        )}
      </div>
    </div>
  )
}