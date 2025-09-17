'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  HistoryIcon, 
  RefreshCwIcon, 
  AlertTriangleIcon, 
  UserIcon, 
  ClockIcon,
  ArrowRightIcon,
  CalendarIcon
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PhaseTransition {
  id: string
  transitionedAt: string
  transitionedBy: {
    id: string
    name: string
    email?: string
  }
  fromPhase: string
  toPhase: string
  trigger: 'automatic' | 'manual' | 'system' | 'unknown'
  reason: string
  metadata?: any
}

interface PhaseTransitionHistoryData {
  projectId: string
  history: PhaseTransition[]
  totalTransitions: number
}

interface PhaseTransitionHistoryProps {
  projectId: string
  onRefresh?: () => void
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
  prep: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  staffing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  pre_show: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  post_show: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  complete: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  archived: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
}

const TRIGGER_LABELS: Record<string, string> = {
  automatic: 'Automatic',
  manual: 'Manual Override',
  system: 'System',
  unknown: 'Unknown'
}

const TRIGGER_COLORS: Record<string, string> = {
  automatic: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  system: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  unknown: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

export function PhaseTransitionHistory({ projectId, onRefresh }: PhaseTransitionHistoryProps) {
  const [data, setData] = useState<PhaseTransitionHistoryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchHistory()
  }, [projectId])

  const fetchHistory = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/phase/history`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch transition history')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transition history'
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

  const handleRefresh = async () => {
    await fetchHistory()
    onRefresh?.()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getPhaseLabel = (phase: string) => {
    return PHASE_LABELS[phase] || phase
  }

  const getPhaseColor = (phase: string) => {
    return PHASE_COLORS[phase] || 'bg-gray-100 text-gray-800'
  }

  const getTriggerLabel = (trigger: string) => {
    return TRIGGER_LABELS[trigger] || trigger
  }

  const getTriggerColor = (trigger: string) => {
    return TRIGGER_COLORS[trigger] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            Phase Transition History
          </CardTitle>
          <CardDescription>
            Track all phase changes and transitions for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            Phase Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchHistory} className="mt-4">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="h-5 w-5" />
              Phase Transition History
            </CardTitle>
            <CardDescription>
              Track all phase changes and transitions for this project
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data || data.history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Phase Transitions Yet</p>
            <p className="text-sm">
              Phase transitions will appear here as your project progresses through its lifecycle.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {data.totalTransitions} transition{data.totalTransitions !== 1 ? 's' : ''}
                </span>
              </div>
              {data.history.length > 0 && (
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last: {formatDate(data.history[0].transitionedAt).date}
                  </span>
                </div>
              )}
            </div>

            {/* Transition Timeline */}
            <div className="space-y-4">
              {data.history.map((transition, index) => {
                const { date, time } = formatDate(transition.transitionedAt)
                const isLatest = index === 0

                return (
                  <div key={transition.id} className="relative">
                    {/* Timeline connector */}
                    {index < data.history.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
                    )}

                    <div className={`flex gap-4 p-4 rounded-lg border ${
                      isLatest ? 'bg-accent/50 border-accent' : 'bg-background'
                    }`}>
                      {/* Timeline dot */}
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                        isLatest ? 'bg-primary' : 'bg-muted-foreground'
                      }`} />

                      <div className="flex-1 space-y-3">
                        {/* Transition header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getPhaseColor(transition.fromPhase)}>
                              {getPhaseLabel(transition.fromPhase)}
                            </Badge>
                            <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                            <Badge className={getPhaseColor(transition.toPhase)}>
                              {getPhaseLabel(transition.toPhase)}
                            </Badge>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getTriggerColor(transition.trigger)}
                          >
                            {getTriggerLabel(transition.trigger)}
                          </Badge>
                        </div>

                        {/* Transition details */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>{date} at {time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              <span>{transition.transitionedBy.name}</span>
                            </div>
                          </div>

                          {transition.reason && transition.reason !== 'No reason provided' && (
                            <p className="text-sm text-muted-foreground italic">
                              "{transition.reason}"
                            </p>
                          )}

                          {/* Additional metadata */}
                          {transition.metadata && Object.keys(transition.metadata).length > 0 && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                View details
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(transition.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>

                    {index < data.history.length - 1 && <Separator className="my-2" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}