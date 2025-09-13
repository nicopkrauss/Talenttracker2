import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { talentGroupSchema } from '@/lib/types'

// GET /api/projects/[id]/talent-groups - Fetch project talent groups
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

    const { id: projectId } = await params

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Fetch talent groups for this project
    const { data: groups, error: groupsError } = await supabase
      .from('talent_groups')
      .select(`
        id,
        project_id,
        group_name,
        members,
        assigned_escort_id,
        point_of_contact_name,
        point_of_contact_phone,
        created_at,
        updated_at,
        assigned_escort:profiles!talent_groups_assigned_escort_id_fkey(
          id,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (groupsError) {
      console.error('Error fetching talent groups:', groupsError)
      return NextResponse.json(
        { error: 'Failed to fetch talent groups', code: 'FETCH_ERROR', details: groupsError.message },
        { status: 500 }
      )
    }

    // Get scheduled dates for all groups from the unified daily assignments table
    const groupIds = groups?.map(g => g.id) || []
    let groupScheduledDates: Record<string, string[]> = {}
    
    if (groupIds.length > 0) {
      const { data: dailyAssignments } = await supabase
        .from('group_daily_assignments')
        .select('group_id, assignment_date')
        .eq('project_id', projectId)
        .in('group_id', groupIds)

      if (dailyAssignments) {
        groupScheduledDates = dailyAssignments.reduce((acc, da) => {
          if (!acc[da.group_id]) {
            acc[da.group_id] = []
          }
          acc[da.group_id].push(da.assignment_date)
          return acc
        }, {} as Record<string, string[]>)

        // Sort dates for each group
        Object.keys(groupScheduledDates).forEach(groupId => {
          groupScheduledDates[groupId].sort()
        })
      }
    }

    // Transform the response to match the TalentGroup interface (camelCase)
    const transformedGroups = (groups || []).map(group => ({
      id: group.id,
      projectId: group.project_id,
      groupName: group.group_name,
      members: group.members,
      scheduledDates: groupScheduledDates[group.id] || [],
      assignedEscortId: group.assigned_escort_id,
      pointOfContactName: group.point_of_contact_name,
      pointOfContactPhone: group.point_of_contact_phone,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      assignedEscort: group.assigned_escort
    }))

    return NextResponse.json({
      data: transformedGroups,
      count: transformedGroups.length
    })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/talent-groups:', error)
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

// POST /api/projects/[id]/talent-groups - Create new talent group
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

    const { id: projectId } = await params

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = talentGroupSchema.safeParse(body)
    
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

    const { groupName, members, scheduledDates = [], pointOfContactName, pointOfContactPhone } = validationResult.data

    // Get the next display_order value by checking both talent assignments and groups
    const [talentMaxResult, groupMaxResult] = await Promise.all([
      supabase
        .from('talent_project_assignments')
        .select('display_order')
        .eq('project_id', projectId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      supabase
        .from('talent_groups')
        .select('display_order')
        .eq('project_id', projectId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])

    const maxTalentOrder = talentMaxResult.data?.display_order || 0
    const maxGroupOrder = groupMaxResult.data?.display_order || 0
    const nextDisplayOrder = Math.max(maxTalentOrder, maxGroupOrder) + 1

    // Create the talent group (without scheduled_dates column)
    const { data: newGroup, error: createError } = await supabase
      .from('talent_groups')
      .insert({
        project_id: projectId,
        group_name: groupName,
        members: members,
        point_of_contact_name: pointOfContactName || null,
        point_of_contact_phone: pointOfContactPhone || null,
        display_order: nextDisplayOrder
      })
      .select(`
        id,
        project_id,
        group_name,
        members,
        assigned_escort_id,
        point_of_contact_name,
        point_of_contact_phone,
        created_at,
        updated_at
      `)
      .single()

    if (createError) {
      console.error('Error creating talent group:', createError)
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A group with this name already exists in this project', code: 'DUPLICATE_GROUP_NAME' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create talent group', code: 'CREATE_ERROR', details: createError.message },
        { status: 500 }
      )
    }

    // Create scheduled dates in the unified daily assignments system
    if (scheduledDates && scheduledDates.length > 0) {
      const normalizedDates = scheduledDates.map(date => {
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return date // Already in YYYY-MM-DD format
        }
        // Convert Date object to local date string
        const dateObj = new Date(date)
        return dateObj.toISOString().split('T')[0]
      })

      const assignmentRecords = normalizedDates.map(date => ({
        group_id: newGroup.id,
        project_id: projectId,
        assignment_date: date,
        escort_id: null // No escort assigned initially
      }))

      const { error: assignmentError } = await supabase
        .from('group_daily_assignments')
        .insert(assignmentRecords)

      if (assignmentError) {
        console.error('Error creating group daily assignments:', assignmentError)
        // Don't fail the whole operation, but log the error
      }
    }

    // Also create a corresponding talent_project_assignments entry for the group
    // This allows the group to appear in the talent roster and be scheduled
    const { error: talentAssignmentError } = await supabase
      .from('talent_project_assignments')
      .insert({
        talent_id: newGroup.id, // Use group ID as talent ID for groups
        project_id: projectId,
        assigned_by: user.id,
        status: 'active',
        display_order: nextDisplayOrder
      })

    if (talentAssignmentError) {
      console.error('Error creating talent assignment for group:', talentAssignmentError)
      // Don't fail the whole operation, but log the error
      // The group is still created successfully
    }

    // Get the final scheduled dates from the unified system
    const { data: dailyAssignments } = await supabase
      .from('group_daily_assignments')
      .select('assignment_date')
      .eq('group_id', newGroup.id)
      .eq('project_id', projectId)

    const finalScheduledDates = dailyAssignments?.map(da => da.assignment_date).sort() || []

    // Transform the response to match the TalentGroup interface (camelCase)
    const transformedGroup = {
      id: newGroup.id,
      projectId: newGroup.project_id,
      groupName: newGroup.group_name,
      members: newGroup.members,
      scheduledDates: finalScheduledDates,
      assignedEscortId: newGroup.assigned_escort_id,
      pointOfContactName: newGroup.point_of_contact_name,
      pointOfContactPhone: newGroup.point_of_contact_phone,
      createdAt: newGroup.created_at,
      updatedAt: newGroup.updated_at
    }

    return NextResponse.json({
      data: transformedGroup,
      message: 'Talent group created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/talent-groups:', error)
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