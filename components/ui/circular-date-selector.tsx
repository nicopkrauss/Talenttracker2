"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { ProjectSchedule } from '@/lib/types'
import { getDayType } from '@/lib/schedule-utils'

interface CircularDateSelectorProps {
  schedule: ProjectSchedule
  selectedDates: Date[]
  onDateToggle: (date: Date) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  showDayDefault?: boolean // Enable show day default behavior
}

export function CircularDateSelector({
  schedule,
  selectedDates,
  onDateToggle,
  className,
  size = 'md',
  disabled = false,
  showDayDefault = false
}: CircularDateSelectorProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => 
      selectedDate.getTime() === date.getTime()
    )
  }

  // Helper function to determine if show day should be greyed out (suggested but not selected)
  const isShowDayGreyedOut = (date: Date) => {
    if (!showDayDefault) return false
    
    const isShowDay = schedule.showDates.some(showDate => 
      showDate.getTime() === date.getTime()
    )
    
    const isSelected = isDateSelected(date)
    
    // Show day is greyed out if it's a show day, not selected, and no other dates are selected
    return isShowDay && !isSelected && selectedDates.length === 0
  }

  const formatDateDisplay = (date: Date) => {
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {schedule.allDates.map((date, index) => {
        const isSelected = isDateSelected(date)
        const isGreyedOut = isShowDayGreyedOut(date)
        const dayType = getDayType(date, schedule)
        const isShowDay = schedule.showDates.some(showDate => 
          showDate.getTime() === date.getTime()
        )
        
        return (
          <button
            key={date.getTime()}
            type="button"
            disabled={disabled}
            onClick={() => onDateToggle(date)}
            className={cn(
              "rounded-full border-2 transition-all duration-200 flex items-center justify-center font-medium",
              sizeClasses[size],
              disabled 
                ? "opacity-50 cursor-not-allowed" 
                : "cursor-pointer hover:scale-105",
              isSelected 
                ? "bg-primary border-primary text-primary-foreground"
                : isGreyedOut
                ? "bg-muted/50 border-muted text-muted-foreground"
                : "bg-transparent border-border text-foreground hover:border-primary/50"
            )}
            title={showDayDefault && isShowDay 
              ? `${date.toLocaleDateString()} (Show Day)` 
              : date.toLocaleDateString()
            }
          >
            {formatDateDisplay(date)}
          </button>
        )
      })}
    </div>
  )
}

// Simple legend component (optional)
export function CircularDateSelectorLegend({ className }: { className?: string }) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Click dates to select/deselect availability
    </div>
  )
}