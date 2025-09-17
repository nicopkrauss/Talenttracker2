/**
 * Mode-specific components for project detail views
 * Components are directly imported for immediate loading (better UX)
 */

import { ProjectTabs } from './project-tabs'
import { OperationsDashboard } from './operations-dashboard'

// Configuration mode wrapper
export const ConfigurationModeComponents = {
  Tabs: ProjectTabs
}

// Operations mode wrapper
export const OperationsModeComponents = {
  Dashboard: OperationsDashboard
}

// Legacy preload function for backward compatibility (now no-op)
export const preloadModeComponents = (mode: 'configuration' | 'operations') => {
  // Components are now directly imported, no preloading needed
}