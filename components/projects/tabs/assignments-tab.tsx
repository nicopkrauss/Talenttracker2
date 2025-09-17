"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Calendar, RefreshCw, WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DaySegmentedControl } from '../day-segmented-control'
import { AssignmentList } from '../assignment-list'
import { SchedulingErrorBoundary } from '@/components/error-boundaries/scheduling-error-boundary'
import { 
  EnhancedProject, 
  TalentEscortPair, 
  EscortAvailabilityStatus,
  ProjectSchedule
} from '@/lib/types'
import { createProjectScheduleFromStrings } from '@/lib/schedule-utils'
import { useSchedulingValidation } from '@/hooks/use-scheduling-validation'
import { useErrorRecovery } from '@/hooks/use-error-recovery'
import { useOptimisticUpdates } from '@/hooks/use-optimistic-updates'
import { schedulingApiClient, withApiErrorHandling } from '@/lib/api/scheduling-api-client'
import { SchedulingErrorHandler, SchedulingErrorCode } from '@/lib/error-handling/scheduling-errors'
import { AssignmentsEmptyState } from '@/components/projects/empty-state-guidance'
import { AssignmentGuard } from '@/components/projects/feature-availability-guard'

interface AssignmentsTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function AssignmentsTab({ project, onProjectUpdate }: AssignmentsTabProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Feature availability is now handled by cached readiness data in EmptyStateGuidance
  const [availableEscorts, setAvailableEscorts] = useState<EscortAvailabilityStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [projectSchedule, setProjectSchedule] = useState<ProjectSchedule | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Navigation handler for tab switching
  const handleNavigateToTab = (route: string) => {
    // Convert route to tab navigation
    const currentPath = window.location.pathname
    const basePath = currentPath.split('?')[0] // Remove query params
    
    // Update URL with tab parameter
    const url = new URL(window.location.href)
    
    switch (route) {
      case '/info':
        url.searchParams.set('tab', 'info')
        break
      case '/roles-team':
        url.searchParams.set('tab', 'roles-team')
        break
      case '/talent-roster':
        url.searchParams.set('tab', 'talent-roster')
        break
      case '/assignments':
        url.searchParams.set('tab', 'assignments')
        break
      default:
        url.searchParams.set('tab', 'info')
    }
    
    // Use router to navigate with the tab parameter
    router.push(url.pathname + url.search)
  }
  // Enhanced error handling and recovery
  const { 
    error, 
    isRetrying, 
    canRetry, 
    setError, 
    clearError, 
    executeWithRetry,
    getUserFriendlyMessage 
  } = useErrorRecovery({
    maxAttempts: 3,
    onRetry: (attempt, error) => {
      console.log(`Retrying assignment operation (attempt ${attempt}):`, error)
    }
  })

  // Optimistic updates for assignments
  const {
    data: scheduledTalent,
    isUpdating,
    hasPendingUpdates,
    hasFailedUpdates,
    pendingUpdateCount,
    executeOptimisticUpdate,
    rollbackAllUpdates,
    refreshData: refreshAssignments
  } = useOptimisticUpdates<TalentEscortPair[]>([], {
    maxRetries: 3,
    fallbackToRefresh: true,
    onError: (error, update) => {
      console.error('Optimistic update failed:', error, update)
      setError(error)
    },
    onRollback: (update) => {
      console.log('Rolled back optimistic update:', update)
    }
  })

  // Validation for scheduling operations - always call hook to avoid conditional hook usage
  const validation = useSchedulingValidation({
    projectSchedule: projectSchedule || {
      startDate: new Date(),
      endDate: new Date(),
      rehearsalDates: [],
      showDates: [],
      allDates: [],
      isSingleDay: true
    },
    validateOnChange: true
  })

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Debug effect to track pending updates
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Pending updates state:', {
        hasPendingUpdates,
        pendingUpdateCount,
        isUpdating,
        hasFailedUpdates
      })
    }
  }, [hasPendingUpdates, pendingUpdateCount, isUpdating, hasFailedUpdates])

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
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.INVALID_DATE_FORMAT,
          'Invalid project dates'
        )
        setError(error)
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
    clearError()
    
    try {
      const dateStr = date.toISOString().split('T')[0]
      
      // Validate date before making API call (only if we have a valid project schedule)
      if (projectSchedule && validation && !validation.validateDate(dateStr)) {
        const validationError = SchedulingErrorHandler.createError(
          SchedulingErrorCode.INVALID_DATE_FORMAT,
          'Selected date is invalid'
        )
        setError(validationError)
        return
      }

      await executeWithRetry(async () => {
        // Fetch assignments and escorts in parallel with error handling
        const [assignmentsResult, escortsResult] = await Promise.all([
          withApiErrorHandling(
            () => schedulingApiClient.getAssignments(project.id, dateStr),
            'fetchAssignments'
          ),
          withApiErrorHandling(
            () => schedulingApiClient.getAvailableEscorts(project.id, dateStr),
            'fetchAvailableEscorts'
          )
        ])

        // Update state with fetched data
        refreshAssignments((assignmentsResult as any)?.assignments || [])
        setAvailableEscorts((escortsResult as any)?.escorts || [])
      })
      
    } catch (err: any) {
      console.error('Error fetching assignment data:', err)
      // Error is already set by executeWithRetry
    } finally {
      setLoading(false)
    }
  }

  const handleAssignmentChange = async (talentId: string, escortId: string | null) => {
    if (!selectedDate || !projectSchedule) return
    
    const dateStr = selectedDate.toISOString().split('T')[0]
    const normalizedEscortId = escortId || undefined
    
    // Validate assignment before proceeding
    const talent = scheduledTalent.find(t => t.talentId === talentId)
    if (!talent) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.VALIDATION_ERROR,
        'Talent not found for assignment'
      )
      setError(error)
      return
    }

    // Check if escort is available (if assigning)
    if (normalizedEscortId) {
      const escort = availableEscorts.find(e => e.escortId === normalizedEscortId)
      if (!escort || escort.section === 'current_day_assigned') {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.ESCORT_NOT_AVAILABLE,
          'Selected escort is not available for assignment'
        )
        setError(error)
        return
      }
    }

    try {
      // Create optimistic update data
      const optimisticTalent = scheduledTalent.map(t => 
        t.talentId === talentId 
          ? { 
              ...t, 
              escortId: normalizedEscortId,
              escortName: normalizedEscortId ? availableEscorts.find(e => e.escortId === normalizedEscortId)?.escortName : undefined
            }
          : t
      )

      // Execute optimistic update with API call
      await executeOptimisticUpdate(
        optimisticTalent,
        async () => {
          const escortIds = normalizedEscortId ? [normalizedEscortId] : []
          const requestBody = talent.isGroup ? {
            groups: [{ groupId: talentId, escortIds }],
            talents: []
          } : {
            talents: [{ talentId, escortIds }],
            groups: []
          }

          return await withApiErrorHandling(
            () => schedulingApiClient.updateAssignments(project.id, dateStr, requestBody),
            'updateAssignment'
          )
        },
        `assign_escort_${talentId}`,
        {
          onSuccess: () => {
            // Update available escorts status
            setAvailableEscorts(prevEscorts => {
              return prevEscorts.map(escort => {
                if (normalizedEscortId && escort.escortId === normalizedEscortId) {
                  return {
                    ...escort,
                    section: 'current_day_assigned' as const,
                    currentAssignment: {
                      talentName: talent.talentName,
                      date: selectedDate
                    }
                  }
                }
                
                if (!normalizedEscortId && escort.escortId === talent.escortId && escort.section === 'current_day_assigned') {
                  const hasOtherAssignments = optimisticTalent.some(t => 
                    t.talentId !== talentId && t.escortId === escort.escortId
                  )
                  
                  if (!hasOtherAssignments) {
                    return {
                      ...escort,
                      section: 'available' as const,
                      currentAssignment: undefined
                    }
                  }
                }
                
                return escort
              })
            })
          }
        }
      )
      
    } catch (err: any) {
      console.error('Error updating assignment:', err)
      // Error handling is managed by optimistic updates hook
    }
  }

  const handleMultiDropdownChange = async (talentId: string, dropdownIndex: number, escortId: string | null) => {
    if (!selectedDate) return
    
    // Convert null to undefined for TalentEscortPair compatibility
    const normalizedEscortId = escortId || undefined
    
    try {
      // Create optimistic update data
      const optimisticTalent = scheduledTalent.map(talent => {
        if (talent.talentId === talentId && talent.escortAssignments) {
          const newAssignments = [...talent.escortAssignments]
          newAssignments[dropdownIndex] = {
            escortId: normalizedEscortId,
            escortName: normalizedEscortId ? availableEscorts.find(e => e.escortId === normalizedEscortId)?.escortName || undefined : undefined
          }
          return {
            ...talent,
            escortAssignments: newAssignments
          }
        }
        return talent
      })
      
      // Execute optimistic update with API call
      await executeOptimisticUpdate(
        optimisticTalent,
        async () => {
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
            
            return await withApiErrorHandling(
              () => schedulingApiClient.updateAssignments(project.id, dateStr, requestBody),
              'updateMultiDropdownAssignment'
            )
          }
        },
        `multi_dropdown_${talentId}_${dropdownIndex}`,
        {
          onSuccess: () => {
            // Update available escorts status
            setAvailableEscorts(prevEscorts => {
              return prevEscorts.map(escort => {
                // If we're assigning this escort, mark them as current_day_assigned
                if (normalizedEscortId && escort.escortId === normalizedEscortId) {
                  return {
                    ...escort,
                    section: 'current_day_assigned' as const,
                    currentAssignment: {
                      talentName: scheduledTalent.find(t => t.talentId === talentId)?.talentName || 'Unknown',
                      date: selectedDate
                    }
                  }
                }
                
                // If we're removing an escort (escortId is null), check if this escort was previously assigned to this talent
                if (!normalizedEscortId) {
                  const currentTalent = scheduledTalent.find(t => t.talentId === talentId)
                  if (currentTalent?.escortAssignments) {
                    const previousAssignment = currentTalent.escortAssignments[dropdownIndex]
                    if (previousAssignment?.escortId === escort.escortId && escort.section === 'current_day_assigned') {
                      // Check if this escort has any other assignments on this date for this talent or others
                      const hasOtherAssignmentsForThisTalent = currentTalent.escortAssignments.some((assignment, index) => 
                        index !== dropdownIndex && assignment.escortId === escort.escortId
                      )
                      const hasOtherAssignmentsForOtherTalent = optimisticTalent.some(t => 
                        t.talentId !== talentId && (
                          t.escortId === escort.escortId || 
                          (t.escortAssignments && t.escortAssignments.some(assignment => assignment.escortId === escort.escortId))
                        )
                      )
                      
                      if (!hasOtherAssignmentsForThisTalent && !hasOtherAssignmentsForOtherTalent) {
                        // Move escort back to available section
                        return {
                          ...escort,
                          section: 'available' as const,
                          currentAssignment: undefined
                        }
                      }
                    }
                  }
                }
                
                return escort
              })
            })
          }
        }
      )
      
    } catch (err: any) {
      console.error('Error updating multi-dropdown assignment:', err)
      // Error handling is managed by optimistic updates hook
    }
  }

  const handleAddDropdown = async (talentId: string) => {
    if (!selectedDate) return
    
    try {
      // Create optimistic update data: Add a new empty dropdown
      const optimisticTalent = scheduledTalent.map(talent => {
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

      // Execute optimistic update (no API call needed for adding empty dropdown)
      await executeOptimisticUpdate(
        optimisticTalent,
        async () => {
          // No API call needed - this is just UI state
          return Promise.resolve()
        },
        `add_dropdown_${talentId}`
      )
      
    } catch (err: any) {
      console.error('Error adding dropdown:', err)
      // Error handling is managed by optimistic updates hook
    }
  }

  const handleRemoveDropdown = async (talentId: string, dropdownIndex: number) => {
    if (!selectedDate) return
    
    // Check if this talent has multiple dropdowns
    const currentTalent = scheduledTalent.find(t => t.talentId === talentId)
    if (!currentTalent?.escortAssignments || currentTalent.escortAssignments.length <= 1) {
      return // Can't remove when only one dropdown remains
    }
    
    try {
      // Create optimistic update data: Remove the dropdown
      const optimisticTalent = scheduledTalent.map(talent => {
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

      // Execute optimistic update with API call
      await executeOptimisticUpdate(
        optimisticTalent,
        async () => {
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
            
            return await withApiErrorHandling(
              () => schedulingApiClient.updateAssignments(project.id, dateStr, requestBody),
              'removeDropdownAssignment'
            )
          }
        },
        `remove_dropdown_${talentId}_${dropdownIndex}`
      )
      
    } catch (err: any) {
      console.error('Error removing dropdown:', err)
      // Error handling is managed by optimistic updates hook
    }
  }

  const handleClearDayAssignments = async (date: Date) => {
    if (!confirm(`Are you sure you want to clear all assignments for ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}? This action cannot be undone.`)) {
      return
    }
    
    const dateStr = date.toISOString().split('T')[0]
    
    try {
      // Create optimistic cleared state
      const clearedTalent = scheduledTalent.map(talent => ({
        ...talent,
        escortId: undefined,
        escortName: undefined,
        escortAssignments: talent.isGroup ? [{ escortId: undefined, escortName: undefined }] : undefined
      }))

      // Execute optimistic update with API call
      await executeOptimisticUpdate(
        clearedTalent,
        async () => {
          return await withApiErrorHandling(
            () => schedulingApiClient.clearDayAssignments(project.id, dateStr),
            'clearDayAssignments'
          )
        },
        `clear_day_${dateStr}`,
        {
          onSuccess: () => {
            // Reset all escorts to available status
            setAvailableEscorts(prevEscorts =>
              prevEscorts.map(escort => ({
                ...escort,
                section: 'available' as const,
                currentAssignment: undefined
              }))
            )
          }
        }
      )
      
    } catch (err: any) {
      console.error('Error clearing day assignments:', err)
      // Error handling is managed by optimistic updates hook
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
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Project start and end dates must be set before managing assignments. 
            Please update the project information in the Info tab.
          </AlertDescription>
        </Alert>
        <AssignmentsEmptyState
          variant="empty"
          onNavigate={handleNavigateToTab}
        />
      </div>
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
    <AssignmentGuard 
      projectId={project.id}
      fallback={
        <AssignmentsEmptyState 
          variant="empty"
          onNavigate={handleNavigateToTab}
        />
      }
    >
      <SchedulingErrorBoundary
        onError={(error, errorInfo) => {
          console.error('Assignments tab error boundary triggered:', error, errorInfo)
        }}
      >
        <div className="space-y-6">
        {/* Network Status Alert */}
        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You are currently offline. Changes will be saved when your connection is restored.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert with Enhanced Messaging */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div>{getUserFriendlyMessage()}</div>
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedDate && fetchAssignmentsForDate(selectedDate)}
                  disabled={isRetrying}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Updates Alert - Only show when actively updating or have failed updates (not during initial loading) */}
        {!loading && (isUpdating || hasFailedUpdates) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {isUpdating 
                  ? 'Saving changes...' 
                  : hasFailedUpdates 
                    ? 'Some changes failed to save'
                    : 'Processing changes...'
                }
              </span>
              {hasFailedUpdates && !isUpdating && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rollbackAllUpdates}
                >
                  Cancel Changes
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

      {/* Day Selection Header */}
      <Card>
        <CardHeader className="gap-4">
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
                disabled={loading || isUpdating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isUpdating) ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Updating...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Assignment Progress Row */}
          {selectedDate && scheduledTalent.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">
                  {scheduledTalent.length}
                </span> talent currently assigned for the day
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-96 bg-muted rounded-full h-2">
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
        
        {projectSchedule.isSingleDay && (
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a single-day project (show day only). All talent scheduled will be treated as show day assignments.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
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
      </SchedulingErrorBoundary>
    </AssignmentGuard>
  )
}