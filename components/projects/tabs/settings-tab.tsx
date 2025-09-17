"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileText, Trash2, AlertCircle, ExternalLink, Settings } from 'lucide-react'
import { FileUpload } from '@/components/projects/file-upload'
import { PhaseConfigurationPanel } from '@/components/projects/phase-configuration-panel'
import { PhaseTransitionHistory } from '@/components/projects/phase-transition-history'
import { EnhancedProject } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProjectSettings {
  projectId: string
  defaultBreakDuration: number
  payrollExportFormat: 'csv' | 'xlsx' | 'pdf'
  notificationRules: {
    timecardReminders: boolean
    shiftAlerts: boolean
    talentArrivalNotifications: boolean
    overtimeWarnings: boolean
  }
}

interface AuditLogEntry {
  id: string
  action: string
  details: any
  created_at: string
  user: {
    id: string
    full_name: string
  }
}

interface ProjectAttachment {
  id: string
  name: string
  type: 'file' | 'note'
  content?: string
  file_url?: string
  file_size?: number
  mime_type?: string
  created_at: string
  created_by_user: {
    id: string
    full_name: string
  }
}

interface SettingsTabProps {
  project: EnhancedProject
  onProjectUpdate: () => Promise<void>
}

export function SettingsTab({ project, onProjectUpdate }: SettingsTabProps) {
  const { toast } = useToast()
  const [settings, setSettings] = useState<ProjectSettings | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [project.id])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadSettings(),
        loadAuditLog(),
        loadAttachments()
      ])
    } catch (error) {
      console.error('Error loading settings data:', error)
      toast({
        title: "Error",
        description: "Failed to load project settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadSettings = async () => {
    const response = await fetch(`/api/projects/${project.id}/settings`)
    if (!response.ok) throw new Error('Failed to load settings')
    const result = await response.json()
    setSettings(result.data)
  }

  const loadAuditLog = async () => {
    const response = await fetch(`/api/projects/${project.id}/audit-log`)
    if (!response.ok) throw new Error('Failed to load audit log')
    const result = await response.json()
    setAuditLog(result.data)
  }

  const loadAttachments = async () => {
    const response = await fetch(`/api/projects/${project.id}/attachments`)
    if (!response.ok) throw new Error('Failed to load attachments')
    const result = await response.json()
    setAttachments(result.data)
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      toast({
        title: "Success",
        description: "Project settings saved successfully",
      })

      // Reload audit log to show the change
      await loadAuditLog()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return

    setIsAddingNote(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Note - ${new Date().toLocaleDateString()}`,
          type: 'note',
          content: newNote,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add note')
      }

      setNewNote('')
      await Promise.all([loadAttachments(), loadAuditLog()])
      
      toast({
        title: "Success",
        description: "Note added successfully",
      })
    } catch (error) {
      console.error('Error adding note:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add note",
        variant: "destructive",
      })
    } finally {
      setIsAddingNote(false)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete attachment')
      }

      await Promise.all([loadAttachments(), loadAuditLog()])
      
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting attachment:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete attachment",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatAuditAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'settings_updated': 'updated project settings',
      'file_uploaded': 'uploaded a file',
      'note_added': 'added a note',
      'file_deleted': 'deleted a file',
      'note_deleted': 'deleted a note',
      'project_created': 'created the project',
      'project_updated': 'updated project details',
      'project_activated': 'completed project setup',
      'checklist_updated': 'updated setup checklist',
    }
    return actionMap[action] || action
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Settings Guidance */}
      {(!settings || (auditLog.length === 0 && attachments.length === 0)) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Project Settings & Documentation</p>
              <p className="text-sm">
                Configure operational settings, upload project documents, and track changes to your project.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const element = document.getElementById('phase-config')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="gap-2"
                >
                  <Settings className="h-3 w-3" />
                  Phase Configuration
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const element = document.getElementById('notifications')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="gap-2"
                >
                  <Settings className="h-3 w-3" />
                  Configure Notifications
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const element = document.getElementById('attachments')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="gap-2"
                >
                  <Upload className="h-3 w-3" />
                  Upload Documents
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const element = document.querySelector('[data-testid="phase-transition-history"]')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="gap-2"
                >
                  <Settings className="h-3 w-3" />
                  View Phase History
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Phase Configuration */}
      <div id="phase-config">
        <PhaseConfigurationPanel 
          projectId={project.id}
          onConfigurationChange={() => {
            // Reload audit log to show configuration changes
            loadAuditLog()
          }}
        />
      </div>

      {/* Phase Transition History */}
      <PhaseTransitionHistory 
        projectId={project.id}
        onRefresh={() => {
          // Reload audit log when history is refreshed
          loadAuditLog()
        }}
      />

      {/* Project Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Project Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="break-duration">Default Break Duration</Label>
                  <Select
                    value={settings?.defaultBreakDuration?.toString() || '30'}
                    onValueChange={(value) => 
                      setSettings(settings ? {
                        ...settings,
                        defaultBreakDuration: parseInt(value)
                      } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="export-format">Payroll Export Format</Label>
                  <Select
                    value={settings?.payrollExportFormat || 'csv'}
                    onValueChange={(value: 'csv' | 'xlsx' | 'pdf') => 
                      setSettings(settings ? {
                        ...settings,
                        payrollExportFormat: value
                      } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notification Rules */}
              <div id="notifications" className="space-y-4">
                <Label>Notification Rules</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="timecard-reminders"
                      checked={settings?.notificationRules?.timecardReminders || false}
                      onCheckedChange={(checked) =>
                        setSettings(settings ? {
                          ...settings,
                          notificationRules: {
                            ...settings.notificationRules,
                            timecardReminders: checked
                          }
                        } : null)
                      }
                    />
                    <Label htmlFor="timecard-reminders">Timecard Reminders</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="shift-alerts"
                      checked={settings?.notificationRules?.shiftAlerts || false}
                      onCheckedChange={(checked) =>
                        setSettings(settings ? {
                          ...settings,
                          notificationRules: {
                            ...settings.notificationRules,
                            shiftAlerts: checked
                          }
                        } : null)
                      }
                    />
                    <Label htmlFor="shift-alerts">Shift Duration Alerts</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="talent-notifications"
                      checked={settings?.notificationRules?.talentArrivalNotifications || false}
                      onCheckedChange={(checked) =>
                        setSettings(settings ? {
                          ...settings,
                          notificationRules: {
                            ...settings.notificationRules,
                            talentArrivalNotifications: checked
                          }
                        } : null)
                      }
                    />
                    <Label htmlFor="talent-notifications">Talent Arrival Notifications</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="overtime-warnings"
                      checked={settings?.notificationRules?.overtimeWarnings || false}
                      onCheckedChange={(checked) =>
                        setSettings(settings ? {
                          ...settings,
                          notificationRules: {
                            ...settings.notificationRules,
                            overtimeWarnings: checked
                          }
                        } : null)
                      }
                    />
                    <Label htmlFor="overtime-warnings">Overtime Warnings</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card id="audit">
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit log entries found
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between p-3 border-b last:border-b-0">
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()} at{' '}
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </span>
                      <span className="mx-2">-</span>
                      <span className="font-medium">{entry.user.full_name}</span>
                      <span className="mx-2">{formatAuditAction(entry.action)}</span>
                    </div>
                    {entry.details && (
                      <div className="text-xs text-muted-foreground ml-4">
                        {JSON.stringify(entry.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attachments & Notes */}
      <Card id="attachments">
        <CardHeader>
          <CardTitle>Attachments & Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add Note Section */}
            <div className="space-y-2">
              <Label htmlFor="new-note">Add Note</Label>
              <Textarea
                id="new-note"
                placeholder="Enter your note here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={addNote} 
                disabled={!newNote.trim() || isAddingNote}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                {isAddingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload Files</Label>
              <FileUpload 
                projectId={project.id} 
                onUploadComplete={loadAttachments}
              />
            </div>
            
            {/* Attachments List */}
            <div className="space-y-2">
              {attachments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No attachments or notes yet
                </div>
              ) : (
                attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-start gap-3 p-3 border rounded">
                    {attachment.type === 'file' ? (
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-500 mt-0.5" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {attachment.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAttachment(attachment.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {attachment.type === 'note' && attachment.content && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          "{attachment.content}"
                        </p>
                      )}
                      
                      {attachment.type === 'file' && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xs text-muted-foreground">
                            {attachment.file_size && formatFileSize(attachment.file_size)}
                            {attachment.mime_type && ` • ${attachment.mime_type}`}
                          </div>
                          {attachment.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-6 px-2 text-xs"
                            >
                              <a 
                                href={attachment.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        Added by {attachment.created_by_user.full_name} on{' '}
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}