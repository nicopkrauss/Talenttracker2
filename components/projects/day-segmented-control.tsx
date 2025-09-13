"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ProjectSchedule, getDayType } from '@/lib/schedule-utils'

interface DaySegmentedControlProps {
  projectSchedule: ProjectSchedule
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  className?: string
}

export function DaySegmentedControl({
  projectSchedule,
  selectedDate,
  onDateSelect,
  className
}: DaySegmentedControlProps) {
  const formatDateForDisplay = (date: Date): string => {
    const dayType = getDayType(date, projectSchedule)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const dayNumber = date.getDate()
    
    return `${dayName} ${dayNumber}${dayType === 'show' ? ' (Show)' : ''}`
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {projectSchedule.allDates.map((date) => {
        const isSelected = selectedDate?.getTime() === date.getTime()
        const dayType = getDayType(date, projectSchedule)
        
        return (
          <Button
            key={date.getTime()}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onDateSelect(date)}
            className={cn(
              "min-w-[80px] transition-colors",
              dayType === 'show' && !isSelected && "border-primary/50 text-primary",
              dayType === 'show' && isSelected && "bg-primary text-primary-foreground"
            )}
          >
            {formatDateForDisplay(date)}
          </Button>
        )
      })}
    </div>
  )
}