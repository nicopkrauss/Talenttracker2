// Phase Display and Mode Toggle Components
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3

export { 
  PhaseIndicator, 
  PhaseIndicatorCompact, 
  PhaseIndicatorFull 
} from './phase-indicator'

export { 
  PhaseActionItems 
} from './phase-action-items'

export { 
  PhaseTransitionButton, 
  PhaseTransitionButtonCompact, 
  PhaseTransitionButtonFull 
} from './phase-transition-button'

export { 
  PhaseProgressIndicator, 
  PhaseProgressIndicatorCompact 
} from './phase-progress-indicator'

export { 
  PhaseManagementDashboard, 
  PhaseManagementWidget 
} from './phase-management-dashboard'

export { SimpleModeToggle } from './simple-mode-toggle'
export { 
  PhaseModeToggle, 
  PhaseModeToggleMinimal 
} from './phase-mode-toggle'

// Re-export phase engine types for convenience
export type { ProjectPhase, TransitionResult } from '@/lib/types/project-phase'