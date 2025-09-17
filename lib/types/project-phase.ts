/**
 * Project phase definitions
 * This file contains only types and enums that can be used on both client and server
 */

export enum ProjectPhase {
  PREP = 'prep',
  STAFFING = 'staffing',
  PRE_SHOW = 'pre_show',
  ACTIVE = 'active',
  POST_SHOW = 'post_show',
  COMPLETE = 'complete',
  ARCHIVED = 'archived'
}

export interface TransitionResult {
  canTransition: boolean
  nextPhase?: ProjectPhase
  blockers: string[]
  scheduledAt?: string
  reason?: string
}

export interface PhaseConfiguration {
  phase: ProjectPhase
  name: string
  description: string
  color: string
  icon: string
  allowedTransitions: ProjectPhase[]
  autoTransitionCriteria?: {
    type: 'time' | 'condition' | 'manual'
    value?: string | number
    conditions?: string[]
  }
}

export const PHASE_DISPLAY_NAMES: Record<ProjectPhase, string> = {
  [ProjectPhase.PREP]: 'Preparation',
  [ProjectPhase.STAFFING]: 'Staffing',
  [ProjectPhase.PRE_SHOW]: 'Pre-Show',
  [ProjectPhase.ACTIVE]: 'Active',
  [ProjectPhase.POST_SHOW]: 'Post-Show',
  [ProjectPhase.COMPLETE]: 'Complete',
  [ProjectPhase.ARCHIVED]: 'Archived'
}

export const PHASE_COLORS: Record<ProjectPhase, string> = {
  [ProjectPhase.PREP]: 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-200',
  [ProjectPhase.STAFFING]: 'bg-purple-50 text-purple-800 dark:bg-purple-950/20 dark:text-purple-200',
  [ProjectPhase.PRE_SHOW]: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200',
  [ProjectPhase.ACTIVE]: 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200',
  [ProjectPhase.POST_SHOW]: 'bg-orange-50 text-orange-800 dark:bg-orange-950/20 dark:text-orange-200',
  [ProjectPhase.COMPLETE]: 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200',
  [ProjectPhase.ARCHIVED]: 'bg-gray-50 text-gray-800 dark:bg-gray-950/20 dark:text-gray-200'
}