import { describe, it, expect, beforeEach } from 'vitest'

// Mock readiness calculation functions
interface ProjectReadiness {
  project_id: string
  has_default_locations: boolean
  custom_location_count: number
  locations_finalized: boolean
  locations_status: 'default-only' | 'configured' | 'finalized'
  has_default_roles: boolean
  custom_role_count: number
  roles_finalized: boolean
  roles_status: 'default-only' | 'configured' | 'finalized'
  total_staff_assigned: number
  supervisor_count: number
  escort_count: number
  coordinator_count: number
  team_finalized: boolean
  team_status: 'none' | 'partial' | 'finalized'
  total_talent: number
  talent_finalized: boolean
  talent_status: 'none' | 'partial' | 'finalized'
  assignments_status: 'none' | 'partial' | 'current' | 'complete'
  urgent_assignment_issues: number
  overall_status: 'getting-started' | 'operational' | 'production-ready'
  last_updated: string
}

interface AssignmentProgress {
  totalAssignments: number
  completedAssignments: number
  urgentIssues: number
  upcomingDeadlines: Array<{
    date: string
    missingAssignments: number
    daysFromNow: number
  }>
  assignmentRate: number
  totalEntities: number
  projectDays: number
}

interface TodoItem {
  id: string
  area: 'locations' | 'roles' | 'team' | 'talent' | 'assignments'
  priority: 'critical' | 'important' | 'optional'
  title: string
  description: string
  actionText: string
  actionRoute: string
}

interface FeatureAvailability {
  timeTracking: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  assignments: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  locationTracking: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  supervisorCheckout: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  talentManagement: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  projectOperations: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
  notifications: {
    available: boolean
    requirement: string
    guidance?: string
    actionRoute?: string
  }
}

// Readiness calculation functions (extracted from API route)
function calculateFeatureAvailability(readiness: ProjectReadiness): FeatureAvailability {
  return {
    timeTracking: {
      available: readiness.total_staff_assigned > 0,
      requirement: 'At least one staff member assigned',
      guidance: readiness.total_staff_assigned === 0 
        ? 'Assign team members to enable time tracking' 
        : undefined,
      actionRoute: readiness.total_staff_assigned === 0 ? '/roles-team' : undefined
    },
    assignments: {
      available: readiness.total_talent > 0 && readiness.escort_count > 0,
      requirement: 'Both talent and escorts assigned',
      guidance: readiness.total_talent === 0 
        ? 'Add talent to enable assignments'
        : readiness.escort_count === 0 
        ? 'Assign escorts to enable assignments'
        : undefined,
      actionRoute: readiness.total_talent === 0 
        ? '/talent-roster' 
        : readiness.escort_count === 0 
        ? '/roles-team' 
        : undefined
    },
    locationTracking: {
      available: readiness.locations_status !== 'default-only' && readiness.assignments_status !== 'none',
      requirement: 'Custom locations and assignments configured',
      guidance: readiness.locations_status === 'default-only'
        ? 'Add custom locations to enable tracking'
        : readiness.assignments_status === 'none'
        ? 'Make escort assignments to enable location tracking'
        : undefined,
      actionRoute: readiness.locations_status === 'default-only'
        ? '/info'
        : readiness.assignments_status === 'none'
        ? '/assignments'
        : undefined
    },
    supervisorCheckout: {
      available: readiness.supervisor_count > 0 && readiness.escort_count > 0,
      requirement: 'Supervisor and escorts assigned',
      guidance: readiness.supervisor_count === 0
        ? 'Assign a supervisor to enable checkout controls'
        : readiness.escort_count === 0
        ? 'Assign escorts to enable checkout controls'
        : undefined,
      actionRoute: '/roles-team'
    },
    talentManagement: {
      available: readiness.total_talent > 0,
      requirement: 'At least one talent assigned',
      guidance: readiness.total_talent === 0
        ? 'Add talent to enable talent management features'
        : undefined,
      actionRoute: readiness.total_talent === 0 ? '/talent-roster' : undefined
    },
    projectOperations: {
      available: readiness.overall_status === 'operational' || readiness.overall_status === 'production-ready',
      requirement: 'Project must be operational (staff, talent, and escorts assigned)',
      guidance: readiness.overall_status === 'getting-started'
        ? 'Complete basic setup to enable operations dashboard'
        : undefined,
      actionRoute: readiness.total_staff_assigned === 0 
        ? '/roles-team'
        : readiness.total_talent === 0
        ? '/talent-roster'
        : readiness.escort_count === 0
        ? '/roles-team'
        : undefined
    },
    notifications: {
      available: readiness.total_staff_assigned > 0 || readiness.total_talent > 0,
      requirement: 'Staff or talent assigned to receive notifications',
      guidance: readiness.total_staff_assigned === 0 && readiness.total_talent === 0
        ? 'Assign staff or talent to enable notifications'
        : undefined,
      actionRoute: readiness.total_staff_assigned === 0 && readiness.total_talent === 0
        ? '/roles-team'
        : undefined
    }
  }
}

