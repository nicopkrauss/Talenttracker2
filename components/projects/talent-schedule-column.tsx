"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { CircularDateSelector } from '@/components/ui/circular-date-selector'
import { Button } from '@/components/ui/button'
import { ProjectSchedule } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { validateScheduledDates, datesToISOStrings, isoStringsToDates } from '@/lib/schedule-utils'
import { Check, X } from 'lucide-react'

interface TalentScheduleColumnProps {
  talentId: string
  projectId: string
  projectSchedule: ProjectSchedule
  initialScheduledDates?: string[] // ISO date strings from database
  isGroup?: boolean
  disabled?: boolean
  onScheduleUpdate?: (talentId: string, scheduledDates: Date[]) => void
  onPendingChange?: (talentId: string, hasPendingChanges: boolean) => void
  onRegisterConfirm?: (talentId: string, confirmFn: () => Promise<void>) => void
  onUnregisterConfirm?: (talentId: string) => void
}

export function TalentScheduleColumn({
  talentId,
  projectId,
  projectSchedule,
  initialScheduledDates = [],
  isGroup = false,
  disabled = false,
  onScheduleUpdate,
  onPendingChange,
  onRegisterConfirm,
  onUnregisterConfirm
}: TalentScheduleColumnProps) {
  const { toast } = useToast()
  
  // Convert ISO strings to Date objects for internal state
  const [originalScheduledDates, setOriginalScheduledDates] = useState<Date[]>(
    isoStringsToDates(initialScheduledDates)
  )
  const [scheduledDates, setScheduledDates] = useState<Date[]>(
    isoStringsToDates(initialScheduledDates)
  )
  const [isUpdating, setIsUpdating] = useState(false)

  // Update state when initialScheduledDates prop changes (handles async data loading)
  useEffect(() => {
    const newDates = isoStringsToDates(initialScheduledDates)
    setOriginalScheduledDates(newDates)
    setScheduledDates(newDates)
  }, [initialScheduledDates])

  // Check if there are pending changes
  const hasPendingChanges = scheduledDates.length !== originalScheduledDates.length ||
    !scheduledDates.every(date => originalScheduledDates.some(orig => orig.getTime() === date.getTime()))

  // Notify parent about pending changes
  useEffect(() => {
    onPendingChange?.(talentId, hasPendingChanges)
  }, [hasPendingChanges, talentId, onPendingChange])

  const handleDateToggle = (date: Date) => {
    if (disabled || isUpdating) return

    // Validate that the date is within project range
    const validation = validateScheduledDates([date], projectSchedule)
    if (!validation.isValid) {
      toast({
        title: "Invalid Date",
        description: validation.errorMessage,
        variant: "destructive"
      })
      return
    }

    const isSelected = scheduledDates.some(d => d.getTime() === date.getTime())
    const isShowDay = projectSchedule.showDates.some(showDate => 
      showDate.getTime() === date.getTime()
    )

    if (isSelected) {
      // Remove the date
      const newScheduledDates = scheduledDates.filter(d => d.getTime() !== date.getTime())
      setScheduledDates(newScheduledDates)
    } else {
      // Add the date
      let newScheduledDates = [...scheduledDates, date]
      
      // If this is NOT a show day being selected, also auto-select show days
      if (!isShowDay && scheduledDates.length === 0) {
        // This is the first non-show day being selected, add show days too
        const showDatesToAdd = projectSchedule.showDates.filter(showDate => 
          !scheduledDates.some(selectedDate => 
            selectedDate.getTime() === showDate.getTime()
          )
        )
        newScheduledDates = [...newScheduledDates, ...showDatesToAdd]
      }
      
      setScheduledDates(newScheduledDates)
    }
  }

  const handleConfirm = useCallback(async () => {
    setIsUpdating(true)
    try {
      const endpoint = isGroup 
        ? `/api/projects/${projectId}/talent-groups/${talentId}/schedule`
        : `/api/projects/${projectId}/talent-roster/${talentId}/schedule`

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDates: datesToISOStrings(scheduledDates)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to update schedule'
        throw new Error(errorMessage)
      }

      // Update the original dates to match current selection
      setOriginalScheduledDates([...scheduledDates])
      
      onScheduleUpdate?.(talentId, scheduledDates)
      
      toast({
        title: "Success",
        description: "Schedule updated successfully"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update schedule",
        variant: "destructive"
      })
      
      // Re-throw the error so it can be caught by Promise.allSettled in handleConfirmAll
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [isGroup, projectId, talentId, scheduledDates, onScheduleUpdate, toast])

  // Register/unregister confirm function (after handleConfirm is defined)
  useEffect(() => {
    if (hasPendingChanges) {
      onRegisterConfirm?.(talentId, handleConfirm)
    } else {
      onUnregisterConfirm?.(talentId)
    }
    
    return () => {
      onUnregisterConfirm?.(talentId)
    }
  }, [hasPendingChanges, talentId, onRegisterConfirm, onUnregisterConfirm])

  const handleCancel = () => {
    // Revert to original dates
    setScheduledDates([...originalScheduledDates])
  }

  return (
    <div className="flex items-center justify-start gap-2 min-w-[140px]">
      <CircularDateSelector
        schedule={projectSchedule}
        selectedDates={scheduledDates}
        onDateToggle={handleDateToggle}
        disabled={disabled || isUpdating}
        size="sm"
        showDayDefault={true}
      />
      
      {/* Fixed width container for buttons to prevent layout shift */}
      <div className="flex gap-1 w-[60px] justify-start">
        {hasPendingChanges && !disabled && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={handleConfirm}
              disabled={isUpdating}
              className="h-7 w-7 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isUpdating}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}