"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Target,
  TrendingUp,
  Info
} from 'lucide-react'
import { ProjectPhase, TransitionResult } from '@/lib/types/project-phase'
import { cn } from '@/lib/utils'

interface PhaseProgressIndicatorProps {
  projectId: string
  currentPhase: ProjectPhase
  transitionResult: TransitionResult
  actionItemsSummary?: {
    total: number
    completed: number
    required: number
    requiredCompleted: number
  }
  className?: string
  showDetails?: boolean
  showNextSteps?: boolean
}

const phaseOrder = [
  ProjectPhase.PREP,
  ProjectPhase.STAFFING,
  ProjectPhase.PRE_SHOW,
  ProjectPhase.ACTIVE,
  ProjectPhase.POST_SHOW,
  ProjectPhase.COMPLETE,
  ProjectPhase.ARCHIVED
]

const phaseConfig = {
  [ProjectPhase.PREP]: {
    label: 'Preparation',
    description: 'Project setup and configuration',
    color: 'blue'
  },
  [ProjectPhase.STAFFING]: {
    label: 'Staffing',
    description: 'Team hiring and talent assignment',
    color: 'purple'
  },
  [ProjectPhase.PRE_SHOW]: {
    label: 'Pre-Show',
    description: 'Final preparations',
    color: 'orange'
  },
  [ProjectPhase.ACTIVE]: {
    label: 'Active',
    description: 'Live operations',
    color: 'green'
  },
  [ProjectPhase.POST_SHOW]: {
    label: 'Post-Show',
    description: 'Wrap-up and timecards',
    color: 'yellow'
  },
  [ProjectPhase.COMPLETE]: {
    label: 'Complete',
    description: 'Project finished',
    color: 'emerald'
  },
  [ProjectPhase.ARCHIVED]: {
    label: 'Archived',
    description: 'Historical data',
    color: 'gray'
  }
}

export function PhaseProgressIndicator({
  projectId,
  currentPhase,
  transitionResult,
  actionItemsSummary,
  className,
  showDetails = true,
  showNextSteps = true
}: PhaseProgressIndicatorProps) {
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase)
  const totalPhases = phaseOrder.length
  const progressPercentage = ((currentPhaseIndex + 1) / totalPhases) * 100

  // Calculate completion percentage for current phase
  const currentPhaseCompletion = actionItemsSummary 
    ? actionItemsSummary.total > 0 
      ? (actionItemsSummary.completed / actionItemsSummary.total) * 100
      : 100
    : 0

  // Calculate required items completion
  const requiredCompletion = actionItemsSummary
    ? actionItemsSummary.required > 0
      ? (actionItemsSummary.requiredCompleted / actionItemsSummary.required) * 100
      : 100
    : 0

  const getPhaseStatus = (phase: ProjectPhase) => {
    const phaseIndex = phaseOrder.indexOf(phase)
    if (phaseIndex < currentPhaseIndex) return 'completed'
    if (phaseIndex === currentPhaseIndex) return 'current'
    return 'upcoming'
  }

  const formatScheduledDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Project Progress
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              Phase {currentPhaseIndex + 1} of {totalPhases}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {Math.round(progressPercentage)}% complete
          </div>
        </div>

        {/* Current Phase Progress */}
        {actionItemsSummary && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Current Phase Completion</span>
                <span className="text-muted-foreground">
                  {actionItemsSummary.completed} of {actionItemsSummary.total} items
                </span>
              </div>
              <Progress value={currentPhaseCompletion} className="h-2" />
            </div>

            {actionItemsSummary.required > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-orange-600">Required Items</span>
                  <span className="text-muted-foreground">
                    {actionItemsSummary.requiredCompleted} of {actionItemsSummary.required} complete
                  </span>
                </div>
                <Progress value={requiredCompletion} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Phase Timeline */}
        {showDetails && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Phase Timeline
            </h4>
            <div className="space-y-2">
              {phaseOrder.map((phase, index) => {
                const status = getPhaseStatus(phase)
                const config = phaseConfig[phase]
                
                return (
                  <div
                    key={phase}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      status === 'current' && "bg-muted/50 border border-border",
                      status === 'completed' && "opacity-75"
                    )}
                  >
                    <div className="flex-shrink-0">
                      {status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : status === 'current' ? (
                        <Clock className="h-4 w-4 text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          status === 'current' && "text-foreground",
                          status === 'completed' && "text-muted-foreground",
                          status === 'upcoming' && "text-muted-foreground"
                        )}>
                          {config.label}
                        </span>
                        {status === 'current' && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {showNextSteps && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Next Steps
            </h4>
            
            {transitionResult.canTransition && transitionResult.targetPhase ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Ready to advance!</p>
                    <p className="text-sm">
                      All requirements met for transition to{' '}
                      <span className="font-medium">
                        {phaseConfig[transitionResult.targetPhase].label}
                      </span>
                      {transitionResult.reason && (
                        <>. {transitionResult.reason}</>
                      )}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : transitionResult.scheduledAt ? (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Scheduled transition</p>
                    <p className="text-sm">
                      Will automatically advance to{' '}
                      <span className="font-medium">
                        {transitionResult.targetPhase ? phaseConfig[transitionResult.targetPhase].label : 'next phase'}
                      </span>{' '}
                      on {formatScheduledDate(transitionResult.scheduledAt)}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : transitionResult.blockers.length > 0 ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Requirements needed:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {transitionResult.blockers.slice(0, 3).map((blocker, index) => (
                        <li key={index}>{blocker}</li>
                      ))}
                      {transitionResult.blockers.length > 3 && (
                        <li className="text-muted-foreground">
                          +{transitionResult.blockers.length - 3} more requirements
                        </li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Continue working on current phase items to progress toward the next phase.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for dashboard widgets
export function PhaseProgressIndicatorCompact({
  currentPhase,
  transitionResult,
  actionItemsSummary,
  className
}: Omit<PhaseProgressIndicatorProps, 'projectId' | 'showDetails' | 'showNextSteps'>) {
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase)
  const totalPhases = phaseOrder.length
  const progressPercentage = ((currentPhaseIndex + 1) / totalPhases) * 100

  const currentPhaseCompletion = actionItemsSummary 
    ? actionItemsSummary.total > 0 
      ? (actionItemsSummary.completed / actionItemsSummary.total) * 100
      : 100
    : 0

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Project Progress</span>
        <Badge variant="outline" className="text-xs">
          Phase {currentPhaseIndex + 1}/{totalPhases}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{phaseConfig[currentPhase].label}</span>
          <span>{Math.round(progressPercentage)}% complete</span>
        </div>
      </div>

      {actionItemsSummary && actionItemsSummary.total > 0 && (
        <div className="space-y-1">
          <Progress value={currentPhaseCompletion} className="h-1" />
          <div className="text-xs text-muted-foreground">
            {actionItemsSummary.completed}/{actionItemsSummary.total} phase items complete
          </div>
        </div>
      )}

      {transitionResult.canTransition ? (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" />
          Ready to advance
        </div>
      ) : transitionResult.scheduledAt ? (
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <Calendar className="h-3 w-3" />
          Scheduled transition
        </div>
      ) : (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {transitionResult.blockers.length} requirements pending
        </div>
      )}
    </div>
  )
}