"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Plus } from 'lucide-react'
import { EnhancedProject } from '@/lib/types'

interface TalentRosterTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function TalentRosterTab({ project, onProjectUpdate }: TalentRosterTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Talent Roster</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Manually
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Talent roster management interface will be implemented in a future task.</p>
            <p className="text-sm mt-2">This includes CSV import, manual entry, and bulk actions.</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button disabled>
          Finalize Talent Roster
        </Button>
      </div>
    </div>
  )
}