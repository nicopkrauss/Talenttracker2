"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  ArrowRight, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Shield,
  Calendar,
  Loader2
} from 'lucide-react'
import { ProjectPhase, TransitionResult } from '@/lib/types/project-phase'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { hasAdminAccess } from '@/lib/role-utils'

interface PhaseTransitionButtonProps {
  projectId: string
  currentPhase: ProjectPhase
  transitionResult: TransitionResult
  onTransitionComplete?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showBlockers?: boolean
}

const phaseLabels = {
  [ProjectPhase.PREP]: 'Preparation',
  [ProjectPhase.STAFFING]: 'Staffing',
  [ProjectPhase.PRE_SHOW]: 'Pre-Show',
  [ProjectPhase.ACTIVE]: 'Active',
  [ProjectPhase.POST_SHOW]: 'Post-Show',
  [ProjectPhase.COMPLETE]: 'Complete',
  [ProjectPhase.ARCHIVED]: 'Archived'
}

export function PhaseTransitionButton({
  projectId,
  currentPhase,
  transitionResult,
  onTransitionComplete,
  className,
  size = 'md',
  variant = 'default',
  showBlockers = true
}: PhaseTransitionButtonProps) {
  const { userProfile } = useAuth()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Check if user has permission for manual transitions
  const canManualTransition = userProfile?.role ? hasAdminAccess(userProfile.role) : false

  const handleTransition = async () => {
    if (!transitionResult.canTransition || !transitionResult.targetPhase) {
      return
    }

    try {
      setIsTransitioning(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/phase/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetPhase: transitionResult.targetPhase,
          trigger: 'manual',
          reason: 'Manual transition by administrator'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to transition phase')
      }

      setShowConfirmDialog(false)
      onTransitionComplete?.()
    } catch (err: any) {
      console.error('Error transitioning phase:', err)
      setError(err.message || 'Failed to transition phase')
    } finally {
      setIsTransitioning(false)
    }
  }

  // Don't show button if no transition is possible
  if (!transitionResult.targetPhase) {
    return null
  }

  const targetPhaseLabel = phaseLabels[transitionResult.targetPhase]
  const currentPhaseLabel = phaseLabels[currentPhase]

  // Scheduled transition (automatic)
  if (!transitionResult.canTransition && transitionResult.scheduledAt) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Scheduled: {new Date(transitionResult.scheduledAt).toLocaleDateString()}
        </Badge>
        {showBlockers && transitionResult.blockers.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {transitionResult.blockers[0]}
          </div>
        )}
      </div>
    )
  }

  // Blocked transition
  if (!transitionResult.canTransition) {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          variant="outline"
          size={size}
          disabled
          className="opacity-50"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Transition Blocked
        </Button>
        {showBlockers && transitionResult.blockers.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Requirements not met:</p>
                <ul className="list-disc list-inside space-y-1">
                  {transitionResult.blockers.map((blocker, index) => (
                    <li key={index} className="text-sm">{blocker}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  // Available transition
  return (
    <div className={cn("space-y-2", className)}>
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={!canManualTransition || isTransitioning}
            className="flex items-center gap-2"
          >
            {isTransitioning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Advance to {targetPhaseLabel}
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Confirm Phase Transition
            </DialogTitle>
            <DialogDescription>
              You are about to transition this project from{' '}
              <span className="font-medium">{currentPhaseLabel}</span> to{' '}
              <span className="font-medium">{targetPhaseLabel}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {transitionResult.reason && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Reason:</strong> {transitionResult.reason}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This action will update the project phase and log the transition 
                in the audit trail. This change cannot be undone automatically.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isTransitioning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransition}
              disabled={isTransitioning}
            >
              {isTransitioning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transitioning...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Confirm Transition
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!canManualTransition && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Manual phase transitions require administrator privileges.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Compact version for use in headers or toolbars
export function PhaseTransitionButtonCompact({
  projectId,
  currentPhase,
  transitionResult,
  onTransitionComplete,
  className
}: Omit<PhaseTransitionButtonProps, 'size' | 'variant' | 'showBlockers'>) {
  return (
    <PhaseTransitionButton
      projectId={projectId}
      currentPhase={currentPhase}
      transitionResult={transitionResult}
      onTransitionComplete={onTransitionComplete}
      size="sm"
      variant="outline"
      showBlockers={false}
      className={className}
    />
  )
}

// Full version with detailed blocker information
export function PhaseTransitionButtonFull({
  projectId,
  currentPhase,
  transitionResult,
  onTransitionComplete,
  className
}: Omit<PhaseTransitionButtonProps, 'size' | 'variant' | 'showBlockers'>) {
  return (
    <PhaseTransitionButton
      projectId={projectId}
      currentPhase={currentPhase}
      transitionResult={transitionResult}
      onTransitionComplete={onTransitionComplete}
      size="lg"
      variant="default"
      showBlockers={true}
      className={className}
    />
  )
}