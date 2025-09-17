'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CalendarIcon, ClockIcon, SettingsIcon, AlertTriangleIcon, ChevronDownIcon, InfoIcon, ArrowRightIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PhaseConfiguration {
  currentPhase: string
  phaseUpdatedAt: string | null
  autoTransitionsEnabled: boolean
  location: string | null
  timezone: string | null
  rehearsalStartDate: string | null
  showEndDate: string | null
  archiveMonth: number
  archiveDay: number
  postShowTransitionHour: number
}

interface PhaseConfigurationPanelProps {
  projectId: string
  initialConfiguration?: PhaseConfiguration
  onConfigurationChange?: (config: PhaseConfiguration) => void
}

const PHASE_LABELS: Record<string, string> = {
  prep: 'Preparation',
  staffing: 'Staffing',
  pre_show: 'Pre-Show',
  active: 'Active',
  post_show: 'Post-Show',
  complete: 'Complete',
  archived: 'Archived'
}

const PHASE_COLORS: Record<string, string> = {
  prep: 'bg-blue-100 text-blue-800',
  staffing: 'bg-yellow-100 text-yellow-800',
  pre_show: 'bg-orange-100 text-orange-800',
  active: 'bg-green-100 text-green-800',
  post_show: 'bg-purple-100 text-purple-800',
  complete: 'bg-gray-100 text-gray-800',
  archived: 'bg-slate-100 text-slate-800'
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function PhaseConfigurationPanel({ 
  projectId, 
  initialConfiguration,
  onConfigurationChange 
}: PhaseConfigurationPanelProps) {
  const [configuration, setConfiguration] = useState<PhaseConfiguration | null>(initialConfiguration || null)
  const [isLoading, setIsLoading] = useState(!initialConfiguration)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isTransitionGuideOpen, setIsTransitionGuideOpen] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    autoTransitionsEnabled: true,
    location: '',
    timezone: '',
    archiveMonth: 4,
    archiveDay: 1,
    postShowTransitionHour: 6
  })

  useEffect(() => {
    if (configuration) {
      setFormData({
        autoTransitionsEnabled: configuration.autoTransitionsEnabled,
        location: configuration.location || '',
        timezone: configuration.timezone || '',
        archiveMonth: configuration.archiveMonth,
        archiveDay: configuration.archiveDay,
        postShowTransitionHour: configuration.postShowTransitionHour
      })
    }
  }, [configuration])

  useEffect(() => {
    if (!initialConfiguration) {
      fetchConfiguration()
    }
  }, [projectId, initialConfiguration])

  const fetchConfiguration = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/phase/configuration`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch configuration')
      }

      const { data } = await response.json()
      setConfiguration(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch configuration'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-determine timezone when location changes
      if (field === 'location' && value) {
        import('@/lib/services/location-timezone-service').then(({ LocationTimezoneService }) => {
          const timezone = LocationTimezoneService.getTimezoneFromLocation(value)
          if (timezone) {
            setFormData(current => ({ ...current, timezone }))
          }
        })
      }
      
      return newData
    })
    setHasChanges(true)
  }

  const validateForm = (): string | null => {
    // Validate archive date combination
    try {
      const testDate = new Date(2024, formData.archiveMonth - 1, formData.archiveDay)
      if (testDate.getMonth() !== formData.archiveMonth - 1 || testDate.getDate() !== formData.archiveDay) {
        return 'Invalid archive date combination'
      }
    } catch (error) {
      return 'Invalid archive date'
    }

    // Validate post-show transition hour
    if (formData.postShowTransitionHour < 0 || formData.postShowTransitionHour > 23) {
      return 'Post-show transition hour must be between 0 and 23'
    }

    // Validate archive day for the selected month
    const daysInMonth = new Date(2024, formData.archiveMonth, 0).getDate()
    if (formData.archiveDay > daysInMonth) {
      return `${MONTH_NAMES[formData.archiveMonth - 1]} only has ${daysInMonth} days`
    }

    // Validate timezone
    if (formData.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: formData.timezone })
      } catch (error) {
        return 'Invalid timezone identifier'
      }
    }

    // Validate location format (basic check)
    if (formData.location && formData.location.length < 3) {
      return 'Location must be at least 3 characters long'
    }

    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const updateData = {
        autoTransitionsEnabled: formData.autoTransitionsEnabled,
        location: formData.location || null,
        timezone: formData.timezone || null,
        archiveMonth: formData.archiveMonth,
        archiveDay: formData.archiveDay,
        postShowTransitionHour: formData.postShowTransitionHour
      }

      const response = await fetch(`/api/projects/${projectId}/phase/configuration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update configuration')
      }

      const { data } = await response.json()
      setConfiguration(data)
      setHasChanges(false)
      onConfigurationChange?.(data)

      toast({
        title: 'Success',
        description: 'Phase configuration updated successfully'
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (configuration) {
      setFormData({
        autoTransitionsEnabled: configuration.autoTransitionsEnabled,
        location: configuration.location || '',
        timezone: configuration.timezone || '',
        archiveMonth: configuration.archiveMonth,
        archiveDay: configuration.archiveDay,
        postShowTransitionHour: configuration.postShowTransitionHour
      })
      setHasChanges(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Phase Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !configuration) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Phase Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchConfiguration} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!configuration) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Phase Configuration
        </CardTitle>
        <CardDescription>
          Configure automatic phase transitions and lifecycle settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Phase Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Phase</Label>
          <div className="flex items-center gap-2">
            <Badge className={PHASE_COLORS[configuration.currentPhase] || 'bg-gray-100 text-gray-800'}>
              {PHASE_LABELS[configuration.currentPhase] || configuration.currentPhase}
            </Badge>
            {configuration.phaseUpdatedAt && (
              <span className="text-sm text-muted-foreground">
                Updated {new Date(configuration.phaseUpdatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Phase Transition Guide */}
        <Collapsible open={isTransitionGuideOpen} onOpenChange={setIsTransitionGuideOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <InfoIcon className="h-4 w-4" />
                <span className="font-medium">Phase Transition Guide</span>
              </div>
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isTransitionGuideOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Projects automatically transition through phases based on completion criteria and dates. 
                Each phase unlocks specific features and capabilities relevant to that stage of production.
              </p>
              
              <div className="space-y-3">
                {/* Prep to Staffing */}
                <div className="flex items-start gap-3 p-3 bg-background rounded-md border">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge className="bg-blue-100 text-blue-800 shrink-0">Prep</Badge>
                    <ArrowRightIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Badge className="bg-yellow-100 text-yellow-800 shrink-0">Staffing</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Setup Complete</p>
                    <p className="text-xs text-muted-foreground">
                      Triggers when role templates, locations, and basic project info are configured
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>Relevance:</strong> Unlocks team assignment and talent roster management
                    </p>
                  </div>
                </div>

                {/* Staffing to Pre-Show */}
                <div className="flex items-start gap-3 p-3 bg-background rounded-md border">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge className="bg-yellow-100 text-yellow-800 shrink-0">Staffing</Badge>
                    <ArrowRightIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Badge className="bg-orange-100 text-orange-800 shrink-0">Pre-Show</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Team Complete</p>
                    <p className="text-xs text-muted-foreground">
                      Triggers when all essential roles are filled and talent roster is finalized
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>Relevance:</strong> Enables final preparations and pre-show planning
                    </p>
                  </div>
                </div>

                {/* Pre-Show to Active */}
                <div className="flex items-start gap-3 p-3 bg-background rounded-md border">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge className="bg-orange-100 text-orange-800 shrink-0">Pre-Show</Badge>
                    <ArrowRightIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Badge className="bg-green-100 text-green-800 shrink-0">Active</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Rehearsal Start (Midnight Local)</p>
                    <p className="text-xs text-muted-foreground">
                      Automatic transition at midnight on rehearsal start date in project timezone
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>Relevance:</strong> Activates time tracking, live operations dashboard, and real-time features
                    </p>
                  </div>
                </div>

                {/* Active to Post-Show */}
                <div className="flex items-start gap-3 p-3 bg-background rounded-md border">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge className="bg-green-100 text-green-800 shrink-0">Active</Badge>
                    <ArrowRightIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Badge className="bg-purple-100 text-purple-800 shrink-0">Post-Show</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Show End (6AM Local Next Day)</p>
                    <p className="text-xs text-muted-foreground">
                      Automatic transition at configured hour after show end date (default: 6AM)
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>Relevance:</strong> Shifts focus to timecard processing and payroll management
                    </p>
                  </div>
                </div>

                {/* Post-Show to Complete */}
                <div className="flex items-start gap-3 p-3 bg-background rounded-md border">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge className="bg-purple-100 text-purple-800 shrink-0">Post-Show</Badge>
                    <ArrowRightIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Badge className="bg-gray-100 text-gray-800 shrink-0">Complete</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">All Timecards Processed</p>
                    <p className="text-xs text-muted-foreground">
                      Triggers when all timecards are approved and payroll is complete
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>Relevance:</strong> Provides project summary and final reporting capabilities
                    </p>
                  </div>
                </div>

                {/* Complete to Archived */}
                <div className="flex items-start gap-3 p-3 bg-background rounded-md border">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge className="bg-gray-100 text-gray-800 shrink-0">Complete</Badge>
                    <ArrowRightIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Badge className="bg-slate-100 text-slate-800 shrink-0">Archived</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Archive Date (April 1st)</p>
                    <p className="text-xs text-muted-foreground">
                      Automatic archival on configured date (default: April 1st annually)
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>Relevance:</strong> Preserves historical data while reducing active project clutter
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <InfoIcon className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Why Phase-Based Management?
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Each phase provides features and workflows specific to that stage of production. 
                      This ensures users see relevant tools at the right time, reduces complexity, 
                      and provides clear project progression tracking without manual intervention.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Automatic Transitions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-transitions">Automatic Transitions</Label>
              <p className="text-sm text-muted-foreground">
                Enable automatic phase transitions based on dates and criteria
              </p>
            </div>
            <Switch
              id="auto-transitions"
              checked={formData.autoTransitionsEnabled}
              onCheckedChange={(checked) => handleInputChange('autoTransitionsEnabled', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Project Dates */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <Label className="text-sm font-medium">Project Dates</Label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rehearsal Start Date</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="text-sm">
                  {configuration.rehearsalStartDate 
                    ? new Date(configuration.rehearsalStartDate).toLocaleDateString()
                    : 'Not set - update project start date'
                  }
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Uses project start date - rehearsals begin on this date
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Show End Date</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="text-sm">
                  {configuration.showEndDate 
                    ? new Date(configuration.showEndDate).toLocaleDateString()
                    : 'Not set - update project end date'
                  }
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Uses project end date - show day is the final day
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Project Location</Label>
            <Input
              id="location"
              placeholder="e.g., Los Angeles, CA or New York City"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              City and state - timezone will be automatically determined
              {formData.timezone && (
                <span className="block mt-1 text-green-600">
                  Timezone: {formData.timezone}
                </span>
              )}
            </p>
          </div>
        </div>

        <Separator />

        {/* Transition Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            <Label className="text-sm font-medium">Transition Settings</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-show-hour">Post-Show Transition Hour</Label>
            <Input
              id="post-show-hour"
              type="number"
              min="0"
              max="23"
              value={formData.postShowTransitionHour}
              onChange={(e) => handleInputChange('postShowTransitionHour', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Hour (0-23) after show end date when transition to Post-Show occurs
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="archive-month">Archive Month</Label>
              <select
                id="archive-month"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.archiveMonth}
                onChange={(e) => handleInputChange('archiveMonth', parseInt(e.target.value))}
              >
                {MONTH_NAMES.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="archive-day">Archive Day</Label>
              <Input
                id="archive-day"
                type="number"
                min="1"
                max="31"
                value={formData.archiveDay}
                onChange={(e) => handleInputChange('archiveDay', parseInt(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Projects will be automatically archived on {MONTH_NAMES[formData.archiveMonth - 1]} {formData.archiveDay}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            Reset
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}