function generateTodoItems(readiness: ProjectReadiness, assignmentProgress?: AssignmentProgress): TodoItem[] {
  const todoItems: TodoItem[] = []

  // Critical items (red) - blocks core functionality
  if (readiness.total_staff_assigned === 0) {
    todoItems.push({
      id: 'assign-team',
      area: 'team',
      priority: 'critical',
      title: 'Assign team members',
      description: 'No staff assigned to this project',
      actionText: 'Go to Roles & Team',
      actionRoute: '/roles-team'
    })
  }

  if (readiness.total_talent === 0) {
    todoItems.push({
      id: 'add-talent',
      area: 'talent',
      priority: 'critical',
      title: 'Add talent to roster',
      description: 'No talent assigned to this project',
      actionText: 'Go to Talent Roster',
      actionRoute: '/talent-roster'
    })
  }

  if (readiness.escort_count === 0 && readiness.total_talent > 0) {
    todoItems.push({
      id: 'assign-escorts',
      area: 'team',
      priority: 'critical',
      title: 'Assign talent escorts',
      description: 'Talent needs escort assignments',
      actionText: 'Go to Roles & Team',
      actionRoute: '/roles-team'
    })
  }

  // Assignment-related critical issues
  if (assignmentProgress && assignmentProgress.urgentIssues > 0) {
    const issuePlural = assignmentProgress.urgentIssues === 1 ? 'assignment' : 'assignments'
    todoItems.push({
      id: 'urgent-assignments',
      area: 'assignments',
      priority: 'critical',
      title: 'Complete urgent assignments',
      description: `${assignmentProgress.urgentIssues} ${issuePlural} needed for tomorrow`,
      actionText: 'Go to Assignments',
      actionRoute: '/assignments'
    })
  }

  // Important items (yellow) - should be addressed soon
  if (readiness.roles_status === 'default-only') {
    todoItems.push({
      id: 'configure-roles',
      area: 'roles',
      priority: 'important',
      title: 'Configure custom roles',
      description: 'Using default roles only',
      actionText: 'Go to Roles & Team',
      actionRoute: '/roles-team'
    })
  }

  if (readiness.locations_status === 'default-only') {
    todoItems.push({
      id: 'configure-locations',
      area: 'locations',
      priority: 'important',
      title: 'Add custom locations',
      description: 'Using default locations only',
      actionText: 'Go to Info Tab',
      actionRoute: '/info'
    })
  }

  // Assignment progress warnings
  if (assignmentProgress && assignmentProgress.upcomingDeadlines && assignmentProgress.upcomingDeadlines.length > 0) {
    const nextDeadline = assignmentProgress.upcomingDeadlines[0]
    const dayText = nextDeadline.daysFromNow === 1 ? 'tomorrow' : `in ${nextDeadline.daysFromNow} days`
    todoItems.push({
      id: 'upcoming-assignments',
      area: 'assignments',
      priority: 'important',
      title: 'Complete upcoming assignments',
      description: `${nextDeadline.missingAssignments} assignments needed ${dayText}`,
      actionText: 'Go to Assignments',
      actionRoute: '/assignments'
    })
  }

  // Team composition warnings
  if (readiness.supervisor_count === 0 && readiness.total_staff_assigned > 0) {
    todoItems.push({
      id: 'assign-supervisor',
      area: 'team',
      priority: 'important',
      title: 'Assign a supervisor',
      description: 'No supervisor assigned for team oversight',
      actionText: 'Go to Roles & Team',
      actionRoute: '/roles-team'
    })
  }

  // Optional items (blue) - nice to have improvements
  if (!readiness.roles_finalized && readiness.roles_status !== 'default-only') {
    todoItems.push({
      id: 'finalize-roles',
      area: 'roles',
      priority: 'optional',
      title: 'Finalize role configuration',
      description: 'Mark roles as complete when ready',
      actionText: 'Go to Roles & Team',
      actionRoute: '/roles-team'
    })
  }

  if (!readiness.locations_finalized && readiness.locations_status !== 'default-only') {
    todoItems.push({
      id: 'finalize-locations',
      area: 'locations',
      priority: 'optional',
      title: 'Finalize location setup',
      description: 'Mark locations as complete when ready',
      actionText: 'Go to Info Tab',
      actionRoute: '/info'
    })
  }

  if (!readiness.team_finalized && readiness.team_status !== 'none') {
    todoItems.push({
      id: 'finalize-team',
      area: 'team',
      priority: 'optional',
      title: 'Finalize team assignments',
      description: 'Mark team setup as complete when ready',
      actionText: 'Go to Roles & Team',
      actionRoute: '/roles-team'
    })
  }

  if (!readiness.talent_finalized && readiness.talent_status !== 'none') {
    todoItems.push({
      id: 'finalize-talent',
      area: 'talent',
      priority: 'optional',
      title: 'Finalize talent roster',
      description: 'Mark talent roster as complete when ready',
      actionText: 'Go to Talent Roster',
      actionRoute: '/talent-roster'
    })
  }

  return todoItems
}

