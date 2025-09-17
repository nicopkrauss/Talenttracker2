import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side cache for readiness data (30-second TTL)
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

const serverCache = new Map<string, CacheEntry>()
const CACHE_TTL = 30 * 1000 // 30 seconds

function getCachedData(key: string): any | null {
  const entry = serverCache.get(key)
  if (!entry) return null
  
  const now = Date.now()
  if ((now - entry.timestamp) > entry.ttl) {
    serverCache.delete(key)
    return null
  }
  
  return entry.data
}

function setCachedData(key: string, data: any, ttl = CACHE_TTL): void {
  serverCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

function invalidateCache(key: string): void {
  serverCache.delete(key)
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of serverCache) {
    if ((now - entry.timestamp) > entry.ttl) {
      serverCache.delete(key)
    }
  }
}, 60 * 1000) // Cleanup every minute

// GET /api/projects/[id]/readiness - Get project readiness data with todo items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Await params and validate project ID format
    const { id } = await params
    const projectId = id
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      )
    }

    // Check cache first (unless force refresh is requested)
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'
    const cacheKey = `readiness:${projectId}:${user.id}`
    
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        return NextResponse.json({
          data: cachedData,
          cached: true,
          timestamp: Date.now()
        })
      }
    }

    // Get project readiness data
    let { data: readiness, error: readinessError } = await supabase
      .from('project_readiness')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (readinessError) {
      if (readinessError.code === 'PGRST116') {
        // Create readiness record if it doesn't exist
        const { data: newReadiness, error: createError } = await supabase
          .from('project_readiness')
          .insert({ project_id: projectId })
          .select('*')
          .single()

        if (createError) {
          console.error('Error creating project readiness:', createError)
          return NextResponse.json(
            { error: 'Failed to create project readiness', code: 'CREATE_ERROR' },
            { status: 500 }
          )
        }

        readiness = newReadiness
      } else {
        console.error('Error fetching project readiness:', readinessError)
        return NextResponse.json(
          { error: 'Failed to fetch project readiness', code: 'FETCH_ERROR' },
          { status: 500 }
        )
      }
    }

    // Ensure readiness metrics are up to date
    try {
      await recalculateReadinessMetrics(supabase, projectId)
      
      // Refetch updated data
      const { data: updatedReadiness } = await supabase
        .from('project_readiness')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (updatedReadiness) {
        readiness = updatedReadiness
      }
    } catch (calcError) {
      console.warn('Warning: Failed to recalculate readiness metrics:', calcError)
      // Continue with existing data
    }

    // Generate assignment progress summary
    const assignmentProgress = await generateAssignmentProgress(supabase, projectId)
    
    // Generate todo items based on current status and assignment progress
    const todoItems = generateTodoItems(readiness, assignmentProgress)
    
    // Calculate feature availability
    const featureAvailability = calculateFeatureAvailability(readiness)

    const responseData = {
      ...readiness,
      todoItems,
      featureAvailability,
      assignmentProgress
    }

    // Cache the response data
    setCachedData(cacheKey, responseData)

    return NextResponse.json({
      data: responseData,
      cached: false,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/readiness:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to generate todo items based on readiness status
function generateTodoItems(readiness: any, assignmentProgress?: any) {
  const todoItems = []

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

  // Assignment completion suggestions
  if (assignmentProgress && assignmentProgress.assignmentRate < 100 && assignmentProgress.assignmentRate > 0) {
    todoItems.push({
      id: 'complete-assignments',
      area: 'assignments',
      priority: 'optional',
      title: 'Complete remaining assignments',
      description: `${assignmentProgress.assignmentRate}% of assignments completed`,
      actionText: 'Go to Assignments',
      actionRoute: '/assignments'
    })
  }

  return todoItems
}

// Helper function to calculate feature availability
function calculateFeatureAvailability(readiness: any) {
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

// Helper function to generate assignment progress summary
async function generateAssignmentProgress(supabase: any, projectId: string) {
  try {
    // Get project date range
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return {
        totalAssignments: 0,
        completedAssignments: 0,
        urgentIssues: 0,
        upcomingDeadlines: [],
        error: 'Project not found'
      }
    }

    // Get total talent and groups that need assignments
    const { data: talentCount } = await supabase
      .from('talent_project_assignments')
      .select('talent_id', { count: 'exact' })
      .eq('project_id', projectId)

    const { data: groupCount } = await supabase
      .from('talent_groups')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId)

    const totalEntities = (talentCount?.length || 0) + (groupCount?.length || 0)

    if (totalEntities === 0) {
      return {
        totalAssignments: 0,
        completedAssignments: 0,
        urgentIssues: 0,
        upcomingDeadlines: [],
        message: 'No talent or groups assigned to project'
      }
    }

    // Calculate project duration in days
    const startDate = new Date(project.start_date)
    const endDate = new Date(project.end_date)
    const projectDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const totalPossibleAssignments = totalEntities * projectDays

    // Get current assignment counts from daily assignment tables
    const { data: talentAssignments } = await supabase
      .from('talent_daily_assignments')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId)
      .not('escort_id', 'is', null) // Only count assignments with escorts

    const { data: groupAssignments } = await supabase
      .from('group_daily_assignments')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId)
      .not('escort_id', 'is', null) // Only count assignments with escorts

    const completedAssignments = (talentAssignments?.length || 0) + (groupAssignments?.length || 0)

    // Calculate urgent issues
    let urgentIssues = 0
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Check for missing assignments for tomorrow (if within project range)
    if (tomorrow >= startDate && tomorrow <= endDate) {
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      // Count talent without escort assignments for tomorrow
      const { data: unassignedTalent } = await supabase
        .from('talent_project_assignments')
        .select(`
          talent_id,
          talent_daily_assignments!left(id)
        `)
        .eq('project_id', projectId)
        .eq('talent_daily_assignments.assignment_date', tomorrowStr)
        .is('talent_daily_assignments.escort_id', null)

      // Count groups without escort assignments for tomorrow
      const { data: unassignedGroups } = await supabase
        .from('talent_groups')
        .select(`
          id,
          group_daily_assignments!left(id)
        `)
        .eq('project_id', projectId)
        .eq('group_daily_assignments.assignment_date', tomorrowStr)
        .is('group_daily_assignments.escort_id', null)

      urgentIssues = (unassignedTalent?.length || 0) + (unassignedGroups?.length || 0)
    }

    // Get upcoming deadlines (next 3 days without assignments)
    const upcomingDeadlines = []
    for (let i = 1; i <= 3; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() + i)
      
      if (checkDate >= startDate && checkDate <= endDate) {
        const checkDateStr = checkDate.toISOString().split('T')[0]
        
        // Count missing assignments for this date
        const { data: missingTalent } = await supabase
          .from('talent_project_assignments')
          .select('talent_id', { count: 'exact' })
          .eq('project_id', projectId)
          .not('talent_id', 'in', `(
            SELECT talent_id FROM talent_daily_assignments 
            WHERE project_id = '${projectId}' 
            AND assignment_date = '${checkDateStr}' 
            AND escort_id IS NOT NULL
          )`)

        const { data: missingGroups } = await supabase
          .from('talent_groups')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId)
          .not('id', 'in', `(
            SELECT group_id FROM group_daily_assignments 
            WHERE project_id = '${projectId}' 
            AND assignment_date = '${checkDateStr}' 
            AND escort_id IS NOT NULL
          )`)

        const missingCount = (missingTalent?.length || 0) + (missingGroups?.length || 0)
        
        if (missingCount > 0) {
          upcomingDeadlines.push({
            date: checkDateStr,
            missingAssignments: missingCount,
            daysFromNow: i
          })
        }
      }
    }

    return {
      totalAssignments: totalPossibleAssignments,
      completedAssignments,
      urgentIssues,
      upcomingDeadlines,
      assignmentRate: totalPossibleAssignments > 0 ? Math.round((completedAssignments / totalPossibleAssignments) * 100) : 0,
      totalEntities,
      projectDays
    }

  } catch (error) {
    console.error('Error calculating assignment progress:', error)
    return {
      totalAssignments: 0,
      completedAssignments: 0,
      urgentIssues: 0,
      upcomingDeadlines: [],
      error: 'Failed to calculate assignment progress'
    }
  }
}

