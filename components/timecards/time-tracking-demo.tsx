'use client'

import { useTimeTracking } from '@/hooks/use-time-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'

interface TimeTrackingDemoProps {
  projectId: string
  userRole: 'talent_escort' | 'supervisor' | 'coordinator'
  scheduledStartTime?: string
}

export function TimeTrackingDemo({ 
  projectId, 
  userRole, 
  scheduledStartTime 
}: TimeTrackingDemoProps) {
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
    isOvertime,
    timecardRecord,
    refreshState
  } = useTimeTracking({
    projectId,
    userRole,
    scheduledStartTime,
    onStateChange: (state) => {
      console.log('State changed:', state)
    },
    onShiftLimitExceeded: () => {
      alert('20-hour shift limit exceeded! Time tracking has been automatically stopped.')
    }
  })

  const getActionButton = () => {
    const buttonProps = {
      disabled: loading || currentState.nextAction === 'complete',
      className: "w-full"
    }

    switch (currentState.nextAction) {
      case 'check_in':
        return (
          <Button {...buttonProps} onClick={checkIn}>
            Check In
          </Button>
        )
      case 'start_break':
        return (
          <Button {...buttonProps} onClick={startBreak}>
            Start My Break
          </Button>
        )
      case 'end_break':
        return (
          <Button 
            {...buttonProps} 
            onClick={endBreak}
            disabled={loading || !currentState.canEndBreak}
          >
            End My Break
          </Button>
        )
      case 'check_out':
        return (
          <Button {...buttonProps} onClick={checkOut}>
            Check Out
          </Button>
        )
      case 'complete':
        return (
          <div className="flex items-center justify-center p-4 text-green-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            Shift Complete
          </div>
        )
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    const statusColors = {
      checked_out: 'bg-gray-500',
      checked_in: 'bg-blue-500',
      on_break: 'bg-yellow-500',
      break_ended: 'bg-green-500'
    }

    return (
      <Badge className={statusColors[currentState.status]}>
        {currentState.status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Time Tracking
          </span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Role: {userRole.replace('_', ' ')} • Project: {projectId.slice(0, 8)}...
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            {contextInfo}
          </div>
          
          {shiftDuration > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Shift Duration:</span>
              <span className={isOvertime ? 'text-orange-600 font-medium' : ''}>
                {shiftDuration.toFixed(1)} hours
                {isOvertime && (
                  <AlertTriangle className="w-4 h-4 inline ml-1" />
                )}
              </span>
            </div>
          )}

          {currentState.status === 'on_break' && currentState.breakStartTime && (
            <div className="text-sm text-gray-600">
              Break started: {new Date(currentState.breakStartTime).toLocaleTimeString()}
            </div>
          )}
        </div>

        {getActionButton()}

        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshState}
            disabled={loading}
            className="flex-1"
          >
            Refresh
          </Button>
          
          {timecardRecord && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => console.log('Timecard:', timecardRecord)}
              className="flex-1"
            >
              Debug
            </Button>
          )}
        </div>

        {loading && (
          <div className="text-center text-sm text-gray-500">
            Processing...
          </div>
        )}
      </CardContent>
    </Card>
  )
}