import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { talentProfileSchema } from '@/lib/types'

// GET /api/projects/[id]/talent-roster - Fetch project talent roster
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

    // Await params
    const { id: projectId } = await params

    // Check if user has access to this project
    const { data: projectAccess, error: accessError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', projectId)
      .single()

    if (accessError || !projectAccess) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse query parameters for filtering and sorting
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const sortBy = searchParams.get('sort_by') || 'first_name'
    const sortOrder = searchParams.get('sort_order') || 'asc'

    // Fetch both talent assignments and groups in parallel
    const [talentResult, groupsResult] = await Promise.all([
      // Fetch talent assignments
      supabase
        .from('talent_project_assignments')
        .select(`
          id,
          status,
          assigned_at,
          display_order,
          talent:talent_id (
            id,
            first_name,
            last_name,
            rep_name,
            rep_email,
            rep_phone,
            notes,
            created_at,
            updated_at
          )
        `)
        .eq('project_id', projectId)
        .eq('status', status !== 'all' ? status : 'active')
        .order('display_order', { ascending: false }),
      
      // Fetch talent groups with display_order
      supabase
        .from('talent_groups')
        .select(`
          id,
          group_name,
          members,
          assigned_escort_id,
          display_order,
          created_at,
          updated_at,
          assigned_escort:assigned_escort_id (
            id,
            full_name
          )
        `)
        .eq('project_id', projectId)
        .order('display_order', { ascending: false, nullsFirst: false })
    ])

    if (talentResult.error) {
      console.error('Error fetching talent roster:', talentResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch talent roster', code: 'FETCH_ERROR', details: talentResult.error.message },
        { status: 500 }
      )
    }

    if (groupsResult.error) {
      console.error('Error fetching talent groups:', groupsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch talent groups', code: 'FETCH_ERROR', details: groupsResult.error.message },
        { status: 500 }
      )
    }

    // Fetch scheduled dates from unified daily assignment tables
    const talentIds = talentResult.data?.map(t => t.talent.id) || []
    const groupIds = groupsResult.data?.map(g => g.id) || []
    
    // Get talent scheduled dates
    const talentScheduledDates: Record<string, string[]> = {}
    if (talentIds.length > 0) {
      const { data: talentDailyAssignments } = await supabase
        .from('talent_daily_assignments')
        .select('talent_id, assignment_date')
        .eq('project_id', projectId)
        .in('talent_id', talentIds)
      
      if (talentDailyAssignments) {
        for (const assignment of talentDailyAssignments) {
          if (!talentScheduledDates[assignment.talent_id]) {
            talentScheduledDates[assignment.talent_id] = []
          }
          talentScheduledDates[assignment.talent_id].push(assignment.assignment_date)
        }
      }
    }
    
    // Get group scheduled dates
    const groupScheduledDates: Record<string, string[]> = {}
    if (groupIds.length > 0) {
      const { data: groupDailyAssignments } = await supabase
        .from('group_daily_assignments')
        .select('group_id, assignment_date')
        .eq('project_id', projectId)
        .in('group_id', groupIds)
      
      if (groupDailyAssignments) {
        for (const assignment of groupDailyAssignments) {
          if (!groupScheduledDates[assignment.group_id]) {
            groupScheduledDates[assignment.group_id] = []
          }
          groupScheduledDates[assignment.group_id].push(assignment.assignment_date)
        }
      }
    }

    // Transform talent assignments
    let transformedTalent = talentResult.data?.map(assignment => ({
      id: assignment.talent.id,
      first_name: assignment.talent.first_name,
      last_name: assignment.talent.last_name,
      rep_name: assignment.talent.rep_name,
      rep_email: assignment.talent.rep_email,
      rep_phone: assignment.talent.rep_phone,
      notes: assignment.talent.notes,
      created_at: assignment.talent.created_at,
      updated_at: assignment.talent.updated_at,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        assigned_at: assignment.assigned_at,
        scheduled_dates: talentScheduledDates[assignment.talent.id] || [],
        display_order: assignment.display_order || 0
      }
    })) || []

    // Transform talent groups
    let transformedGroups = groupsResult.data?.map(group => ({
      id: group.id,
      groupName: group.group_name,
      group_name: group.group_name, // backward compatibility
      members: group.members || [],
      scheduledDates: groupScheduledDates[group.id] || [],
      scheduled_dates: groupScheduledDates[group.id] || [], // backward compatibility
      assignedEscortId: group.assigned_escort_id,
      assigned_escort_id: group.assigned_escort_id, // backward compatibility
      displayOrder: group.display_order || 0,
      display_order: group.display_order || 0, // backward compatibility
      createdAt: group.created_at,
      created_at: group.created_at, // backward compatibility
      updatedAt: group.updated_at,
      updated_at: group.updated_at, // backward compatibility
      assignedEscort: group.assigned_escort
    })) || []

    // Apply search filtering if provided
    if (search) {
      const searchLower = search.toLowerCase()
      
      // Filter talent by name
      transformedTalent = transformedTalent.filter(person => {
        const fullName = `${person.first_name} ${person.last_name}`.toLowerCase()
        return fullName.includes(searchLower)
      })
      
      // Filter groups by name
      transformedGroups = transformedGroups.filter(group => {
        return group.groupName.toLowerCase().includes(searchLower)
      })
    }

    return NextResponse.json({
      data: {
        talent: transformedTalent,
        groups: transformedGroups
      },
      project: {
        id: projectAccess.id,
        name: projectAccess.name,
        status: projectAccess.status
      },
      filters: {
        search,
        status,
        sort_by: sortBy,
        sort_order: sortOrder
      }
    })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/talent-roster:', error)
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

