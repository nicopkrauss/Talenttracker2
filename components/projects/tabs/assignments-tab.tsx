"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, AlertTriangle, Calendar, RefreshCw } from 'lucide-react'
import { DaySegmentedControl } from '../day-segmented-control'
import { AssignmentList } from '../assignment-list'
import { 
  EnhancedProject, 
  TalentEscortPair, 
  EscortAvailabilityStatus,
  ProjectSchedule
} from '@/lib/types'
import { createProjectScheduleFromStrings } from '@/lib/schedule-utils'

interface AssignmentsTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function AssignmentsTab({ project, onProjectUpdate }: AssignmentsTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [scheduledTalent, setScheduledTalent] = useState<TalentEscortPair[]>([])
  const [availableEscorts, setAvailableEscorts] = useState<EscortAvailabilityStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectSchedule, setProjectSchedule] = useState<ProjectSchedule | null>(null)

  // Calculate project schedule from start and end dates
  useEffect(() => {
    if (project.start_date && project.end_date) {
      try {
        const schedule = createProjectScheduleFromStrings(project.start_date, project.end_date)
        setProjectSchedule(schedule)
        
        // Auto-select first date if none selected
        if (!selectedDate && schedule.allDates.length > 0) {
          setSelectedDate(schedule.allDates[0])
        }
      } catch (err) {
        console.error('Error creating project schedule:', err)
        setError('Invalid project dates')
      }
    }
  }, [project.start_date, project.end_date, selectedDate])

  // Fetch assignments for selected date
  useEffect(() => {
    if (selectedDate && projectSchedule) {
      fetchAssignmentsForDate(selectedDate)
    }
  }, [selectedDate, projectSchedule])

  const fetchAssignmentsForDate = async (date: Date) => {
    if (!projectSchedule) return
    
    setLoading(true)
    setError(null)
    
    try {
      const dateStr = date.toISOString().split('T')[0]
      
      // Fetch assignments for the specific date
      const assignmentsResponse = await fetch(
        `/api/projects/${project.id}/assignments/${dateStr}`
      )
      
      if (!assignmentsResponse.ok) {
        const errorData = await assignmentsResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch assignments (${assignmentsResponse.status})`)
      }
      
      const assignmentsResult = await assignmentsResponse.json()
      setScheduledTalent(assignmentsResult.data?.assignments || [])
      
      // Fetch available escorts for the date
      const escortsResponse = await fetch(
        `/api/projects/${project.id}/available-escorts/${dateStr}`
      )
      
      if (!escortsResponse.ok) {
        const errorData = await escortsResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch available escorts (${escortsResponse.status})`)
      }
      
      const escortsResult = await escortsResponse.json()
      setAvailableEscorts(escortsResult.data?.escorts || [])
      
    } catch (err: any) {
      console.error('Error fetching assignment data:', err)
      setError(err.message || 'Failed to load assignment data')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignmentChange = async (talentId: string, escortId: string | null) => {
    if (!selectedDate) return
    
    // Store original state for rollback
    const originalTalent = [...scheduledTalent]
    const originalEscorts = [...availableEscorts]
    
    try {
      // Optimistic update: Update UI immediately
      setScheduledTalent(prevTalent => 
        prevTalent.map(talent => 
          talent.talentId === talentId 
            ? { 
                ...talent, 
                escortId: escortId,
                escortName: escortId ? availableEscorts.find(e => e.escortId === escortId)?.escortName : undefined
              }
            : talent
        )
      )
      
      // Update available escorts status optimistically
      if (escortId) {
        setAvailableEscorts(prevEscorts =>
          prevEscorts.map(escort =>
            escort.escortId === escortId
              ? {
                  ...escort,
                  section: 'current_day_assigned' as const,
                  currentAssignment: {
                    talentName: scheduledTalent.find(t => t.talentId === talentId)?.talentName || 'Unknown',
                    date: selectedDate
                  }
                }
              : escort
          )
        )
      }
      
      const dateStr = selectedDate.toISOString().split('T')[0]
      
      // Check if this is a group to use the correct API format
      const talent = scheduledTalent.find(t => t.talentId === talentId)
      const isGroup = talent?.isGroup || false
      
      // Use the new daily assignment API format
      const requestBody = isGroup ? {
        groups: [{
          groupId: talentId,
          escortIds: escortId ? [escortId] : []
        }],
        talents: []
      } : {
        talents: [{
          talentId,
          escortIds: escortId ? [escortId] : []
        }],
        groups: []
      }
      
      const response = await fetch(`/api/projects/${project.id}/assignments/${dateStr}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update assignment')
      }
      
    } catch (err: any) {
      console.error('Error updating assignment:', err)
      
      // Rollback optimistic updates on error
      setScheduledTalent(originalTalent)
      setAvailableEscorts(originalEscorts)
      
      setError(err.message || 'Failed to update assignment')
    }
  }

  const handleMultiDropdownChange = async (talentId: string, dropdownIndex: number, escortId: string | null) => {
    if (!selectedDate) return
    
    // Store original state for rollback
    const originalTalent = [...scheduledTalent]
    const originalEscorts = [...availableEscorts]
    
    try {
      // Optimistic update: Update UI immediately
      setScheduledTalent(prevTalent => 
        prevTalent.map(talent => {
          if (talent.talentId === talentId && talent.escortAssignments) {
            const newAssignments = [...talent.escortAssignments]
            newAssignments[dropdownIndex] = {
              escortId: escortId || undefined,
              escortName: escortId ? availableEscorts.find(e => e.escortId === escortId)?.escortName || undefined : undefined
            }
            return {
              ...talent,
              escortAssignments: newAssignments
            }
          }
          return talent
        })
      )
      
      // Update available escorts status optimistically
      if (escortId) {
        setAvailableEscorts(prevEscorts =>
          prevEscorts.map(escort =>
            escort.escortId === escortId
              ? {
                  ...escort,
                  section: 'current_day_assigned' as const,
                  currentAssignment: {
                    talentName: scheduledTalent.find(t => t.talentId === talentId)?.talentName || 'Unknown',
                    date: selectedDate
                  }
                }
              : escort
          )
        )
      }
      
      // Get all current escort IDs for this talent
      const currentTalent = scheduledTalent.find(t => t.talentId === talentId)
      if (currentTalent?.escortAssignments) {
        const updatedAssignments = [...currentTalent.escortAssignments]
        updatedAssignments[dropdownIndex] = {
          escortId: escortId || undefined,
          escortName: escortId ? availableEscorts.find(e => e.escortId === escortId)?.escortName || undefined : undefined
        }
        
        const escortIds = updatedAssignments
          .map(assignment => assignment.escortId)
          .filter(id => id !== undefined) as string[]
        
        const dateStr = selectedDate.toISOString().split('T')[0]
        
        // Check if this is a group to use the correct API format
        const isGroup = currentTalent.isGroup || false
        
        const requestBody = isGroup ? {
          groups: [{
            groupId: talentId,
            escortIds
          }],
          talents: []
        } : {
          talents: [{
            talentId,
            escortIds
          }],
          groups: []
        }
        
        const response = await fetch(`/api/projects/${project.id}/assignments/${dateStr}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to update multi-dropdown assignment')
        }
      }
      
    } catch (err: any) {
      console.error('Error updating multi-dropdown assignment:', err)
      
      // Rollback optimistic updates on error
      setScheduledTalent(originalTalent)
      setAvailableEscorts(originalEscorts)
      
      setError(err.message || 'Failed to update multi-dropdown assignment')
    }
  }

  const handleAddDropdown = async (talentId: string) => {
    if (!selectedDate) return
    
    try {
      // Optimistic update: Add a new empty dropdown
      setScheduledTalent(prevTalent => 
        prevTalent.map(talent => {
          if (talent.talentId === talentId && talent.escortAssignments) {
            return {
              ...talent,
              escortAssignments: [
                ...talent.escortAssignments,
                { escortId: undefined, escortName: undefined }
              ]
            }
          }
          return talent
        })
      )
      
      // No need to update database - the new system doesn't track dropdown counts
      // The dropdown count is now purely a UI state managed by the escort assignments
      
    } catch (err: any) {
      console.error('Error adding dropdown:', err)
      setError(err.message || 'Failed to add dropdown')
      
      // Refresh the data to get the correct state
      if (selectedDate) {
        fetchAssignmentsForDate(selectedDate)
      }
    }
  }

  const handleRemoveDropdown = async (talentId: string, dropdownIndex: number) => {
    if (!selectedDate) return
    
    // Check if this talent has multiple dropdowns
    const currentTalent = scheduledTalent.find(t => t.talentId === talentId)
    if (!currentTalent?.escortAssignments || currentTalent.escortAssignments.length <= 1) {
      return // Can't remove when only one dropdown remains
    }
    
    // Store original state for rollback
    const originalTalent = [...scheduledTalent]
    
    try {
      // Optimistic update: Remove the dropdown
      setScheduledTalent(prevTalent => 
        prevTalent.map(talent => {
          if (talent.talentId === talentId && talent.escortAssignments) {
            const newAssignments = [...talent.escortAssignments]
            newAssignments.splice(dropdownIndex, 1)
            return {
              ...talent,
              escortAssignments: newAssignments
            }
          }
          return talent
        })
      )
      
      // Update escort assignments in the database using the new API
      const currentTalent = scheduledTalent.find(t => t.talentId === talentId)
      if (currentTalent?.escortAssignments) {
        const updatedAssignments = [...currentTalent.escortAssignments]
        updatedAssignments.splice(dropdownIndex, 1)
        
        const escortIds = updatedAssignments
          .map(assignment => assignment.escortId)
          .filter(id => id !== undefined) as string[]
        
        const dateStr = selectedDate.toISOString().split('T')[0]
        
        // Check if this is a group to use the correct API format
        const isGroup = currentTalent.isGroup || false
        
        const requestBody = isGroup ? {
          groups: [{
            groupId: talentId,
            escortIds
          }],
          talents: []
        } : {
          talents: [{
            talentId,
            escortIds
          }],
          groups: []
        }
        
        const response = await fetch(`/api/projects/${project.id}/assignments/${dateStr}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to update escort assignments')
        }
      }
      
    } catch (err: any) {
      console.error('Error removing dropdown:', err)
      
      // Rollback optimistic updates on error
      setScheduledTalent(originalTalent)
      
      setError(err.message || 'Failed to remove dropdown')
    }
  }

  const handleClearDayAssignments = async (date: Date) => {
    if (!confirm(`Are you sure you want to clear all assignments for ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}? This action cannot be undone.`)) {
      return
    }
    
    // Store original state for rollback
    const originalTalent = [...scheduledTalent]
    const originalEscorts = [...availableEscorts]
    
    try {
      // Optimistic update: Clear all assignments immediately
      setScheduledTalent(prevTalent => 
        prevTalent.map(talent => ({
          ...talent,
          escortId: undefined,
          escortName: undefined,
          escortAssignments: talent.isGroup ? [{ escortId: undefined, escortName: undefined }] : undefined
        }))
      )
      
      // Reset all escorts to available status optimistically
      setAvailableEscorts(prevEscorts =>
        prevEscorts.map(escort => ({
          ...escort,
          section: 'available' as const,
          currentAssignment: undefined
        }))
      )
      
      const dateStr = date.toISOString().split('T')[0]
      
      const response = await fetch(`/api/projects/${project.id}/assignments/clear-day`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: dateStr })
      })
      
      if (!response.ok) {
        throw new Error('Failed to clear day assignments')
      }
      
      // Success: Optimistic update was correct, no additional action needed
      
    } catch (err: any) {
      console.error('Error clearing day assignments:', err)
      
      // Rollback optimistic updates on error
      setScheduledTalent(originalTalent)
      setAvailableEscorts(originalEscorts)
      
      setError(err.message || 'Failed to clear day assignments')
    }
  }

  const handleRefresh = () => {
    if (selectedDate) {
      fetchAssignmentsForDate(selectedDate)
    }
  }

  // Show error if project dates are invalid
  if (!project.start_date || !project.end_date) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Project start and end dates must be set before managing assignments. 
          Please update the project information in the Info tab.
        </AlertDescription>
      </Alert>
    )
  }

  if (!projectSchedule) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Day Selection Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 flex-shrink-0">
              <Calendar className="h-5 w-5" />
              Select A Day
            </CardTitle>
            
            {/* Day Selection Controls - centered in the available space */}
            <div className="flex-1 flex justify-center">
              <DaySegmentedControl
                projectSchedule={projectSchedule}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Assignment Progress Row */}
          {selectedDate && scheduledTalent.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">
                  {scheduledTalent.length}
                </span> talent currently assigned for the day
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-64 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${scheduledTalent.length > 0 ? (scheduledTalent.filter(t => t.escortId).length / scheduledTalent.length) * 100 : 0}%`
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {scheduledTalent.filter(t => t.escortId).length} / {scheduledTalent.length} assigned
                </span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">
                  {availableEscorts.length}
                </span> staff available for the day
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {projectSchedule.isSingleDay && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a single-day project (show day only). All talent scheduled will be treated as show day assignments.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Assignment List */}
      {selectedDate && (
        <AssignmentList
          selectedDate={selectedDate}
          projectSchedule={projectSchedule}
          scheduledTalent={scheduledTalent}
          availableEscorts={availableEscorts}
          onAssignmentChange={handleAssignmentChange}
          onMultiDropdownChange={handleMultiDropdownChange}
          onAddDropdown={handleAddDropdown}
          onRemoveDropdown={handleRemoveDropdown}
          onClearDay={handleClearDayAssignments}
          loading={loading}
        />
      )}
    </div>
  )
}