import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Import cache invalidation function
function invalidateReadinessCache(projectId: string, userId: string): void {
  // This would connect to the same cache system as the main route
  // For now, we'll implement a simple cache key pattern
  const cacheKey = `readiness:${projectId}:${userId}`
  // In a production system, this would connect to Redis or similar
  console.log(`Invalidating cache for key: ${cacheKey}`)
}
import { hasAdminAccess } from '@/lib/role-utils'

// Import helper functions from the main readiness route
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

  return todoItems
}

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

// POST /api/projects/[id]/readiness/finalize - Finalize a project area
export async function POST(
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

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user has permission to finalize areas (Admin or In-House only)
    if (!hasAdminAccess(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to finalize project areas', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
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

    // Parse request body
    const body = await request.json()
    const { area } = body

    // Validate area parameter
    const validAreas = ['locations', 'roles', 'team', 'talent']
    if (!area || !validAreas.includes(area)) {
      return NextResponse.json(
        { 
          error: 'Invalid area. Must be one of: locations, roles, team, talent',
          code: 'INVALID_AREA'
        },
        { status: 400 }
      )
    }

    // Check if project readiness record exists
    const { data: readiness, error: readinessError } = await supabase
      .from('project_readiness')
      .select('project_id, locations_status, roles_status, team_status, talent_status')
      .eq('project_id', projectId)
      .single()

    if (readinessError) {
      if (readinessError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project readiness data not found', code: 'READINESS_NOT_FOUND' },
          { status: 404 }
        )
      }
      console.error('Error fetching project readiness:', readinessError)
      return NextResponse.json(
        { error: 'Failed to fetch project readiness', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Validate that the area can be finalized
    const canFinalize = validateFinalization(area, readiness)
    if (!canFinalize.valid) {
      return NextResponse.json(
        { 
          error: canFinalize.message,
          code: 'CANNOT_FINALIZE'
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const now = new Date().toISOString()
    const updateData: any = {
      updated_at: now,
      last_updated: now
    }

    // Set finalization fields based on area
    switch (area) {
      case 'locations':
        updateData.locations_finalized = true
        updateData.locations_finalized_at = now
        updateData.locations_finalized_by = user.id
        break
      case 'roles':
        updateData.roles_finalized = true
        updateData.roles_finalized_at = now
        updateData.roles_finalized_by = user.id
        break
      case 'team':
        updateData.team_finalized = true
        updateData.team_finalized_at = now
        updateData.team_finalized_by = user.id
        break
      case 'talent':
        updateData.talent_finalized = true
        updateData.talent_finalized_at = now
        updateData.talent_finalized_by = user.id
        break
    }

    // Update the readiness record
    const { data: updatedReadiness, error: updateError } = await supabase
      .from('project_readiness')
      .update(updateData)
      .eq('project_id', projectId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating project readiness:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to finalize project area',
          code: 'UPDATE_ERROR',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    // Manually recalculate readiness metrics since database function may not exist
    try {
      await recalculateReadinessMetrics(supabase, projectId)
    } catch (calcError) {
      console.warn('Warning: Failed to recalculate readiness metrics:', calcError)
      // Don't fail the request for this
    }

    // Fetch the updated readiness data after recalculation
    const { data: finalReadiness } = await supabase
      .from('project_readiness')
      .select('*')
      .eq('project_id', projectId)
      .single()

    // Invalidate cache after successful finalization
    invalidateReadinessCache(projectId, user.id)

    // Generate updated todo items and feature availability for response
    const todoItems = generateTodoItems(finalReadiness || updatedReadiness)
    const featureAvailability = calculateFeatureAvailability(finalReadiness || updatedReadiness)

    return NextResponse.json({
      data: {
        ...updatedReadiness,
        todoItems,
        featureAvailability
      },
      message: `Project ${area} finalized successfully`
    })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/readiness/finalize:', error)
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

// Helper function to validate if an area can be finalized
function validateFinalization(area: string, readiness: any) {
  switch (area) {
    case 'locations':
      if (readiness.locations_status === 'default-only') {
        return {
          valid: false,
          message: 'Cannot finalize locations with default setup only. Add custom locations first.'
        }
      }
      break
    case 'roles':
      if (readiness.roles_status === 'default-only') {
        return {
          valid: false,
          message: 'Cannot finalize roles with default setup only. Configure custom roles first.'
        }
      }
      break
    case 'team':
      if (readiness.team_status === 'none') {
        return {
          valid: false,
          message: 'Cannot finalize team with no staff assigned. Assign team members first.'
        }
      }
      break
    case 'talent':
      if (readiness.talent_status === 'none') {
        return {
          valid: false,
          message: 'Cannot finalize talent with no talent assigned. Add talent to roster first.'
        }
      }
      break
  }

  return { valid: true }
}

// DELETE /api/projects/[id]/readiness/finalize - Unfinalize a project area (admin only)
export async function DELETE(
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

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user has admin permissions (only admins can unfinalize)
    if (userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can unfinalize project areas', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
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

    // Parse request body
    const body = await request.json()
    const { area } = body

    // Validate area parameter
    const validAreas = ['locations', 'roles', 'team', 'talent']
    if (!area || !validAreas.includes(area)) {
      return NextResponse.json(
        { 
          error: 'Invalid area. Must be one of: locations, roles, team, talent',
          code: 'INVALID_AREA'
        },
        { status: 400 }
      )
    }

    // Prepare update data to unfinalize
    const updateData: any = {
      updated_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    }

    // Set unfinalization fields based on area
    switch (area) {
      case 'locations':
        updateData.locations_finalized = false
        updateData.locations_finalized_at = null
        updateData.locations_finalized_by = null
        break
      case 'roles':
        updateData.roles_finalized = false
        updateData.roles_finalized_at = null
        updateData.roles_finalized_by = null
        break
      case 'team':
        updateData.team_finalized = false
        updateData.team_finalized_at = null
        updateData.team_finalized_by = null
        break
      case 'talent':
        updateData.talent_finalized = false
        updateData.talent_finalized_at = null
        updateData.talent_finalized_by = null
        break
    }

    // Update the readiness record
    const { data: updatedReadiness, error: updateError } = await supabase
      .from('project_readiness')
      .update(updateData)
      .eq('project_id', projectId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error unfinalizing project area:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to unfinalize project area',
          code: 'UPDATE_ERROR',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedReadiness,
      message: `Project ${area} unfinalized successfully`
    })

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/readiness/finalize:', error)
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