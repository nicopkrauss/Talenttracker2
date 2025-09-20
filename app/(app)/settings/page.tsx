"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Settings, Clock, Shield, Bell, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GlobalSettings {
  breakDurations: {
    defaultEscortMinutes: number
    defaultStaffMinutes: number
  }
  timecardNotifications: {
    reminderFrequencyDays: number
    submissionOpensOnShowDay: boolean
  }
  shiftLimits: {
    maxHoursBeforeStop: number
    overtimeWarningHours: number
  }
  systemSettings: {
    archiveDate: {
      month: number
      day: number
    }
    postShowTransitionTime: string // "06:00"
  }
}

interface RolePermissions {
  inHouse: {
    canApproveTimecards: boolean
    canInitiateCheckout: boolean
    canManageProjects: boolean
  }
  supervisor: {
    canApproveTimecards: boolean
    canInitiateCheckout: boolean
  }
  coordinator: {
    canApproveTimecards: boolean
    canInitiateCheckout: boolean
  }
}

export default function GlobalSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<GlobalSettings | null>(null)
  const [permissions, setPermissions] = useState<RolePermissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/global')
      if (!response.ok) throw new Error('Failed to load settings')
      const result = await response.json()
      setSettings(result.data.settings)
      setPermissions(result.data.permissions)
    } catch (error) {
      console.error('Error loading global settings:', error)
      toast({
        title: "Error",
        description: "Failed to load global settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings || !permissions) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/global', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
          permissions
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      toast({
        title: "Success",
        description: "Global settings saved successfully",
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Global Settings</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Global Settings</h1>
        </div>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      {settings && (
        <>
          {/* Timecard & Break Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timecard & Break Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="escort-break">Default Escort Break Duration</Label>
                  <Select
                    value={settings.breakDurations.defaultEscortMinutes.toString()}
                    onValueChange={(value) => 
                      setSettings({
                        ...settings,
                        breakDurations: {
                          ...settings.breakDurations,
                          defaultEscortMinutes: parseInt(value)
                        }
                      })
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
                  <Label htmlFor="staff-break">Default Staff Break Duration</Label>
                  <Select
                    value={settings.breakDurations.defaultStaffMinutes.toString()}
                    onValueChange={(value) => 
                      setSettings({
                        ...settings,
                        breakDurations: {
                          ...settings.breakDurations,
                          defaultStaffMinutes: parseInt(value)
                        }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="reminder-frequency">Timecard Reminder Frequency</Label>
                  <Select
                    value={settings.timecardNotifications.reminderFrequencyDays.toString()}
                    onValueChange={(value) => 
                      setSettings({
                        ...settings,
                        timecardNotifications: {
                          ...settings.timecardNotifications,
                          reminderFrequencyDays: parseInt(value)
                        }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Daily</SelectItem>
                      <SelectItem value="2">Every 2 days</SelectItem>
                      <SelectItem value="3">Every 3 days</SelectItem>
                      <SelectItem value="7">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="submission-opens-show-day"
                    checked={settings.timecardNotifications.submissionOpensOnShowDay}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        timecardNotifications: {
                          ...settings.timecardNotifications,
                          submissionOpensOnShowDay: checked
                        }
                      })
                    }
                  />
                  <Label htmlFor="submission-opens-show-day">
                    Open timecard submission on show day
                  </Label>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max-hours">Maximum Hours Before Auto-Stop</Label>
                  <Input
                    id="max-hours"
                    type="number"
                    min="12"
                    max="24"
                    value={settings.shiftLimits.maxHoursBeforeStop}
                    onChange={(e) => 
                      setSettings({
                        ...settings,
                        shiftLimits: {
                          ...settings.shiftLimits,
                          maxHoursBeforeStop: parseInt(e.target.value) || 20
                        }
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overtime-warning">Overtime Warning Hours</Label>
                  <Input
                    id="overtime-warning"
                    type="number"
                    min="8"
                    max="16"
                    value={settings.shiftLimits.overtimeWarningHours}
                    onChange={(e) => 
                      setSettings({
                        ...settings,
                        shiftLimits: {
                          ...settings.shiftLimits,
                          overtimeWarningHours: parseInt(e.target.value) || 12
                        }
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="archive-month">Archive Date - Month</Label>
                  <Select
                    value={settings.systemSettings.archiveDate.month.toString()}
                    onValueChange={(value) => 
                      setSettings({
                        ...settings,
                        systemSettings: {
                          ...settings.systemSettings,
                          archiveDate: {
                            ...settings.systemSettings.archiveDate,
                            month: parseInt(value)
                          }
                        }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="archive-day">Archive Date - Day</Label>
                  <Input
                    id="archive-day"
                    type="number"
                    min="1"
                    max="31"
                    value={settings.systemSettings.archiveDate.day}
                    onChange={(e) => 
                      setSettings({
                        ...settings,
                        systemSettings: {
                          ...settings.systemSettings,
                          archiveDate: {
                            ...settings.systemSettings.archiveDate,
                            day: parseInt(e.target.value) || 1
                          }
                        }
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transition-time">Post-Show Transition Time</Label>
                <Input
                  id="transition-time"
                  type="time"
                  value={settings.systemSettings.postShowTransitionTime}
                  onChange={(e) => 
                    setSettings({
                      ...settings,
                      systemSettings: {
                        ...settings.systemSettings,
                        postShowTransitionTime: e.target.value
                      }
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Time when projects automatically transition from show mode to post-show mode
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Role permission configuration will be implemented in a future update. 
                  This section will allow administrators to define what actions each role can perform, 
                  such as timecard approval rights, checkout initiation permissions, and project management access.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}