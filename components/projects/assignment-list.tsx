"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, User, Users2, Plus } from 'lucide-react'
import { AssignmentDropdown } from './assignment-dropdown'
import { MultiDropdownAssignment } from './multi-dropdown-assignment'
import { GroupBadge } from './group-badge'
import { FloaterAssignmentComponent } from './floater-assignment'
import { 
  TalentEscortPair, 
  EscortAvailabilityStatus, 
  ProjectSchedule,
  FloaterAssignment
} from '@/lib/types'
import { getDayType } from '@/lib/schedule-utils'

interface AssignmentListProps {
  selectedDate: Date
  projectSchedule: ProjectSchedule
  scheduledTalent: TalentEscortPair[]
  floaterAssignments: FloaterAssignment[]
  availableEscorts: EscortAvailabilityStatus[]
  onAssignmentChange: (talentId: string, escortId: string | null) => void
  onMultiDropdownChange?: (talentId: string, dropdownIndex: number, escortId: string | null) => void
  onAddDropdown?: (talentId: string) => void
  onRemoveDropdown?: (talentId: string, dropdownIndex: number) => void
  onFloaterAssignmentChange: (floaterId: string, escortId: string | null) => void
  onAddFloater: () => void
  onRemoveFloater: (floaterId: string) => void
  onClearDay: (date: Date) => void
  loading?: boolean
}

export function AssignmentList({
  selectedDate,
  projectSchedule,
  scheduledTalent,
  floaterAssignments,
  availableEscorts,
  onAssignmentChange,
  onMultiDropdownChange,
  onAddDropdown,
  onRemoveDropdown,
  onFloaterAssignmentChange,
  onAddFloater,
  onRemoveFloater,
  onClearDay,
  loading = false
}: AssignmentListProps) {
  const dayType = getDayType(selectedDate, projectSchedule)
  const isShowDay = dayType === 'show'

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Loading assignments...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {formatDateDisplay(selectedDate)}
            {isShowDay && (
              <Badge variant="default" className="ml-2">
                Show Day
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            {scheduledTalent.length > 0 && scheduledTalent.some(t => t.escortId) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onClearDay(selectedDate)}
                className="text-destructive hover:text-destructive"
              >
                Clear Day
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Show empty state message if no talent or floaters */}
          {scheduledTalent.length === 0 && floaterAssignments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No talent or floaters scheduled for this day</p>
              <p className="text-sm mb-4">
                Use the Talent Roster tab to schedule talent for specific days, or add floaters below.
              </p>
            </div>
          )}

          {/* Talent Assignments */}
          {scheduledTalent.map((talent) => (
            <div
              key={talent.talentId}
              className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {talent.isGroup ? (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {talent.talentName}
                        <GroupBadge />
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{talent.talentName}</div>

                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {talent.isGroup && talent.escortAssignments && onMultiDropdownChange && onAddDropdown ? (
                  <MultiDropdownAssignment
                      talentId={talent.talentId}
                      talentName={talent.talentName}
                      isGroup={talent.isGroup}
                      escortAssignments={talent.escortAssignments}
                      availableEscorts={availableEscorts}
                      selectedDate={selectedDate}
                      projectSchedule={projectSchedule}
                      onAssignmentChange={onMultiDropdownChange}
                      onAddDropdown={onAddDropdown}
                      onRemoveDropdown={onRemoveDropdown}
                    />
                ) : (
                  <AssignmentDropdown
                    talentId={talent.talentId}
                    talentName={talent.talentName}
                    isGroup={talent.isGroup}
                    currentEscortId={talent.escortId}
                    currentEscortName={talent.escortName}
                    availableEscorts={availableEscorts}
                    selectedDate={selectedDate}
                    projectSchedule={projectSchedule}
                    onAssignmentChange={onAssignmentChange}
                  />
                )}
              </div>
            </div>
          ))}

          {/* Floater Assignments */}
          {floaterAssignments.map((floater) => (
            <FloaterAssignmentComponent
              key={floater.id}
              floater={floater}
              availableEscorts={availableEscorts}
              selectedDate={selectedDate}
              projectSchedule={projectSchedule}
              onAssignmentChange={onFloaterAssignmentChange}
              onRemoveFloater={onRemoveFloater}
            />
          ))}

          {/* Add Floater Button - Always show */}
          <Button
            variant="outline"
            onClick={onAddFloater}
            className="w-full flex items-center gap-2 p-4 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Floater
          </Button>
        </div>


      </CardContent>
    </Card>
  )
}