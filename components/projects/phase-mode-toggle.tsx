"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Play, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import { ProjectPhase, TransitionResult } from '@/lib/types/project-phase'
import { PhaseIndicator } from './phase-indicator'
import { PhaseTransitionButtonCompact } from './phase-transition-button'
import { PhaseProgressIndicatorCompact } from './phase-progress-indicator'
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
}

interface PhaseModeToggleProps {
  projectId: string
  currentMode: 'configuration' | 'operations'
  onModeChange: (mode: 'configuration' | 'operations') => void
  className?: string
  showProgress?: boolean
  showTransitionButton?: boolean
}

/**
 * Phase-aware mode toggle component that replaces the old activate project system
 * Integrates with the existing mode toggle while showing phase information
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */
export function PhaseModeToggle({
  projectId,
  currentMode,
  onModeChange,
  className,
  showProgress = true,
  showTransitionButton = true
}: PhaseModeToggleProps) {
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  const [actionItemsSummary, setActionItemsSummary] = useState<ActionItemsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPhaseData()
  }, [projectId])

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
    fetchPhaseData(true)
  }

  const getRecommendedMode = (phase: ProjectPhase): 'configuration' | 'operations' => {
    // Recommend configuration mode for setup phases
    if (phase === ProjectPhase.PREP || phase === ProjectPhase.STAFFING) {
      return 'configuration'
    }
    // Recommend operations mode for active phases
    if (phase === ProjectPhase.ACTIVE || phase === ProjectPhase.PRE_SHOW) {
      return 'operations'
    }
    // Default to current mode for other phases
    return currentMode
  }

  const getModeDescription = (mode: 'configuration' | 'operations', phase: ProjectPhase) => {
    if (mode === 'configuration') {
      switch (phase) {
        case ProjectPhase.PREP:
          return 'Set up project basics, roles, and locations'
        case ProjectPhase.STAFFING:
          return 'Assign team members and manage talent roster'
        case ProjectPhase.PRE_SHOW:
          return 'Complete final preparations and readiness checks'
        default:
          return 'Configure project settings and setup'
      }
    } else {
      switch (phase) {
        case ProjectPhase.ACTIVE:
          return 'Live operations, real-time tracking, and management'
        case ProjectPhase.PRE_SHOW:
          return 'Monitor readiness and prepare for go-live'
        case ProjectPhase.POST_SHOW:
          return 'Process timecards and handle wrap-up tasks'
        default:
          return 'Operational dashboards and real-time features'
      }
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading phase data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !phaseData) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Failed to load phase data'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const recommendedMode = getRecommendedMode(phaseData.currentPhase)
  const isRecommendedMode = currentMode === recommendedMode

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Project Mode</CardTitle>
          <div className="flex items-center gap-2">
            {refreshing && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchPhaseData(true)}
              disabled={refreshing}
              className="h-6 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Phase Display */}
        <div className="space-y-2">
          <PhaseIndicator 
            currentPhase={phaseData.currentPhase}
            size="sm"
            showIcon={true}
            showDescription={false}
          />
          
          {showProgress && actionItemsSummary && (
            <PhaseProgressIndicatorCompact
              currentPhase={phaseData.currentPhase}
              transitionResult={phaseData.transitionResult}
              actionItemsSummary={actionItemsSummary}
            />
          )}
        </div>

        <Separator />

        {/* Mode Toggle Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={currentMode === 'configuration' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('configuration')}
              className="flex items-center gap-2 h-auto py-2 px-3"
            >
              <Settings className="h-3 w-3" />
              <div className="text-left">
                <div className="text-xs font-medium">Setup</div>
                {recommendedMode === 'configuration' && !isRecommendedMode && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Recommended
                  </Badge>
                )}
              </div>
            </Button>

            <Button
              variant={currentMode === 'operations' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('operations')}
              className="flex items-center gap-2 h-auto py-2 px-3"
            >
              <Play className="h-3 w-3" />
              <div className="text-left">
                <div className="text-xs font-medium">Operations</div>
                {recommendedMode === 'operations' && !isRecommendedMode && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Recommended
                  </Badge>
                )}
              </div>
            </Button>
          </div>

          {/* Mode Description */}
          <div className="text-xs text-muted-foreground leading-relaxed">
            {getModeDescription(currentMode, phaseData.currentPhase)}
          </div>

          {/* Recommendation Alert */}
          {!isRecommendedMode && (
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Tip:</strong> {recommendedMode === 'configuration' ? 'Setup' : 'Operations'} mode 
                is recommended for the {phaseData.currentPhase.replace('_', '-')} phase.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Phase Transition */}
        {showTransitionButton && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
                Phase Transition
              </div>
              
              {phaseData.transitionResult.canTransition ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Ready to advance
                  </div>
                  <PhaseTransitionButtonCompact
                    projectId={projectId}
                    currentPhase={phaseData.currentPhase}
                    transitionResult={phaseData.transitionResult}
                    onTransitionComplete={handleTransitionComplete}
                  />
                </div>
              ) : phaseData.transitionResult.scheduledAt ? (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Clock className="h-3 w-3" />
                  <span>
                    Scheduled: {new Date(phaseData.transitionResult.scheduledAt).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    {phaseData.transitionResult.blockers.length} requirements pending
                  </div>
                  {actionItemsSummary && actionItemsSummary.required > actionItemsSummary.requiredCompleted && (
                    <div className="text-xs text-muted-foreground">
                      Complete {actionItemsSummary.required - actionItemsSummary.requiredCompleted} required items to advance
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Updated: {new Date(phaseData.lastUpdated).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}

// Minimal version for tight spaces
export function PhaseModeToggleMinimal({
  projectId,
  currentMode,
  onModeChange,
  className
}: Omit<PhaseModeToggleProps, 'showProgress' | 'showTransitionButton'>) {
  return (
    <PhaseModeToggle
      projectId={projectId}
      currentMode={currentMode}
      onModeChange={onModeChange}
      className={className}
      showProgress={false}
      showTransitionButton={false}
    />
  )
}