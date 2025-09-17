"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ModeToggle, ProjectMode } from './mode-toggle'
import { useProjectMode } from '@/hooks/use-project-mode'

interface ModeToggleDemoProps {
  projectId: string
}

export function ModeToggleDemo({ projectId }: ModeToggleDemoProps) {
  const { currentMode, setMode, isConfiguration, isOperations } = useProjectMode({
    projectId,
    defaultMode: 'configuration'
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Mode Toggle System Demo
            <ModeToggle 
              currentMode={currentMode}
              onModeChange={setMode}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Current Mode:</span>
              <Badge variant={isConfiguration ? 'default' : 'secondary'}>
                {currentMode}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Configuration Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Shows project setup tabs: Info, Roles & Team, Talent Roster, Assignments, Settings
                </p>
                {isConfiguration && (
                  <Badge className="mt-2" variant="default">Active</Badge>
                )}
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Operations Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Shows live operations dashboard with real-time talent tracking and team status
                </p>
                {isOperations && (
                  <Badge className="mt-2" variant="default">Active</Badge>
                )}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Keyboard Shortcuts:</strong></p>
              <p>• Alt + C: Switch to Configuration mode</p>
              <p>• Alt + O: Switch to Operations mode</p>
              <p><strong>Persistence:</strong> Mode preference is saved to localStorage and URL</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Mode-specific content */}
      {isConfiguration ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Mode Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This would show the ProjectTabs component with Info, Roles & Team, Talent Roster, Assignments, and Settings tabs.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Operations Mode Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This would show the OperationsDashboard component with live talent tracking, team status, and real-time updates.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}