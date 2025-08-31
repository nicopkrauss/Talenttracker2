"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shuffle, X } from 'lucide-react'
import { EnhancedProject } from '@/lib/types'

interface AssignmentsTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function AssignmentsTab({ project, onProjectUpdate }: AssignmentsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Drag & Drop Pairing Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Talent-escort assignment interface will be implemented in a future task.</p>
            <p className="text-sm mt-2">This includes drag-and-drop pairing and assignment management.</p>
          </div>
          
          <div className="flex justify-center gap-4 mt-6">
            <Button variant="outline" disabled className="gap-2">
              <Shuffle className="h-4 w-4" />
              Randomize Remaining
            </Button>
            <Button variant="outline" disabled className="gap-2">
              <X className="h-4 w-4" />
              Clear All Assignments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}