"use client"

import React from 'react'
import { 
  CheckCircle2, 
  Circle, 
  Users
} from 'lucide-react'
import { ProjectSchedule } from '@/lib/types'
import { formatDateStringCompact } from '@/lib/date-utils'

interface EscortAssignmentTrackerProps {
  projectSchedule: ProjectSchedule
  // TODO: Add when talent assignments are implemented
  // talentAssignments?: TalentAssignment[]
  // escortAssignments?: EscortAssignment[]
}

interface DayAssignmentStatus {
  date: Date
  isComplete: boolean
  talentCount: number
  assignedEscorts: number
  requiredEscorts: number
}

export function EscortAssignmentTracker({ 
  projectSchedule 
}: EscortAssignmentTrackerProps) {
  // Mock data for now - will be replaced with real assignment data
  const getDayAssignmentStatus = (date: Date): DayAssignmentStatus => {
    // TODO: Replace with real logic when talent assignments are implemented
    // This should check:
    // 1. How many talent are scheduled for this day
    // 2. How many escorts are assigned to those talent
    // 3. Whether all talent have escorts assigned
    
    // Mock logic for demonstration
    const mockTalentCount = Math.floor(Math.random() * 8) + 2 // 2-10 talent
    const mockAssignedEscorts = Math.floor(Math.random() * mockTalentCount)
    
    return {
      date,
      isComplete: mockAssignedEscorts >= mockTalentCount,
      talentCount: mockTalentCount,
      assignedEscorts: mockAssignedEscorts,
      requiredEscorts: mockTalentCount
    }
  }

  // Get assignment status for all project days
  const dayStatuses = projectSchedule.allDates.map(getDayAssignmentStatus)
  
  // Calculate overall progress
  const completedDays = dayStatuses.filter(day => day.isComplete).length
  const totalDays = dayStatuses.length

  const getStatusIcon = (status: DayAssignmentStatus) => {
    if (status.isComplete) {
      return <CheckCircle2 className="h-3 w-3 text-foreground" />
    }
    return <Circle className="h-3 w-3 text-muted-foreground" />
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Escort Assignments</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {completedDays}/{totalDays} days assigned
        </span>
      </div>

      {/* Day-by-day Status */}
      <div className="flex flex-wrap gap-3">
        {dayStatuses.map((status, index) => {
          const isRehearsalDay = projectSchedule.rehearsalDates.some(
            rehearsalDate => rehearsalDate.getTime() === status.date.getTime()
          )
          const isShowDay = projectSchedule.showDates.some(
            showDate => showDate.getTime() === status.date.getTime()
          )

          return (
            <div
              key={index}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer min-w-0 flex-shrink-0"
            >
              {getStatusIcon(status)}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">
                    {formatDateStringCompact(status.date.toISOString().split('T')[0])}
                  </span>
                  {isShowDay && (
                    <span className="text-xs text-muted-foreground">(Show)</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {status.assignedEscorts}/{status.requiredEscorts} {status.requiredEscorts === 1 ? 'escort' : 'escorts'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* TODO: Add when talent assignments are implemented */}
      {completedDays < totalDays && (
        <p className="text-xs text-muted-foreground">
          Complete talent roster and team assignments to enable escort assignment tracking
        </p>
      )}
    </div>
  )
}