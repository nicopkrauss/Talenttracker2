'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TimeTrackingActionBar } from './time-tracking-action-bar'
import { ProjectRole } from '@/lib/types'
import { TimeTrackingState } from '@/hooks/use-time-tracking'

export function TimeTrackingActionBarDemo() {
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('talent_escort')
  const [stateHistory, setStateHistory] = useState<TimeTrackingState[]>([])
  const [shiftLimitExceeded, setShiftLimitExceeded] = useState(false)

  const handleStateChange = (state: TimeTrackingState) => {
    setStateHistory(prev => [...prev.slice(-4), state]) // Keep last 5 states
  }

  const handleShiftLimitExceeded = () => {
    setShiftLimitExceeded(true)
    setTimeout(() => setShiftLimitExceeded(false), 5000) // Clear after 5 seconds
  }

  const clearHistory = () => {
    setStateHistory([])
    setShiftLimitExceeded(false)
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Time Tracking Action Bar Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of the TimeTrackingActionBar component with different user roles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">User Role:</label>
            <Select value={selectedRole} onValueChange={(value: ProjectRole) => setSelectedRole(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="talent_escort">Talent Escort</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={clearHistory} variant="outline" size="sm">
              Clear History
            </Button>
          </div>

          {shiftLimitExceeded && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Alert</Badge>
                <span className="text-sm font-medium">20-hour shift limit exceeded! Time tracking automatically stopped.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Live Action Bar</h2>
          
          {/* Default size */}
          <div>
            <h3 className="text-sm font-medium mb-2">Default Size</h3>
            <TimeTrackingActionBar
              projectId="demo-project-123"
              userRole={selectedRole}
              scheduledStartTime="9:00 AM"
              projectName="Demo Production Project"
              onStateChange={handleStateChange}
              onShiftLimitExceeded={handleShiftLimitExceeded}
            />
          </div>

          {/* Compact size */}
          <div>
            <h3 className="text-sm font-medium mb-2">Compact Size</h3>
            <TimeTrackingActionBar
              projectId="demo-project-123"
              userRole={selectedRole}
              scheduledStartTime="9:00 AM"
              projectName="Demo Production Project"
              onStateChange={handleStateChange}
              onShiftLimitExceeded={handleShiftLimitExceeded}
              compact
            />
          </div>

          {/* Without project name */}
          <div>
            <h3 className="text-sm font-medium mb-2">Without Project Name</h3>
            <TimeTrackingActionBar
              projectId="demo-project-123"
              userRole={selectedRole}
              scheduledStartTime="9:00 AM"
              projectName="Demo Production Project"
              showProjectName={false}
              onStateChange={handleStateChange}
              onShiftLimitExceeded={handleShiftLimitExceeded}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">State History</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent State Changes</CardTitle>
            </CardHeader>
            <CardContent>
              {stateHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">No state changes yet. Interact with the action bar to see state transitions.</p>
              ) : (
                <div className="space-y-3">
                  {stateHistory.map((state, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={
                          state.status === 'checked_out' ? 'secondary' :
                          state.status === 'checked_in' ? 'default' :
                          state.status === 'on_break' ? 'secondary' :
                          'default'
                        }>
                          {state.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Next: {state.nextAction.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm">{state.contextInfo}</p>
                      {state.shiftDuration !== undefined && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Duration: {state.shiftDuration.toFixed(1)}h</span>
                          {state.isOvertime && <Badge variant="destructive" className="text-xs">Overtime</Badge>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role-Specific Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div>
                  <strong>Talent Escort:</strong>
                  <ul className="list-disc list-inside text-muted-foreground ml-2">
                    <li>Button disappears after break (checkout by supervisor)</li>
                    <li>30-minute default break duration</li>
                    <li>Hourly time tracking</li>
                  </ul>
                </div>
                <div>
                  <strong>Supervisor/Coordinator:</strong>
                  <ul className="list-disc list-inside text-muted-foreground ml-2">
                    <li>Can check out after break</li>
                    <li>60-minute default break duration</li>
                    <li>Day rate time tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Component Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">State Machine Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Stateful button interface (Check In → Start Break → End Break → Check Out)</li>
                <li>Dynamic contextual information display</li>
                <li>Break duration enforcement with grace period</li>
                <li>Role-based button behavior</li>
                <li>Real-time timer display during breaks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Monitoring & Safety:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Shift duration tracking</li>
                <li>Overtime warnings and indicators</li>
                <li>20-hour shift limit with automatic stop</li>
                <li>Error handling and user feedback</li>
                <li>Loading states and disabled button logic</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TimeTrackingActionBarDemo