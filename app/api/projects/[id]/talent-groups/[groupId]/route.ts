import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { talentGroupSchema } from '@/lib/types'

// GET /api/projects/[id]/talent-groups/[groupId] - Get specific talent group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
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

    const { id: projectId, groupId } = await params

    // Fetch the specific talent group
    const { data: group, error: groupError } = await supabase
      .from('talent_groups')
      .select(`
        id,
        project_id,
        group_name,
        members,
        scheduled_dates,
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
      .eq('id', groupId)
      .eq('project_id', projectId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Talent group not found or access denied', code: 'GROUP_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Transform the response to match the TalentGroup interface (camelCase)
    const transformedGroup = {
      id: group.id,
      projectId: group.project_id,
      groupName: group.group_name,
      members: group.members,
      scheduledDates: group.scheduled_dates,
      assignedEscortId: group.assigned_escort_id,
      pointOfContactName: group.point_of_contact_name,
      pointOfContactPhone: group.point_of_contact_phone,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      assignedEscort: group.assigned_escort
    }

    return NextResponse.json({ data: transformedGroup })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/talent-groups/[groupId]:', error)
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

// PUT /api/projects/[id]/talent-groups/[groupId] - Update talent group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
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

    const { id: projectId, groupId } = await params

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

    // Update the talent group
    const { data: updatedGroup, error: updateError } = await supabase
      .from('talent_groups')
      .update({
        group_name: groupName,
        members: members,
        scheduled_dates: scheduledDates.length > 0 ? scheduledDates.map(date => {
          // Ensure we maintain the date as-is without timezone conversion
          if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return date // Already in YYYY-MM-DD format
          }
          // Convert Date object to local date string
          const dateObj = new Date(date)
          return dateObj.toISOString().split('T')[0]
        }) : [],
        point_of_contact_name: pointOfContactName || null,
        point_of_contact_phone: pointOfContactPhone || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .eq('project_id', projectId)
      .select(`
        id,
        project_id,
        group_name,
        members,
        scheduled_dates,
        assigned_escort_id,
        point_of_contact_name,
        point_of_contact_phone,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating talent group:', updateError)
      
      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A group with this name already exists in this project', code: 'DUPLICATE_GROUP_NAME' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to update talent group', code: 'UPDATE_ERROR', details: updateError.message },
        { status: 500 }
      )
    }

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Talent group not found or access denied', code: 'GROUP_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Also update the corresponding talent_project_assignments entry
    const { error: assignmentUpdateError } = await supabase
      .from('talent_project_assignments')
      .update({
        scheduled_dates: scheduledDates.length > 0 ? scheduledDates.map(date => {
          // Ensure we maintain the date as-is without timezone conversion
          if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return date // Already in YYYY-MM-DD format
          }
          // Convert Date object to local date string
          const dateObj = new Date(date)
          return dateObj.toISOString().split('T')[0]
        }) : []
      })
      .eq('talent_id', groupId)
      .eq('project_id', projectId)

    if (assignmentUpdateError) {
      console.error('Error updating talent assignment for group:', assignmentUpdateError)
      // Don't fail the whole operation, but log the error
    }

    // Transform the response to match the TalentGroup interface (camelCase)
    const transformedGroup = {
      id: updatedGroup.id,
      projectId: updatedGroup.project_id,
      groupName: updatedGroup.group_name,
      members: updatedGroup.members,
      scheduledDates: updatedGroup.scheduled_dates,
      assignedEscortId: updatedGroup.assigned_escort_id,
      pointOfContactName: updatedGroup.point_of_contact_name,
      pointOfContactPhone: updatedGroup.point_of_contact_phone,
      createdAt: updatedGroup.created_at,
      updatedAt: updatedGroup.updated_at
    }

    return NextResponse.json({
      data: transformedGroup,
      message: 'Talent group updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/talent-groups/[groupId]:', error)
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

// DELETE /api/projects/[id]/talent-groups/[groupId] - Delete talent group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
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

    const { id: projectId, groupId } = await params

    // Delete the corresponding talent_project_assignments entry first
    const { error: assignmentDeleteError } = await supabase
      .from('talent_project_assignments')
      .delete()
      .eq('talent_id', groupId)
      .eq('project_id', projectId)

    if (assignmentDeleteError) {
      console.error('Error deleting talent assignment for group:', assignmentDeleteError)
      // Continue with group deletion even if assignment deletion fails
    }

    // Delete the talent group
    const { error: deleteError } = await supabase
      .from('talent_groups')
      .delete()
      .eq('id', groupId)
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('Error deleting talent group:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete talent group', code: 'DELETE_ERROR', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Talent group deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/talent-groups/[groupId]:', error)
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