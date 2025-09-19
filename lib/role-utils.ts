import { SystemRole, ProjectRole, UserRole } from './types'

/**
 * Role display names mapping for UI components
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Admin',
  in_house: 'In-House Manager',
  supervisor: 'Supervisor',
  coordinator: 'Coordinator',
  talent_escort: 'Talent Escort'
}

/**
 * Project role descriptions for UI components
 */
export const PROJECT_ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  supervisor: 'On-site Manager',
  coordinator: 'Informational Oversight',
  talent_escort: 'On-the-ground Operator'
}

/**
 * Role hierarchy and utility functions
 * 
 * System roles (stored in profiles.role):
 * - admin: Full system access
 * - in_house: System manager with configurable permissions
 * - null: Regular user with project-based roles only
 * 
 * Project roles (stored in team_assignments.role):
 * - supervisor: On-site manager with day rate tracking
 * - coordinator: Informational oversight role
 * - talent_escort: On-the-ground operator with hourly tracking
 * 
 * Role Priority: System Role > Project Role > Default (talent_escort)
 */

// System role hierarchy (higher number = more permissions)
const SYSTEM_ROLE_HIERARCHY: Record<SystemRole, number> = {
  admin: 100,
  in_house: 50,
  supervisor: 30,
  coordinator: 20,
  talent_escort: 10
}

// Project role hierarchy (higher number = more permissions)
const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  supervisor: 30,
  coordinator: 20,
  talent_escort: 10
}

/**
 * Determines the effective user role for navigation and permissions
 * System roles always override project roles
 */
export function getEffectiveUserRole(
  systemRole: SystemRole | null,
  projectRole?: ProjectRole | null
): UserRole {
  // System role takes precedence
  if (systemRole) {
    return systemRole
  }
  
  // Fall back to project role
  if (projectRole) {
    return projectRole
  }
  
  // Default to most restrictive role
  return 'talent_escort'
}

/**
 * Checks if a user has a specific role (system or project)
 */
export function hasRole(
  systemRole: SystemRole | null,
  projectRole: ProjectRole | null,
  targetRole: UserRole
): boolean {
  const effectiveRole = getEffectiveUserRole(systemRole, projectRole)
  return effectiveRole === targetRole
}

/**
 * Checks if a user has any of the specified roles
 */
export function hasAnyRole(
  systemRole: SystemRole | null,
  projectRole: ProjectRole | null,
  targetRoles: UserRole[]
): boolean {
  const effectiveRole = getEffectiveUserRole(systemRole, projectRole)
  return targetRoles.includes(effectiveRole)
}

/**
 * Checks if a user has admin-level access (admin or in_house system roles)
 */
export function hasAdminAccess(systemRole: SystemRole | null): boolean {
  return systemRole === 'admin' || systemRole === 'in_house'
}

/**
 * Checks if a user can access admin features
 * System roles (admin, in_house) can always access admin features
 */
export function canAccessAdminFeatures(systemRole: SystemRole | null): boolean {
  return hasAdminAccess(systemRole)
}

/**
 * Checks if a user can manage team assignments
 * Admin and in_house can manage all assignments
 * Supervisors can view but not modify (depending on project settings)
 */
export function canManageTeam(
  systemRole: SystemRole | null,
  projectRole?: ProjectRole | null
): boolean {
  // System roles can always manage team
  if (hasAdminAccess(systemRole)) {
    return true
  }
  
  // Project supervisors have limited team management
  return projectRole === 'supervisor'
}

/**
 * Checks if a user can manage talent
 * Most roles can manage talent with different permission levels
 */
export function canManageTalent(
  systemRole: SystemRole | null,
  projectRole?: ProjectRole | null
): boolean {
  // System roles can always manage talent
  if (hasAdminAccess(systemRole)) {
    return true
  }
  
  // Most project roles can manage talent
  const allowedProjectRoles: ProjectRole[] = [
    'supervisor',
    'coordinator',
    'talent_escort'
  ]
  
  return projectRole ? allowedProjectRoles.includes(projectRole) : false
}

/**
 * Checks if a user can approve timecards
 * Only admin and in_house system roles can approve timecards
 */
export function canApproveTimecards(systemRole: SystemRole | null): boolean {
  return hasAdminAccess(systemRole)
}

/**
 * Checks if a user can initiate checkout for escorts
 * Admin, in_house, and supervisors can initiate checkout
 */
export function canInitiateCheckout(
  systemRole: SystemRole | null,
  projectRole?: ProjectRole | null
): boolean {
  // System roles can always initiate checkout
  if (hasAdminAccess(systemRole)) {
    return true
  }
  
  // Supervisors can initiate checkout
  return projectRole === 'supervisor'
}

/**
 * Gets the permission level for a user role
 * Higher numbers indicate more permissions
 */
export function getRolePermissionLevel(
  systemRole: SystemRole | null,
  projectRole?: ProjectRole | null
): number {
  // System role permissions take precedence
  if (systemRole && SYSTEM_ROLE_HIERARCHY[systemRole]) {
    return SYSTEM_ROLE_HIERARCHY[systemRole]
  }
  
  // Fall back to project role permissions
  if (projectRole && PROJECT_ROLE_HIERARCHY[projectRole]) {
    return PROJECT_ROLE_HIERARCHY[projectRole]
  }
  
  // Default permission level
  return 0
}

/**
 * Compares two users' permission levels
 * Returns true if user1 has higher or equal permissions than user2
 */
export function hasHigherOrEqualPermissions(
  user1SystemRole: SystemRole | null,
  user1ProjectRole: ProjectRole | null,
  user2SystemRole: SystemRole | null,
  user2ProjectRole: ProjectRole | null
): boolean {
  const user1Level = getRolePermissionLevel(user1SystemRole, user1ProjectRole)
  const user2Level = getRolePermissionLevel(user2SystemRole, user2ProjectRole)
  
  return user1Level >= user2Level
}

/**
 * Gets the default route for a user based on their effective role
 */
export function getDefaultRouteForUser(
  systemRole: SystemRole | null,
  projectRole?: ProjectRole | null
): string {
  const effectiveRole = getEffectiveUserRole(systemRole, projectRole)
  
  // Admin and in_house users go to projects by default
  if (effectiveRole === 'admin' || effectiveRole === 'in_house') {
    return '/projects'
  }
  
  // All other roles go to talent by default
  return '/talent'
}

/**
 * Checks if a user needs project assignment
 * Users without system roles need project assignments to access the system
 */
export function needsProjectAssignment(systemRole: SystemRole | null): boolean {
  return !systemRole
}

/**
 * Gets user role display name for UI
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    in_house: 'In-House Manager',
    supervisor: 'Supervisor',
    coordinator: 'Coordinator',
    talent_escort: 'Talent Escort'
  }
  
  return roleNames[role] || 'Unknown Role'
}

/**
 * Gets role description for UI
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full system access and management capabilities',
    in_house: 'System management with configurable permissions',
    supervisor: 'On-site management with day rate time tracking',
    coordinator: 'Informational oversight with day rate tracking',
    talent_escort: 'On-the-ground operations with hourly time tracking'
  }
  
  return descriptions[role] || 'No description available'
}

/**
 * Gets role badge color classes for consistent styling across components
 */
export function getRoleColor(role: string | null): string {
  switch (role) {
    case 'admin':
      return 'bg-slate-900 text-slate-50 border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
    case 'in_house':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
    case 'supervisor':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800'
    case 'coordinator':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800'
    case 'talent_escort':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-800'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}