// POST /api/projects/[id]/talent-roster - Add talent to project (manual entry)
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

    // Check if user has permission to manage talent (Admin, In-House, Supervisor, Coordinator)
    const allowedRoles = ['admin', 'in_house', 'supervisor', 'coordinator']
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add talent', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Await params
    const { id: projectId } = await params

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = talentProfileSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const talentData = validationResult.data

    // Start a transaction to create talent and assignment
    const { data: newTalent, error: createTalentError } = await supabase
      .from('talent')
      .insert({
        first_name: talentData.first_name,
        last_name: talentData.last_name,
        rep_name: talentData.rep_name,
        rep_email: talentData.rep_email,
        rep_phone: talentData.rep_phone,
        notes: talentData.notes || null,
        contact_info: {} // Initialize as empty object
      })
      .select('id, first_name, last_name, rep_name, rep_email, rep_phone, notes, created_at, updated_at')
      .single()

    if (createTalentError) {
      console.error('Error creating talent:', createTalentError)
      return NextResponse.json(
        { 
          error: 'Failed to create talent',
          code: 'CREATE_TALENT_ERROR',
          details: createTalentError.message
        },
        { status: 500 }
      )
    }

    // Get the next display_order value
    const { data: maxOrderResult } = await supabase
      .from('talent_project_assignments')
      .select('display_order')
      .eq('project_id', projectId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextDisplayOrder = (maxOrderResult?.display_order || 0) + 1

    // Create project assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('talent_project_assignments')
      .insert({
        talent_id: newTalent.id,
        project_id: projectId,
        assigned_by: user.id,
        status: 'active',
        display_order: nextDisplayOrder
      })
      .select('id, status, assigned_at, display_order')
      .single()

    if (assignmentError) {
      console.error('Error creating talent assignment:', assignmentError)
      // Try to clean up the talent record if assignment failed
      await supabase.from('talent').delete().eq('id', newTalent.id)
      
      return NextResponse.json(
        { 
          error: 'Failed to assign talent to project',
          code: 'CREATE_ASSIGNMENT_ERROR',
          details: assignmentError.message
        },
        { status: 500 }
      )
    }

    // Log the creation for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_added_to_project',
        user_id: user.id,
        details: `Added talent ${talentData.first_name} ${talentData.last_name} to project ${project.name}`
      })

    return NextResponse.json({
      data: {
        ...newTalent,
        assignment
      },
      message: 'Talent added to project successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/talent-roster:', error)
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