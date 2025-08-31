"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText } from 'lucide-react'
import { EnhancedProject } from '@/lib/types'

interface SettingsTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function SettingsTab({ project, onProjectUpdate }: SettingsTabProps) {
  // Mock audit log data
  const mockAuditLog = [
    { date: 'Jan 15, 10:30 AM', user: 'John Doe', action: 'added 3 talent members' },
    { date: 'Jan 15, 11:15 AM', user: 'Jane Smith', action: 'updated pay rates' },
    { date: 'Jan 16, 09:00 AM', user: 'Admin', action: 'activated project' }
  ]

  return (
    <div className="space-y-6">
      {/* Project Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Project Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Default Break Duration</label>
              <Select defaultValue="30">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Payroll Export Format</label>
              <Select defaultValue="csv">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Notification Rules</label>
              <Button variant="outline" className="w-full">
                Configure...
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockAuditLog.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b last:border-b-0">
                <div className="text-sm">
                  <span className="text-muted-foreground">{entry.date}</span>
                  <span className="mx-2">-</span>
                  <span className="font-medium">{entry.user}</span>
                  <span className="mx-2">{entry.action}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attachments & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments & Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Add Note
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 border rounded">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">project_contract.pdf</span>
              </div>
              <div className="p-2 border rounded bg-muted/50">
                <p className="text-sm italic">"Remember to check catering requirements"</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}