"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CircularDateSelector, CircularDateSelectorLegend } from '@/components/ui/circular-date-selector'
import { ProjectSchedule } from '@/lib/types'
import { TeamAssignment } from '@/lib/types'
import { Calendar, User } from 'lucide-react'

interface AvailabilityPopupProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (availableDates: Date[]) => void
  teamMember: TeamAssignment
  projectSchedule: ProjectSchedule
  initialAvailability?: Date[]
  isLoading?: boolean
}

export function AvailabilityPopup({
  isOpen,
  onClose,
  onConfirm,
  teamMember,
  projectSchedule,
  initialAvailability = [],
  isLoading = false
}: AvailabilityPopupProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>(initialAvailability)

  // Reset selected dates when popup opens with new data
  React.useEffect(() => {
    if (isOpen) {
      if (initialAvailability.length > 0) {
        // If editing existing availability, use that
        setSelectedDates(initialAvailability)
      } else {
        // If new confirmation, default to show days selected
        setSelectedDates([...projectSchedule.showDates])
      }
    }
  }, [isOpen, initialAvailability, projectSchedule.showDates])

  const handleDateToggle = (date: Date) => {
    setSelectedDates(prev => {
      const isSelected = prev.some(selectedDate => 
        selectedDate.getTime() === date.getTime()
      )
      
      if (isSelected) {
        return prev.filter(selectedDate => 
          selectedDate.getTime() !== date.getTime()
        )
      } else {
        return [...prev, date]
      }
    })
  }

  const handleConfirm = () => {
    onConfirm(selectedDates)
  }

  const handleCancel = () => {
    setSelectedDates(initialAvailability)
    onClose()
  }

  const handleSelectAll = () => {
    setSelectedDates([...projectSchedule.allDates])
  }

  const handleClearAll = () => {
    setSelectedDates([])
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Confirm Availability - {teamMember.profiles.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Select the days when <strong>{teamMember.profiles.full_name}</strong> will be available for this project.
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isLoading}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={isLoading}
            >
              Clear All
            </Button>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Project Schedule
            </div>
            
            <CircularDateSelector
              schedule={projectSchedule}
              selectedDates={selectedDates}
              onDateToggle={handleDateToggle}
              disabled={isLoading}
              size="lg"
            />
            
            <CircularDateSelectorLegend />
          </div>


        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Confirming...' : 'Confirm Availability'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}