// Helper function to manually recalculate readiness metrics
async function recalculateReadinessMetrics(supabase: any, projectId: string) {
  // Calculate location metrics
  const { data: customLocations } = await supabase
    .from('project_locations')
    .select('id', { count: 'exact' })
    .eq('project_id', projectId)
    .eq('is_default', false)

  // Calculate role metrics
  const { data: customRoles } = await supabase
    .from('project_role_templates')
    .select('id', { count: 'exact' })
    .eq('project_id', projectId)
    .eq('is_default', false)

  // Calculate team metrics
  const { data: teamAssignments } = await supabase
    .from('team_assignments')
    .select('role')
    .eq('project_id', projectId)

  const totalStaff = teamAssignments?.length || 0
  const supervisorCount = teamAssignments?.filter(ta => ta.role === 'supervisor').length || 0
  const escortCount = teamAssignments?.filter(ta => ta.role === 'talent_escort').length || 0
  const coordinatorCount = teamAssignments?.filter(ta => ta.role === 'coordinator').length || 0

  // Calculate talent metrics
  const { data: talentAssignments } = await supabase
    .from('talent_project_assignments')
    .select('talent_id', { count: 'exact' })
    .eq('project_id', projectId)

  const totalTalent = talentAssignments?.length || 0

  // Get current finalization status
  const { data: currentReadiness } = await supabase
    .from('project_readiness')
    .select('locations_finalized, roles_finalized, team_finalized, talent_finalized')
    .eq('project_id', projectId)
    .single()

  // Determine status levels
  const locationsStatus = currentReadiness?.locations_finalized 
    ? 'finalized' 
    : (customLocations?.length || 0) > 0 
    ? 'configured' 
    : 'default-only'

  const rolesStatus = currentReadiness?.roles_finalized 
    ? 'finalized' 
    : (customRoles?.length || 0) > 0 
    ? 'configured' 
    : 'default-only'

  const teamStatus = currentReadiness?.team_finalized 
    ? 'finalized' 
    : totalStaff > 0 
    ? 'partial' 
    : 'none'

  const talentStatus = currentReadiness?.talent_finalized 
    ? 'finalized' 
    : totalTalent > 0 
    ? 'partial' 
    : 'none'

  // Determine overall status
  let overallStatus = 'getting-started'
  if (totalStaff > 0 && totalTalent > 0 && escortCount > 0) {
    overallStatus = 'operational'
    if (locationsStatus === 'finalized' && rolesStatus === 'finalized' && 
        teamStatus === 'finalized' && talentStatus === 'finalized') {
      overallStatus = 'production-ready'
    }
  }

  // Update the readiness record
  const { error: updateError } = await supabase
    .from('project_readiness')
    .update({
      custom_location_count: customLocations?.length || 0,
      custom_role_count: customRoles?.length || 0,
      total_staff_assigned: totalStaff,
      supervisor_count: supervisorCount,
      escort_count: escortCount,
      coordinator_count: coordinatorCount,
      total_talent: totalTalent,
      locations_status: locationsStatus,
      roles_status: rolesStatus,
      team_status: teamStatus,
      talent_status: talentStatus,
      overall_status: overallStatus,
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('project_id', projectId)

  if (updateError) {
    throw updateError
  }
}