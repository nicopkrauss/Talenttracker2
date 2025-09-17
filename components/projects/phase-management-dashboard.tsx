"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  AlertTriangle, 
  Settings, 
  BarChart3,
  Clock,
  CheckSquare
} from 'lucide-react'
import { ProjectPhase, TransitionResult } from '@/lib/types/project-phase'
import { PhaseIndicator, PhaseIndicatorFull } from './phase-indicator'
import { PhaseActionItems } from './phase-action-items'
import { PhaseTransitionButton, PhaseTransitionButtonFull } from './phase-transition-button'
import { PhaseProgressIndicator } from './phase-progress-indicator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface PhaseData {
  projectId: string
  currentPhase: ProjectPhase
  transitionResult: TransitionResult
  lastUpdated: string
}

interface ActionItemsSummary {
  total: number
  completed: number
  required: number
  requiredCompleted: number
  byPriority: {
    high: number
    medium: number
    low: number
  }
  byCategory: Record<string, number>
}

interface PhaseManagementDashboardProps {
  projectId: string
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
  defaultTab?: 'overview' | 'actions' | 'progress'
}

export function PhaseManagementDashboard({
  projectId,
  className,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  defaultTab = 'overview'
}: PhaseManagementDashboardProps) {
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  const [actionItemsSummary, setActionItemsSummary] = useState<ActionItemsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(defaultTab)

  useEffect(() => {
    fetchPhaseData()
  }, [projectId])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchPhaseData(true)
      }, refreshInterval)
      
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, projectId])

  const fetchPhaseData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Fetch phase data
      const phaseResponse = await fetch(`/api/projects/${projectId}/phase`)
      if (!phaseResponse.ok) {
        throw new Error('Failed to fetch phase data')
      }
      const phaseResult = await phaseResponse.json()
      setPhaseData(phaseResult.data)

      // Fetch action items summary
      const actionItemsResponse = await fetch(`/api/projects/${projectId}/phase/action-items?includeReadiness=true`)
      if (actionItemsResponse.ok) {
        const actionItemsResult = await actionItemsResponse.json()
        setActionItemsSummary(actionItemsResult.data.summary)
      }

    } catch (err: any) {
      console.error('Error fetching phase data:', err)
      setError(err.message || 'Failed to load phase data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleTransitionComplete = () => {
    // Refresh data after successful transition
    fetchPhaseData(true)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!phaseData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No phase data available</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with current phase and refresh */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Project Lifecycle</CardTitle>
              <PhaseIndicatorFull currentPhase={phaseData.currentPhase} />
            </div>
            <div className="flex items-center gap-2">
              {refreshing && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPhaseData(true)}
                disabled={refreshing}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <PhaseTransitionButtonFull
            projectId={projectId}
            currentPhase={phaseData.currentPhase}
            transitionResult={phaseData.transitionResult}
            onTransitionComplete={handleTransitionComplete}
          />
        </CardContent>
      </Card>

      {/* Tabbed content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Action Items
            {actionItemsSummary && actionItemsSummary.total > actionItemsSummary.completed && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                {actionItemsSummary.total - actionItemsSummary.completed}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Overview */}
            <PhaseProgressIndicator
              projectId={projectId}
              currentPhase={phaseData.currentPhase}
              transitionResult={phaseData.transitionResult}
              actionItemsSummary={actionItemsSummary}
              showDetails={false}
              showNextSteps={true}
            />

            {/* Quick Stats */}
            {actionItemsSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {actionItemsSummary.completed}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Items Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {actionItemsSummary.total - actionItemsSummary.completed}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Items Remaining
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {actionItemsSummary.byPriority.high}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        High Priority
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {actionItemsSummary.required - actionItemsSummary.requiredCompleted}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Required Items
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Transition Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transition Status</CardTitle>
            </CardHeader>
            <CardContent>
              {phaseData.transitionResult.canTransition ? (
                <Alert>
                  <CheckSquare className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Ready for next phase!</p>
                      <p className="text-sm">
                        All requirements have been met. You can advance to the next phase manually 
                        or wait for automatic transition if scheduled.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : phaseData.transitionResult.scheduledAt ? (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Automatic transition scheduled</p>
                      <p className="text-sm">
                        Will advance automatically on{' '}
                        {new Date(phaseData.transitionResult.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Requirements not met</p>
                      <p className="text-sm">Complete the following to advance:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {phaseData.transitionResult.blockers.map((blocker, index) => (
                          <li key={index}>{blocker}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <PhaseActionItems
            projectId={projectId}
            currentPhase={phaseData.currentPhase}
            showFilters={true}
            showSummary={true}
            autoRefresh={autoRefresh}
            refreshInterval={refreshInterval}
          />
        </TabsContent>

        <TabsContent value="progress">
          <PhaseProgressIndicator
            projectId={projectId}
            currentPhase={phaseData.currentPhase}
            transitionResult={phaseData.transitionResult}
            actionItemsSummary={actionItemsSummary}
            showDetails={true}
            showNextSteps={true}
          />
        </TabsContent>
      </Tabs>

      {/* Last updated info */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(phaseData.lastUpdated).toLocaleString()}
      </div>
    </div>
  )
}

// Compact version for embedding in other dashboards
export function PhaseManagementWidget({
  projectId,
  className
}: {
  projectId: string
  className?: string
}) {
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  const [actionItemsSummary, setActionItemsSummary] = useState<ActionItemsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [phaseResponse, actionItemsResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/phase`),
          fetch(`/api/projects/${projectId}/phase/action-items?includeReadiness=true`)
        ])

        if (phaseResponse.ok) {
          const phaseResult = await phaseResponse.json()
          setPhaseData(phaseResult.data)
        }

        if (actionItemsResponse.ok) {
          const actionItemsResult = await actionItemsResponse.json()
          setActionItemsSummary(actionItemsResult.data.summary)
        }
      } catch (error) {
        console.error('Error fetching phase widget data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  if (loading || !phaseData) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Project Phase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PhaseIndicator 
          currentPhase={phaseData.currentPhase}
          showDescription={true}
          size="sm"
        />
        
        {actionItemsSummary && (
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {actionItemsSummary.completed}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">
                {actionItemsSummary.total - actionItemsSummary.completed}
              </div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
          </div>
        )}

        {phaseData.transitionResult.canTransition && (
          <div className="text-center">
            <div className="text-xs text-green-600 font-medium">
              ✓ Ready to advance
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}