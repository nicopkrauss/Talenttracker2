'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { useTimeTracking, UseTimeTrackingProps } from '@/hooks/use-time-tracking'
import { ProjectRole } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface TimeTrackingActionBarProps extends UseTimeTrackingProps {
  className?: string
  projectName?: string
  showProjectName?: boolean
  compact?: boolean
}

export function TimeTrackingActionBar({
  projectId,
  userRole,
  scheduledStartTime,
  onStateChange,
  onShiftLimitExceeded,
  className,
  projectName,
  showProjectName = true,
  compact = false
}: TimeTrackingActionBarProps) {
  const {
    currentState,
    contextInfo,
    checkIn,
    startBreak,
    endBreak,
    checkOut,
    loading,
    error,
    shiftDuration,
    isOvertime
  } = useTimeTracking({
    projectId,
    userRole,
    scheduledStartTime,
    onStateChange,
    onShiftLimitExceeded
  })

  // Get button text based on current state
  const getButtonText = () => {
    switch (currentState.nextAction) {
      case 'check_in':
        return 'Check In'
      case 'start_break':
        return 'Start My Break'
      case 'end_break':
        return 'End My Break'
      case 'check_out':
        return 'Check Out'
      case 'complete':
        return null // Button disappears for escorts after break
      default:
        return 'Check In'
    }
  }

  // Get button action based on current state
  const getButtonAction = () => {
    switch (currentState.nextAction) {
      case 'check_in':
        return checkIn
      case 'start_break':
        return startBreak
      case 'end_break':
        return endBreak
      case 'check_out':
        return checkOut
      case 'complete':
        return null
      default:
        return checkIn
    }
  }

  // Get button variant based on state and conditions
  const getButtonVariant = () => {
    if (isOvertime) return 'destructive'
    if (currentState.status === 'on_break') return 'secondary'
    return 'default'
  }

  // Check if button should be disabled
  const isButtonDisabled = () => {
    if (loading) return true
    if (currentState.status === 'on_break' && !currentState.canEndBreak) return true
    return false
  }

  // Format shift duration for display
  const formatShiftDuration = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    
    if (wholeHours === 0) {
      return `${minutes}m`
    }
    
    return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`
  }

  // Get status indicator
  const getStatusIndicator = () => {
    if (isOvertime) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overtime
        </Badge>
      )
    }
    
    if (currentState.status === 'on_break') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          On Break
        </Badge>
      )
    }
    
    if (currentState.status === 'checked_in' || currentState.status === 'break_ended') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      )
    }
    
    return null
  }

  // Get break timer display
  const getBreakTimerDisplay = () => {
    if (currentState.status !== 'on_break' || !currentState.breakStartTime) {
      return null
    }

    const now = new Date()
    const breakStart = currentState.breakStartTime
    const elapsedMinutes = Math.floor((now.getTime() - breakStart.getTime()) / (1000 * 60))
    
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Break: {elapsedMinutes} minutes</span>
      </div>
    )
  }

  const buttonText = getButtonText()
  const buttonAction = getButtonAction()
  const statusIndicator = getStatusIndicator()
  const breakTimer = getBreakTimerDisplay()

  // Don't render if button should be hidden (escort after break)
  if (!buttonText && !buttonAction) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className={cn("p-4", compact && "p-3")}>
          {showProjectName && projectName && (
            <div className="text-sm font-medium text-muted-foreground mb-2">
              {projectName}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusIndicator}
              {shiftDuration > 0 && (
                <span className="text-sm text-muted-foreground">
                  Shift: {formatShiftDuration(shiftDuration)}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {contextInfo}
          </div>
          {error && (
            <div className="mt-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        {showProjectName && projectName && (
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {projectName}
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {statusIndicator}
            {shiftDuration > 0 && (
              <span className="text-sm text-muted-foreground">
                Shift: {formatShiftDuration(shiftDuration)}
              </span>
            )}
          </div>
          {breakTimer}
        </div>

        <Button
          onClick={buttonAction || undefined}
          disabled={isButtonDisabled()}
          variant={getButtonVariant()}
          size={compact ? "sm" : "default"}
          className="w-full mb-2"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </div>
          ) : (
            buttonText
          )}
        </Button>

        <div className="text-sm text-muted-foreground">
          {contextInfo}
        </div>

        {error && (
          <div className="mt-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TimeTrackingActionBar