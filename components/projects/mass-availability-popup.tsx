"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TeamAssignment, ProjectSchedule } from '@/lib/types'

import { getRoleDisplayName } from '@/lib/role-utils'
import { cn } from '@/lib/utils'
import { Users, Calendar } from 'lucide-react'

// Role color mapping function (consistent with roles-team-tab)
const getRoleColor = (role: string | null): string => {
  switch (role) {
    case 'admin':
      return 'bg-slate-900 text-slate-50 border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
    case 'in_house':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
    case 'supervisor':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800'
    case 'coordinator':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800'
    case 'talent_escort':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-800'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

interface MassAvailabilityPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingAssignments: TeamAssignment[]
  projectSchedule: ProjectSchedule | null
  onConfirm: (confirmations: { assignmentId: string; availableDates: Date[] }[]) => void
  isConfirming?: boolean
}

interface TeamMemberAvailability {
  assignmentId: string
  fullName: string
  role: string
  availableDates: Date[]
}

export function MassAvailabilityPopup({
  open,
  onOpenChange,
  pendingAssignments,
  projectSchedule,
  onConfirm,
  isConfirming = false
}: MassAvailabilityPopupProps) {
  const [teamAvailabilities, setTeamAvailabilities] = useState<TeamMemberAvailability[]>([])

  // Initialize team availabilities when popup opens
  useEffect(() => {
    if (open && pendingAssignments.length > 0) {
      const initialAvailabilities = pendingAssignments.map(assignment => ({
        assignmentId: assignment.id,
        fullName: assignment.profiles.full_name,
        role: assignment.role,
        availableDates: [] // Start with no dates selected
      }))
      setTeamAvailabilities(initialAvailabilities)
    }
  }, [open, pendingAssignments])

  const handleDateToggle = (assignmentId: string, date: Date) => {
    if (!projectSchedule) return
    
    setTeamAvailabilities(prev => 
      prev.map(item => {
        if (item.assignmentId !== assignmentId) return item
        
        const isSelected = item.availableDates.some(selectedDate => 
          selectedDate.getTime() === date.getTime()
        )
        
        const isShowDay = projectSchedule.showDates.some(showDate => 
          showDate.getTime() === date.getTime()
        )
        
        if (isSelected) {
          // Remove the date
          return {
            ...item,
            availableDates: item.availableDates.filter(selectedDate => 
              selectedDate.getTime() !== date.getTime()
            )
          }
        } else {
          // Add the date
          let newDates = [...item.availableDates, date]
          
          // If this is NOT a show day being selected, also auto-select show days
          if (!isShowDay && item.availableDates.length === 0) {
            // This is the first non-show day being selected, add show days too
            const showDatesToAdd = projectSchedule.showDates.filter(showDate => 
              !item.availableDates.some(selectedDate => 
                selectedDate.getTime() === showDate.getTime()
              )
            )
            newDates = [...newDates, ...showDatesToAdd]
          }
          
          return {
            ...item,
            availableDates: newDates
          }
        }
      })
    )
  }

  // Helper function to determine if show day should be greyed out (suggested but not selected)
  const isShowDayGreyedOut = (assignmentId: string, date: Date) => {
    if (!projectSchedule) return false
    
    const teamMember = teamAvailabilities.find(t => t.assignmentId === assignmentId)
    if (!teamMember) return false
    
    const isShowDay = projectSchedule.showDates.some(showDate => 
      showDate.getTime() === date.getTime()
    )
    
    const isSelected = teamMember.availableDates.some(selectedDate => 
      selectedDate.getTime() === date.getTime()
    )
    
    // Show day is greyed out if it's a show day, not selected, and no other dates are selected
    return isShowDay && !isSelected && teamMember.availableDates.length === 0
  }

  const handleSelectAll = (assignmentId: string) => {
    if (!projectSchedule) return
    
    setTeamAvailabilities(prev => 
      prev.map(item => {
        if (item.assignmentId !== assignmentId) return item
        return {
          ...item,
          availableDates: [...projectSchedule.allDates]
        }
      })
    )
  }

  const handleClearAll = (assignmentId: string) => {
    setTeamAvailabilities(prev => 
      prev.map(item => {
        if (item.assignmentId !== assignmentId) return item
        return {
          ...item,
          availableDates: []
        }
      })
    )
  }

  const handleConfirm = () => {
    // Only include team members with at least one selected date
    const confirmations = teamAvailabilities
      .filter(item => item.availableDates.length > 0)
      .map(item => ({
        assignmentId: item.assignmentId,
        availableDates: item.availableDates
      }))
    
    onConfirm(confirmations)
  }

  // Only count team members who have actually selected dates (not just greyed-out show days)
  const totalWithAvailability = teamAvailabilities.filter(item => item.availableDates.length > 0).length

  if (!projectSchedule) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Confirm Availability
            <Badge variant="outline" className="ml-2">
              {pendingAssignments.length} pending
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {teamAvailabilities.map((teamMember) => (
              <div key={teamMember.assignmentId} className="border rounded-lg p-4">
                <div className="grid grid-cols-5 gap-4">
                  {/* Team Member Info - 40% width (2 columns) */}
                  <div className="col-span-2 space-y-2">
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm">{teamMember.fullName}</h3>
                      <Badge variant="outline" className={`text-xs ${getRoleColor(teamMember.role)}`}>
                        {getRoleDisplayName(teamMember.role)}
                      </Badge>
                    </div>
                    

                  </div>

                  {/* Date Selection - 60% width (3 columns) */}
                  <div className="col-span-3 space-y-3">
                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll(teamMember.assignmentId)}
                        disabled={isConfirming}
                        className="text-xs px-2 py-1 h-7"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearAll(teamMember.assignmentId)}
                        disabled={isConfirming || teamMember.availableDates.length === 0}
                        className="text-xs px-2 py-1 h-7"
                      >
                        Clear All
                      </Button>
                    </div>
                    
                    {/* Date Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {projectSchedule.allDates.map((date) => {
                        const isSelected = teamMember.availableDates.some(selectedDate => 
                          selectedDate.getTime() === date.getTime()
                        )
                        const isGreyedOut = isShowDayGreyedOut(teamMember.assignmentId, date)
                        const isShowDay = projectSchedule.showDates.some(showDate => 
                          showDate.getTime() === date.getTime()
                        )
                        
                        const month = date.getMonth() + 1
                        const day = date.getDate()
                        
                        return (
                          <button
                            key={date.getTime()}
                            type="button"
                            disabled={isConfirming}
                            onClick={() => handleDateToggle(teamMember.assignmentId, date)}
                            className={cn(
                              "w-10 h-10 text-sm rounded-full border-2 transition-all duration-200 flex items-center justify-center font-medium",
                              isConfirming 
                                ? "opacity-50 cursor-not-allowed" 
                                : "cursor-pointer hover:scale-105",
                              isSelected 
                                ? "bg-primary border-primary text-primary-foreground"
                                : isGreyedOut
                                ? "bg-muted/50 border-muted text-muted-foreground"
                                : "bg-transparent border-border text-foreground hover:border-primary/50"
                            )}
                            title={`${date.toLocaleDateString()} ${isShowDay ? '(Show Day)' : '(Rehearsal)'}`}
                          >
                            {month}/{day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            

          </div>
        </div>

        {/* Footer with Confirm Button */}
        <div className="border-t pt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {totalWithAvailability > 0 ? (
              `${totalWithAvailability} team member${totalWithAvailability === 1 ? '' : 's'} ready to confirm`
            ) : (
              'Select availability dates for team members'
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={totalWithAvailability === 0 || isConfirming}
            >
              {isConfirming ? 'Confirming...' : `Confirm (${totalWithAvailability})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}