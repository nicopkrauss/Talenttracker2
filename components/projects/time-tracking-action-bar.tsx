"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Coffee, 
  AlertTriangle,
  Lock
} from 'lucide-react'
import { TimeTrackingGuard } from './feature-availability-guard'
import { useTimeTrackingFeatureAvailability } from '@/hooks/use-feature-availability'

interface TimeTrackingState {
  status: 'checked_out' | 'checked_in' | 'on_break' | 'break_ending_soon'
  checkInTime?: string
  breakStartTime?: string
  breakDuration?: number
  canEndBreak?: boolean
}

interface TimeTrackingActionBarProps {
  projectId: string
  projectName: string
  userId: string
  currentState?: TimeTrackingState
  onStateChange?: (newState: TimeTrackingState) => void
  className?: string
}

export function TimeTrackingActionBar({
  projectId,
  projectName,
  userId,
  currentState,
  onStateChange,
  className
}: TimeTrackingActionBarProps) {
  const [state, setState] = useState<TimeTrackingState>(
    currentState || { status: 'checked_out' }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [breakTimer, setBreakTimer] = useState<number>(0)

  const featureCheck = useTimeTrackingFeatureAvailability(projectId)

  // Update local state when prop changes
  useEffect(() => {
    if (currentState) {
      setState(currentState)
    }
  }, [currentState])

  // Break timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (state.status === 'on_break' && state.breakStartTime) {
      interval = setInterval(() => {
        const breakStart = new Date(state.breakStartTime!).getTime()
        const now = Date.now()
        const elapsed = Math.floor((now - breakStart) / 1000 / 60) // minutes
        setBreakTimer(elapsed)

        // Check if break can be ended (after minimum duration)
        const minBreakDuration = 30 // minutes
        if (elapsed >= minBreakDuration && !state.canEndBreak) {
          const newState = { ...state, canEndBreak: true }
          setState(newState)
          onStateChange?.(newState)
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state, onStateChange])

  const handleAction = async (action: 'check_in' | 'start_break' | 'end_break' | 'check_out') => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000))

      let newState: TimeTrackingState

      switch (action) {
        case 'check_in':
          newState = {
            status: 'checked_in',
            checkInTime: new Date().toISOString()
          }
          break

        case 'start_break':
          newState = {
            ...state,
            status: 'on_break',
            breakStartTime: new Date().toISOString(),
            canEndBreak: false
          }
          break

        case 'end_break':
          newState = {
            ...state,
            status: 'checked_in',
            breakDuration: breakTimer,
            breakStartTime: undefined,
            canEndBreak: false
          }
          setBreakTimer(0)
          break

        case 'check_out':
          newState = {
            status: 'checked_out',
            checkInTime: undefined,
            breakStartTime: undefined,
            breakDuration: undefined,
            canEndBreak: false
          }
          setBreakTimer(0)
          break

        default:
          throw new Error('Invalid action')
      }

      setState(newState)
      onStateChange?.(newState)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getActionButton = () => {
    switch (state.status) {
      case 'checked_out':
        return (
          <Button 
            onClick={() => handleAction('check_in')}
            disabled={loading}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Check In
          </Button>
        )

      case 'checked_in':
        return (
          <Button 
            onClick={() => handleAction('start_break')}
            disabled={loading}
            variant="outline"
            className="gap-2"
          >
            <Coffee className="h-4 w-4" />
            Start My Break
          </Button>
        )

      case 'on_break':
        return (
          <Button 
            onClick={() => handleAction('end_break')}
            disabled={loading || !state.canEndBreak}
            className="gap-2"
          >
            <Pause className="h-4 w-4" />
            {state.canEndBreak ? 'End My Break' : `Break Timer: ${breakTimer}m`}
          </Button>
        )

      default:
        return null
    }
  }

  const getStatusInfo = () => {
    switch (state.status) {
      case 'checked_out':
        return {
          icon: <Square className="h-4 w-4" />,
          text: 'Not checked in',
          color: 'text-muted-foreground'
        }

      case 'checked_in':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: state.checkInTime 
            ? `Checked in at ${new Date(state.checkInTime).toLocaleTimeString()}`
            : 'Checked in',
          color: 'text-green-600'
        }

      case 'on_break':
        return {
          icon: <Coffee className="h-4 w-4" />,
          text: `On break (${breakTimer}m)`,
          color: 'text-yellow-600'
        }

      default:
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          text: 'Unknown status',
          color: 'text-destructive'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <TimeTrackingGuard 
      projectId={projectId}
      fallback={
        <Card className={className}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{projectName}</p>
                  <p className="text-xs text-muted-foreground">
                    Time tracking unavailable
                  </p>
                </div>
              </div>
              <Alert className="max-w-xs">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {featureCheck.guidance || featureCheck.requirement}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      }
    >
      <Card className={className}>
        <CardContent className="p-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-full bg-muted p-2 ${statusInfo.color}`}>
                {statusInfo.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{projectName}</p>
                <p className={`text-xs ${statusInfo.color}`}>
                  {statusInfo.text}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {state.status === 'checked_in' && (
                <Button 
                  onClick={() => handleAction('check_out')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Check Out
                </Button>
              )}
              {getActionButton()}
            </div>
          </div>
        </CardContent>
      </Card>
    </TimeTrackingGuard>
  )
}

/**
 * Simplified time tracking button for use in navigation or headers
 */
export function TimeTrackingButton({
  projectId,
  userId,
  currentState,
  onStateChange,
  size = 'default'
}: {
  projectId: string
  userId: string
  currentState?: TimeTrackingState
  onStateChange?: (newState: TimeTrackingState) => void
  size?: 'sm' | 'default' | 'lg'
}) {
  const [state, setState] = useState<TimeTrackingState>(
    currentState || { status: 'checked_out' }
  )
  const [loading, setLoading] = useState(false)

  const featureCheck = useTimeTrackingFeatureAvailability(projectId)

  const handleQuickAction = async () => {
    setLoading(true)
    try {
      // Determine next action based on current state
      let action: 'check_in' | 'start_break' | 'end_break' | 'check_out'
      
      switch (state.status) {
        case 'checked_out':
          action = 'check_in'
          break
        case 'checked_in':
          action = 'start_break'
          break
        case 'on_break':
          action = 'end_break'
          break
        default:
          action = 'check_in'
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      // Update state based on action
      let newState: TimeTrackingState
      switch (action) {
        case 'check_in':
          newState = { status: 'checked_in', checkInTime: new Date().toISOString() }
          break
        case 'start_break':
          newState = { ...state, status: 'on_break', breakStartTime: new Date().toISOString() }
          break
        case 'end_break':
          newState = { ...state, status: 'checked_in', breakStartTime: undefined }
          break
        case 'check_out':
          newState = { status: 'checked_out' }
          break
      }

      setState(newState)
      onStateChange?.(newState)

    } catch (error) {
      console.error('Time tracking action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getButtonText = () => {
    switch (state.status) {
      case 'checked_out':
        return 'Check In'
      case 'checked_in':
        return 'Start Break'
      case 'on_break':
        return 'End Break'
      default:
        return 'Check In'
    }
  }

  const getButtonIcon = () => {
    switch (state.status) {
      case 'checked_out':
        return <Play className="h-4 w-4" />
      case 'checked_in':
        return <Coffee className="h-4 w-4" />
      case 'on_break':
        return <Pause className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (!featureCheck.available) {
    return (
      <Button 
        variant="outline" 
        size={size}
        disabled
        className="gap-2"
      >
        <Lock className="h-4 w-4" />
        Time Tracking
      </Button>
    )
  }

  return (
    <Button 
      onClick={handleQuickAction}
      disabled={loading}
      size={size}
      className="gap-2"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        getButtonIcon()
      )}
      {getButtonText()}
    </Button>
  )
}