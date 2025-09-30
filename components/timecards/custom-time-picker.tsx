'use client'

import React, { useState, useRef, useCallback } from 'react'

interface CustomTimePickerProps {
  value: string | null
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  style?: React.CSSProperties
  autoFocus?: boolean
}

type TimePart = 'hours' | 'minutes' | 'ampm'

interface TimeValue {
  hours: number
  minutes: number
  ampm: 'AM' | 'PM'
}

export function CustomTimePicker({ 
  value, 
  onChange, 
  onBlur, 
  className = '', 
  style,
  autoFocus = false 
}: CustomTimePickerProps) {
  const [highlightedPart, setHighlightedPart] = useState<TimePart>('hours')
  const [isFocused, setIsFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse time value from various formats
  const parseTimeValue = useCallback((timeString: string | null): TimeValue => {
    if (!timeString) {
      return { hours: 9, minutes: 0, ampm: 'AM' }
    }

    try {
      let date: Date
      if (timeString.includes('T')) {
        // Full datetime string
        date = new Date(timeString)
      } else if (timeString.includes(':')) {
        // Time-only format (HH:MM or HH:MM:SS)
        const today = new Date().toISOString().split('T')[0]
        date = new Date(`${today}T${timeString}`)
      } else {
        return { hours: 9, minutes: 0, ampm: 'AM' }
      }

      if (isNaN(date.getTime())) {
        return { hours: 9, minutes: 0, ampm: 'AM' }
      }

      const hours24 = date.getHours()
      const minutes = date.getMinutes()
      const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
      const ampm = hours24 >= 12 ? 'PM' : 'AM'

      return { hours: hours12, minutes, ampm }
    } catch {
      return { hours: 9, minutes: 0, ampm: 'AM' }
    }
  }, [])

  // Convert time value back to simple time string (matching database format)
  const formatTimeToString = useCallback((timeValue: TimeValue): string => {
    let hours24 = timeValue.hours
    if (timeValue.ampm === 'PM' && timeValue.hours !== 12) hours24 += 12
    if (timeValue.ampm === 'AM' && timeValue.hours === 12) hours24 = 0

    // Format as HH:MM:SS (simple time string)
    const hours = hours24.toString().padStart(2, '0')
    const minutes = timeValue.minutes.toString().padStart(2, '0')
    const seconds = '00' // Always use 00 for seconds
    
    return `${hours}:${minutes}:${seconds}`
  }, [])

  const currentTime = parseTimeValue(value)

  // Update time part with proper rollover logic
  const updateTimePart = useCallback((part: TimePart, newValue: number | string) => {
    console.log('🕐 CustomTimePicker updateTimePart called:', {
      part,
      newValue,
      currentTime: { ...currentTime },
      inputValue: value
    })
    
    const updatedTime = { ...currentTime }
    
    if (part === 'hours') {
      updatedTime.hours = Math.max(1, Math.min(12, Number(newValue)))
      console.log('🕐 Hours updated:', { oldHours: currentTime.hours, newHours: updatedTime.hours })
    } else if (part === 'minutes') {
      const minutes = Number(newValue)
      console.log('🕐 Minutes processing:', { 
        inputMinutes: minutes, 
        currentMinutes: currentTime.minutes,
        currentHour: currentTime.hours,
        currentAmPm: currentTime.ampm
      })
      
      if (minutes > 59) {
        // Roll over to next hour
        console.log('🕐 Minutes rollover forward detected (>59)')
        updatedTime.minutes = 0
        const oldHour = updatedTime.hours
        updatedTime.hours = updatedTime.hours === 12 ? 1 : updatedTime.hours + 1
        console.log('🕐 Hour rollover:', { oldHour, newHour: updatedTime.hours })
        
        // If we rolled from 11 to 12, flip AM/PM (11:59 AM -> 12:00 PM)
        if (oldHour === 11 && updatedTime.hours === 12) {
          const oldAmPm = updatedTime.ampm
          updatedTime.ampm = updatedTime.ampm === 'AM' ? 'PM' : 'AM'
          console.log('🕐 AM/PM flip (11->12):', { oldAmPm, newAmPm: updatedTime.ampm })
        }
        // Note: 12->1 rollover does NOT flip AM/PM (12:59 PM -> 1:00 PM, 12:59 AM -> 1:00 AM)
      } else if (minutes < 0) {
        // Roll back to previous hour
        console.log('🕐 Minutes rollover backward detected (<0)')
        updatedTime.minutes = 55
        const oldHour = updatedTime.hours
        updatedTime.hours = updatedTime.hours === 1 ? 12 : updatedTime.hours - 1
        console.log('🕐 Hour rollback:', { oldHour, newHour: updatedTime.hours })
        
        // If we rolled from 12 to 11, flip AM/PM (12:00 PM -> 11:55 AM)
        if (oldHour === 12 && updatedTime.hours === 11) {
          const oldAmPm = updatedTime.ampm
          updatedTime.ampm = updatedTime.ampm === 'AM' ? 'PM' : 'AM'
          console.log('🕐 AM/PM flip (12->11):', { oldAmPm, newAmPm: updatedTime.ampm })
        }
        // Note: 1->12 rollover does NOT flip AM/PM (1:00 AM -> 12:55 AM, 1:00 PM -> 12:55 PM)
      } else {
        updatedTime.minutes = minutes
        console.log('🕐 Minutes set normally:', { newMinutes: minutes })
      }
    } else if (part === 'ampm') {
      const oldAmPm = updatedTime.ampm
      updatedTime.ampm = String(newValue).toUpperCase() as 'AM' | 'PM'
      console.log('🕐 AM/PM changed manually:', { oldAmPm, newAmPm: updatedTime.ampm })
    }

    const timeString = formatTimeToString(updatedTime)
    console.log('🕐 CustomTimePicker Final result:', {
      updatedTime,
      timeString,
      willCallOnChange: true,
      onChangeFunction: typeof onChange
    })
    
    console.log('🕐 CustomTimePicker calling onChange with:', timeString)
    onChange(timeString)
    console.log('🕐 CustomTimePicker onChange called successfully')
  }, [currentTime, onChange, formatTimeToString])

  // Handle keyboard input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isFocused) return

    // Don't prevent default for Tab unless we're handling it specifically
    if (e.key !== 'Tab') {
      e.preventDefault()
    }

    if (e.key === 'ArrowRight') {
      if (highlightedPart === 'hours') {
        setHighlightedPart('minutes')
      } else if (highlightedPart === 'minutes') {
        setHighlightedPart('ampm')
      } else {
        setHighlightedPart('hours')
      }
    } else if (e.key === 'ArrowLeft') {
      if (highlightedPart === 'ampm') {
        setHighlightedPart('minutes')
      } else if (highlightedPart === 'minutes') {
        setHighlightedPart('hours')
      } else {
        setHighlightedPart('ampm')
      }
    } else if (e.key === 'Tab') {
      // Allow natural tab behavior but update highlight
      if (!e.shiftKey) {
        if (highlightedPart === 'hours') {
          setHighlightedPart('minutes')
        } else if (highlightedPart === 'minutes') {
          setHighlightedPart('ampm')
        }
        // Don't prevent default - let tab move to next field
      } else {
        // Shift+Tab - move backwards
        if (highlightedPart === 'ampm') {
          setHighlightedPart('minutes')
        } else if (highlightedPart === 'minutes') {
          setHighlightedPart('hours')
        }
        // Don't prevent default - let shift+tab move to previous field
      }
    } else if (e.key === 'ArrowUp') {
      console.log('🔼 ArrowUp pressed:', { highlightedPart, currentTime })
      if (highlightedPart === 'hours') {
        const newHours = currentTime.hours === 12 ? 1 : currentTime.hours + 1
        console.log('🔼 Hours increment:', { oldHours: currentTime.hours, newHours })
        
        // Handle AM/PM flip for direct hour changes
        if (currentTime.hours === 11 && newHours === 12) {
          // 11 AM -> 12 PM or 11 PM -> 12 AM
          const updatedTime = { ...currentTime }
          updatedTime.hours = 12
          updatedTime.ampm = currentTime.ampm === 'AM' ? 'PM' : 'AM'
          console.log('🔼 Direct hour AM/PM flip (11->12):', { 
            oldAmPm: currentTime.ampm, 
            newAmPm: updatedTime.ampm 
          })
          const timeString = formatTimeToString(updatedTime)
          onChange(timeString)
        } else {
          updateTimePart('hours', newHours)
        }
      } else if (highlightedPart === 'minutes') {
        // Round to nearest 5 and increment
        const roundedMinutes = Math.round(currentTime.minutes / 5) * 5
        const newMinutes = roundedMinutes + 5
        console.log('🔼 Minutes increment:', { 
          currentMinutes: currentTime.minutes, 
          roundedMinutes, 
          newMinutes,
          willTriggerRollover: newMinutes > 59
        })
        updateTimePart('minutes', newMinutes) // Let updateTimePart handle rollover
      } else if (highlightedPart === 'ampm') {
        const newAmPm = currentTime.ampm === 'AM' ? 'PM' : 'AM'
        console.log('🔼 AM/PM toggle:', { oldAmPm: currentTime.ampm, newAmPm })
        updateTimePart('ampm', newAmPm)
      }
    } else if (e.key === 'ArrowDown') {
      console.log('🔽 ArrowDown pressed:', { highlightedPart, currentTime })
      if (highlightedPart === 'hours') {
        const newHours = currentTime.hours === 1 ? 12 : currentTime.hours - 1
        console.log('🔽 Hours decrement:', { oldHours: currentTime.hours, newHours })
        
        // Handle AM/PM flip for direct hour changes
        if (currentTime.hours === 12 && newHours === 11) {
          // 12 PM -> 11 AM or 12 AM -> 11 PM
          const updatedTime = { ...currentTime }
          updatedTime.hours = 11
          updatedTime.ampm = currentTime.ampm === 'AM' ? 'PM' : 'AM'
          console.log('🔽 Direct hour AM/PM flip (12->11):', { 
            oldAmPm: currentTime.ampm, 
            newAmPm: updatedTime.ampm 
          })
          const timeString = formatTimeToString(updatedTime)
          onChange(timeString)
        } else {
          updateTimePart('hours', newHours)
        }
      } else if (highlightedPart === 'minutes') {
        // Round to nearest 5 and decrement
        const roundedMinutes = Math.round(currentTime.minutes / 5) * 5
        const newMinutes = roundedMinutes - 5
        console.log('🔽 Minutes decrement:', { 
          currentMinutes: currentTime.minutes, 
          roundedMinutes, 
          newMinutes,
          willTriggerRollover: newMinutes < 0
        })
        updateTimePart('minutes', newMinutes) // Let updateTimePart handle rollover
      } else if (highlightedPart === 'ampm') {
        const newAmPm = currentTime.ampm === 'AM' ? 'PM' : 'AM'
        console.log('🔽 AM/PM toggle:', { oldAmPm: currentTime.ampm, newAmPm })
        updateTimePart('ampm', newAmPm)
      }
    } else if (e.key >= '0' && e.key <= '9') {
      // Handle numeric input
      const digit = parseInt(e.key)
      
      if (highlightedPart === 'hours') {
        // For hours, allow 1-12, but also handle 10, 11, 12
        if (digit === 1) {
          // Could be 1, 10, 11, or 12 - start with 1 and let user continue
          updateTimePart('hours', 1)
        } else if (digit >= 2 && digit <= 9) {
          updateTimePart('hours', digit)
        }
      } else if (highlightedPart === 'minutes') {
        // For minutes, handle smart two-digit input
        if (digit <= 5) {
          // First digit of minutes (0-5 are valid tens digits)
          updateTimePart('minutes', digit * 10)
        } else {
          // If current minutes are 0-5 in tens place, complete the number
          const currentTens = Math.floor(currentTime.minutes / 10)
          if (currentTens <= 5) {
            const newMinutes = currentTens * 10 + digit
            if (newMinutes <= 59) {
              updateTimePart('minutes', newMinutes)
            }
          }
        }
      }
    } else if (e.key === 'a' || e.key === 'A') {
      if (highlightedPart === 'ampm') {
        updateTimePart('ampm', 'AM')
      }
    } else if (e.key === 'p' || e.key === 'P') {
      if (highlightedPart === 'ampm') {
        updateTimePart('ampm', 'PM')
      }
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      containerRef.current?.blur()
    }
  }, [highlightedPart, currentTime, updateTimePart, isFocused])

  // Handle clicks on different parts
  const handlePartClick = useCallback((part: TimePart) => {
    setHighlightedPart(part)
    setIsFocused(true)
  }, [])

  // Handle focus/blur
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    setHighlightedPart('hours')
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.()
  }, [onBlur])

  // Auto-focus if requested
  React.useEffect(() => {
    if (autoFocus && containerRef.current) {
      containerRef.current.focus()
    }
  }, [autoFocus])

  // Format display values (no leading zeros on hours)
  const hoursDisplay = currentTime.hours.toString()
  const minutesDisplay = currentTime.minutes.toString().padStart(2, '0')

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center cursor-pointer select-none focus:outline-none ${className}`}
      style={style}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="spinbutton"
      aria-label={`Time picker: ${hoursDisplay}:${minutesDisplay} ${currentTime.ampm}`}
      aria-valuenow={currentTime.hours * 60 + currentTime.minutes + (currentTime.ampm === 'PM' ? 720 : 0)}
      aria-valuetext={`${hoursDisplay}:${minutesDisplay} ${currentTime.ampm}`}
    >
      {/* Flexible layout that wraps when needed */}
      <div className="flex items-center flex-wrap justify-center leading-tight">
        {/* Hours */}
        <span
          className={`rounded transition-colors ${
            isFocused && highlightedPart === 'hours'
              ? 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
              : ''
          }`}
          onClick={() => handlePartClick('hours')}
          role="button"
          aria-label={`Hours: ${hoursDisplay}`}
        >
          {hoursDisplay}
        </span>
        {/* Colon */}
        <span className="select-none">:</span>
        {/* Minutes */}
        <span
          className={`rounded transition-colors ${
            isFocused && highlightedPart === 'minutes'
              ? 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
              : ''
          }`}
          onClick={() => handlePartClick('minutes')}
          role="button"
          aria-label={`Minutes: ${minutesDisplay}`}
        >
          {minutesDisplay}
        </span>
        {/* AM/PM with a small space */}
        <span
          className={`ml-1 rounded transition-colors ${
            isFocused && highlightedPart === 'ampm'
              ? 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
              : ''
          }`}
          onClick={() => handlePartClick('ampm')}
          role="button"
          aria-label={`AM or PM: ${currentTime.ampm}`}
        >
          {currentTime.ampm}
        </span>
      </div>
    </div>
  )
}