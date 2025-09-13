"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AssignmentDropdown } from './assignment-dropdown'
import { 
  EscortAvailabilityStatus, 
  ProjectSchedule
} from '@/lib/types'

interface MultiDropdownAssignmentProps {
  talentId: string
  talentName: string
  isGroup: boolean
  escortAssignments: Array<{
    escortId?: string
    escortName?: string
  }>
  availableEscorts: EscortAvailabilityStatus[]
  selectedDate: Date
  projectSchedule: ProjectSchedule
  onAssignmentChange: (talentId: string, dropdownIndex: number, escortId: string | null) => void
  onAddDropdown: (talentId: string) => void
  onRemoveDropdown?: (talentId: string, dropdownIndex: number) => void
  disabled?: boolean
}

export function MultiDropdownAssignment({
  talentId,
  talentName,
  isGroup,
  escortAssignments,
  availableEscorts,
  selectedDate,
  projectSchedule,
  onAssignmentChange,
  onAddDropdown,
  onRemoveDropdown,
  disabled = false
}: MultiDropdownAssignmentProps) {
  
  const handleDropdownChange = (dropdownIndex: number) => (talentId: string, escortId: string | null) => {
    onAssignmentChange(talentId, dropdownIndex, escortId)
  }

  const handleRemoveDropdown = (dropdownIndex: number) => {
    if (onRemoveDropdown && escortAssignments.length > 1) { // Can't remove when only one dropdown remains
      onRemoveDropdown(talentId, dropdownIndex)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Render all escort assignment dropdowns */}
      {escortAssignments.map((assignment, index) => (
        <AssignmentDropdown
          key={`${talentId}-dropdown-${index}`}
          talentId={talentId}
          talentName={talentName}
          isGroup={isGroup}
          currentEscortId={assignment.escortId}
          currentEscortName={assignment.escortName}
          availableEscorts={availableEscorts}
          selectedDate={selectedDate}
          projectSchedule={projectSchedule}
          onAssignmentChange={handleDropdownChange(index)}
          onRemoveDropdown={escortAssignments.length > 1 && index > 0 ? () => handleRemoveDropdown(index) : undefined}
          disabled={disabled}
        />
      ))}
      
      {/* Plus button to add more dropdowns */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddDropdown(talentId)}
        disabled={disabled}
        className="flex items-center gap-1 px-2"
        title="Add another escort dropdown"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}