function calculateOverallStatus(readiness: ProjectReadiness): 'getting-started' | 'operational' | 'production-ready' {
  // Must have staff, talent, and escorts for operational status
  if (readiness.total_staff_assigned > 0 && readiness.total_talent > 0 && readiness.escort_count > 0) {
    // Check if everything is finalized for production-ready
    if (readiness.locations_finalized && readiness.roles_finalized && 
        readiness.team_finalized && readiness.talent_finalized) {
      return 'production-ready'
    }
    return 'operational'
  }
  
  return 'getting-started'
}

describe('Readiness Calculation Logic', () => {
  let baseReadiness: ProjectReadiness

  beforeEach(() => {
    baseReadiness = {
      project_id: 'test-project-id',
      has_default_locations: true,
      custom_location_count: 0,
      locations_finalized: false,
      locations_status: 'default-only',
      has_default_roles: true,
      custom_role_count: 0,
      roles_finalized: false,
      roles_status: 'default-only',
      total_staff_assigned: 0,
      supervisor_count: 0,
      escort_count: 0,
      coordinator_count: 0,
      team_finalized: false,
      team_status: 'none',
      total_talent: 0,
      talent_finalized: false,
      talent_status: 'none',
      assignments_status: 'none',
      urgent_assignment_issues: 0,
      overall_status: 'getting-started',
      last_updated: new Date().toISOString()
    }
  })

  describe('Feature Availability Calculation', () => {
    it('should disable time tracking when no staff assigned', () => {
      const availability = calculateFeatureAvailability(baseReadiness)
      
      expect(availability.timeTracking.available).toBe(false)
      expect(availability.timeTracking.guidance).toBe('Assign team members to enable time tracking')
      expect(availability.timeTracking.actionRoute).toBe('/roles-team')
    })

    it('should enable time tracking when staff assigned', () => {
      const readiness = { ...baseReadiness, total_staff_assigned: 2 }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.timeTracking.available).toBe(true)
      expect(availability.timeTracking.guidance).toBeUndefined()
      expect(availability.timeTracking.actionRoute).toBeUndefined()
    })

    it('should disable assignments when no talent', () => {
      const readiness = { ...baseReadiness, escort_count: 2 }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.assignments.available).toBe(false)
      expect(availability.assignments.guidance).toBe('Add talent to enable assignments')
      expect(availability.assignments.actionRoute).toBe('/talent-roster')
    })

    it('should disable assignments when no escorts', () => {
      const readiness = { ...baseReadiness, total_talent: 3 }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.assignments.available).toBe(false)
      expect(availability.assignments.guidance).toBe('Assign escorts to enable assignments')
      expect(availability.assignments.actionRoute).toBe('/roles-team')
    })

    it('should enable assignments when both talent and escorts assigned', () => {
      const readiness = { ...baseReadiness, total_talent: 3, escort_count: 2 }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.assignments.available).toBe(true)
      expect(availability.assignments.guidance).toBeUndefined()
    })

    it('should disable location tracking with default locations only', () => {
      const readiness = { 
        ...baseReadiness, 
        locations_status: 'default-only',
        assignments_status: 'partial'
      }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.locationTracking.available).toBe(false)
      expect(availability.locationTracking.guidance).toBe('Add custom locations to enable tracking')
      expect(availability.locationTracking.actionRoute).toBe('/info')
    })

    it('should disable location tracking with no assignments', () => {
      const readiness = { 
        ...baseReadiness, 
        locations_status: 'configured',
        assignments_status: 'none'
      }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.locationTracking.available).toBe(false)
      expect(availability.locationTracking.guidance).toBe('Make escort assignments to enable location tracking')
      expect(availability.locationTracking.actionRoute).toBe('/assignments')
    })

    it('should enable location tracking with custom locations and assignments', () => {
      const readiness = { 
        ...baseReadiness, 
        locations_status: 'configured',
        assignments_status: 'partial'
      }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.locationTracking.available).toBe(true)
      expect(availability.locationTracking.guidance).toBeUndefined()
    })

    it('should disable supervisor checkout without supervisor', () => {
      const readiness = { ...baseReadiness, escort_count: 2 }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.supervisorCheckout.available).toBe(false)
      expect(availability.supervisorCheckout.guidance).toBe('Assign a supervisor to enable checkout controls')
    })

    it('should disable supervisor checkout without escorts', () => {
      const readiness = { ...baseReadiness, supervisor_count: 1 }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.supervisorCheckout.available).toBe(false)
      expect(availability.supervisorCheckout.guidance).toBe('Assign escorts to enable checkout controls')
    })

    it('should enable supervisor checkout with both supervisor and escorts', () => {
      const readiness = { ...baseReadiness, supervisor_count: 1, escort_count: 2 }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.supervisorCheckout.available).toBe(true)
      expect(availability.supervisorCheckout.guidance).toBeUndefined()
    })

    it('should enable project operations when operational', () => {
      const readiness = { ...baseReadiness, overall_status: 'operational' as const }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.projectOperations.available).toBe(true)
      expect(availability.projectOperations.guidance).toBeUndefined()
    })

    it('should enable project operations when production-ready', () => {
      const readiness = { ...baseReadiness, overall_status: 'production-ready' as const }
      const availability = calculateFeatureAvailability(readiness)
      
      expect(availability.projectOperations.available).toBe(true)
      expect(availability.projectOperations.guidance).toBeUndefined()
    })
  })

  describe('Todo Items Generation', () => {
    it('should generate critical todo for no staff assigned', () => {
      const todos = generateTodoItems(baseReadiness)
      
      const staffTodo = todos.find(t => t.id === 'assign-team')
      expect(staffTodo).toBeDefined()
      expect(staffTodo?.priority).toBe('critical')
      expect(staffTodo?.title).toBe('Assign team members')
      expect(staffTodo?.actionRoute).toBe('/roles-team')
    })

    it('should generate critical todo for no talent assigned', () => {
      const todos = generateTodoItems(baseReadiness)
      
      const talentTodo = todos.find(t => t.id === 'add-talent')
      expect(talentTodo).toBeDefined()
      expect(talentTodo?.priority).toBe('critical')
      expect(talentTodo?.title).toBe('Add talent to roster')
      expect(talentTodo?.actionRoute).toBe('/talent-roster')
    })

    it('should generate critical todo for no escorts when talent exists', () => {
      const readiness = { ...baseReadiness, total_talent: 3 }
      const todos = generateTodoItems(readiness)
      
      const escortTodo = todos.find(t => t.id === 'assign-escorts')
      expect(escortTodo).toBeDefined()
      expect(escortTodo?.priority).toBe('critical')
      expect(escortTodo?.title).toBe('Assign talent escorts')
    })

    it('should not generate escort todo when no talent', () => {
      const todos = generateTodoItems(baseReadiness)
      
      const escortTodo = todos.find(t => t.id === 'assign-escorts')
      expect(escortTodo).toBeUndefined()
    })

    it('should generate urgent assignment todo', () => {
      const assignmentProgress: AssignmentProgress = {
        totalAssignments: 10,
        completedAssignments: 5,
        urgentIssues: 3,
        upcomingDeadlines: [],
        assignmentRate: 50,
        totalEntities: 5,
        projectDays: 2
      }
      
      const todos = generateTodoItems(baseReadiness, assignmentProgress)
      
      const urgentTodo = todos.find(t => t.id === 'urgent-assignments')
      expect(urgentTodo).toBeDefined()
      expect(urgentTodo?.priority).toBe('critical')
      expect(urgentTodo?.description).toBe('3 assignments needed for tomorrow')
    })

    it('should generate important todos for default-only configurations', () => {
      const todos = generateTodoItems(baseReadiness)
      
      const rolesTodo = todos.find(t => t.id === 'configure-roles')
      const locationsTodo = todos.find(t => t.id === 'configure-locations')
      
      expect(rolesTodo).toBeDefined()
      expect(rolesTodo?.priority).toBe('important')
      expect(locationsTodo).toBeDefined()
      expect(locationsTodo?.priority).toBe('important')
    })

    it('should generate upcoming deadline todo', () => {
      const assignmentProgress: AssignmentProgress = {
        totalAssignments: 10,
        completedAssignments: 5,
        urgentIssues: 0,
        upcomingDeadlines: [
          { date: '2024-01-15', missingAssignments: 2, daysFromNow: 2 }
        ],
        assignmentRate: 50,
        totalEntities: 5,
        projectDays: 2
      }
      
      const todos = generateTodoItems(baseReadiness, assignmentProgress)
      
      const upcomingTodo = todos.find(t => t.id === 'upcoming-assignments')
      expect(upcomingTodo).toBeDefined()
      expect(upcomingTodo?.priority).toBe('important')
      expect(upcomingTodo?.description).toBe('2 assignments needed in 2 days')
    })

    it('should generate supervisor assignment todo', () => {
      const readiness = { ...baseReadiness, total_staff_assigned: 3, supervisor_count: 0 }
      const todos = generateTodoItems(readiness)
      
      const supervisorTodo = todos.find(t => t.id === 'assign-supervisor')
      expect(supervisorTodo).toBeDefined()
      expect(supervisorTodo?.priority).toBe('important')
      expect(supervisorTodo?.title).toBe('Assign a supervisor')
    })

    it('should generate optional finalization todos', () => {
      const readiness = { 
        ...baseReadiness, 
        roles_status: 'configured' as const,
        locations_status: 'configured' as const,
        team_status: 'partial' as const,
        talent_status: 'partial' as const
      }
      const todos = generateTodoItems(readiness)
      
      const finalizeRoles = todos.find(t => t.id === 'finalize-roles')
      const finalizeLocations = todos.find(t => t.id === 'finalize-locations')
      const finalizeTeam = todos.find(t => t.id === 'finalize-team')
      const finalizeTalent = todos.find(t => t.id === 'finalize-talent')
      
      expect(finalizeRoles).toBeDefined()
      expect(finalizeRoles?.priority).toBe('optional')
      expect(finalizeLocations).toBeDefined()
      expect(finalizeLocations?.priority).toBe('optional')
      expect(finalizeTeam).toBeDefined()
      expect(finalizeTeam?.priority).toBe('optional')
      expect(finalizeTalent).toBeDefined()
      expect(finalizeTalent?.priority).toBe('optional')
    })

    it('should not generate finalization todos for default-only status', () => {
      const todos = generateTodoItems(baseReadiness)
      
      const finalizeRoles = todos.find(t => t.id === 'finalize-roles')
      const finalizeLocations = todos.find(t => t.id === 'finalize-locations')
      
      expect(finalizeRoles).toBeUndefined()
      expect(finalizeLocations).toBeUndefined()
    })
  })

  describe('Overall Status Calculation', () => {
    it('should return getting-started for empty project', () => {
      const status = calculateOverallStatus(baseReadiness)
      expect(status).toBe('getting-started')
    })

    it('should return getting-started without staff', () => {
      const readiness = { ...baseReadiness, total_talent: 3, escort_count: 2 }
      const status = calculateOverallStatus(readiness)
      expect(status).toBe('getting-started')
    })

    it('should return getting-started without talent', () => {
      const readiness = { ...baseReadiness, total_staff_assigned: 3, escort_count: 2 }
      const status = calculateOverallStatus(readiness)
      expect(status).toBe('getting-started')
    })

    it('should return getting-started without escorts', () => {
      const readiness = { ...baseReadiness, total_staff_assigned: 3, total_talent: 2 }
      const status = calculateOverallStatus(readiness)
      expect(status).toBe('getting-started')
    })

    it('should return operational with staff, talent, and escorts', () => {
      const readiness = { 
        ...baseReadiness, 
        total_staff_assigned: 3, 
        total_talent: 2, 
        escort_count: 2 
      }
      const status = calculateOverallStatus(readiness)
      expect(status).toBe('operational')
    })

    it('should return production-ready when everything is finalized', () => {
      const readiness = { 
        ...baseReadiness, 
        total_staff_assigned: 3, 
        total_talent: 2, 
        escort_count: 2,
        locations_finalized: true,
        roles_finalized: true,
        team_finalized: true,
        talent_finalized: true
      }
      const status = calculateOverallStatus(readiness)
      expect(status).toBe('production-ready')
    })

    it('should return operational when not all areas finalized', () => {
      const readiness = { 
        ...baseReadiness, 
        total_staff_assigned: 3, 
        total_talent: 2, 
        escort_count: 2,
        locations_finalized: true,
        roles_finalized: false, // Not finalized
        team_finalized: true,
        talent_finalized: true
      }
      const status = calculateOverallStatus(readiness)
      expect(status).toBe('operational')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined assignment progress gracefully', () => {
      const todos = generateTodoItems(baseReadiness, undefined)
      
      const urgentTodo = todos.find(t => t.id === 'urgent-assignments')
      const upcomingTodo = todos.find(t => t.id === 'upcoming-assignments')
      
      expect(urgentTodo).toBeUndefined()
      expect(upcomingTodo).toBeUndefined()
    })

    it('should handle empty upcoming deadlines array', () => {
      const assignmentProgress: AssignmentProgress = {
        totalAssignments: 10,
        completedAssignments: 5,
        urgentIssues: 0,
        upcomingDeadlines: [],
        assignmentRate: 50,
        totalEntities: 5,
        projectDays: 2
      }
      
      const todos = generateTodoItems(baseReadiness, assignmentProgress)
      
      const upcomingTodo = todos.find(t => t.id === 'upcoming-assignments')
      expect(upcomingTodo).toBeUndefined()
    })

    it('should handle singular vs plural assignment descriptions', () => {
      const assignmentProgress: AssignmentProgress = {
        totalAssignments: 10,
        completedAssignments: 5,
        urgentIssues: 1, // Singular
        upcomingDeadlines: [],
        assignmentRate: 50,
        totalEntities: 5,
        projectDays: 2
      }
      
      const todos = generateTodoItems(baseReadiness, assignmentProgress)
      
      const urgentTodo = todos.find(t => t.id === 'urgent-assignments')
      expect(urgentTodo?.description).toBe('1 assignment needed for tomorrow')
    })

    it('should handle tomorrow vs future day descriptions', () => {
      const assignmentProgress: AssignmentProgress = {
        totalAssignments: 10,
        completedAssignments: 5,
        urgentIssues: 0,
        upcomingDeadlines: [
          { date: '2024-01-15', missingAssignments: 2, daysFromNow: 1 }
        ],
        assignmentRate: 50,
        totalEntities: 5,
        projectDays: 2
      }
      
      const todos = generateTodoItems(baseReadiness, assignmentProgress)
      
      const upcomingTodo = todos.find(t => t.id === 'upcoming-assignments')
      expect(upcomingTodo?.description).toBe('2 assignments needed tomorrow')
    })
  })
})