"use client"

import React from 'react'
import { Users2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssignmentDropdown } from './assignment-dropdown'
import { 
  FloaterAssignment as FloaterAssignmentType, 
  EscortAvailabilityStatus, 
  ProjectSchedule
} from '@/lib/types'

interface FloaterAssignmentProps {
  floater: FloaterAssignmentType
  availableEscorts: EscortAvailabilityStatus[]
  selectedDate: Date
  projectSchedule: ProjectSchedule
  onAssignmentChange: (floaterId: string, escortId: string | null) => void
  onRemoveFloater: (floaterId: string) => void
}

export function FloaterAssignmentComponent({
  floater,
  availableEscorts,
  selectedDate,
  projectSchedule,
  onAssignmentChange,
  onRemoveFloater
}: FloaterAssignmentProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Users2 className="h-4 w-4 text-blue-500" />
          <div>
            <div className="font-medium">
              Floater
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AssignmentDropdown
          talentId={floater.id}
          talentName="Floater"
          isGroup={false}
          currentEscortId={floater.escortId}
          currentEscortName={floater.escortName}
          availableEscorts={availableEscorts}
          selectedDate={selectedDate}
          projectSchedule={projectSchedule}
          onAssignmentChange={onAssignmentChange}
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemoveFloater(floater.id)}
          className="flex items-center gap-1 px-2"
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}