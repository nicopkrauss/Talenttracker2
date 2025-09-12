import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Schema for schedule-only updates
const scheduleUpdateSchema = z.object({
  scheduledDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"))
    .optional()
    .default([])
})

// PUT /api/projects/[id]/talent-groups/[groupId]/schedule - Update talent group schedule only
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
    const validationResult = scheduleUpdateSchema.safeParse(body)
    
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

    const { scheduledDates = [] } = validationResult.data

    // Process scheduled dates with timezone handling
    const processedDates = scheduledDates.length > 0 ? scheduledDates.map(date => {
      // Ensure we maintain the date as-is without timezone conversion
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date // Already in YYYY-MM-DD format
      }
      // Convert Date object to local date string
      const dateObj = new Date(date)
      return dateObj.toISOString().split('T')[0]
    }) : []

    // Update only the scheduled_dates field of the talent group
    const { data: updatedGroup, error: updateError } = await supabase
      .from('talent_groups')
      .update({
        scheduled_dates: processedDates,
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
      console.error('Error updating talent group schedule:', updateError)
      return NextResponse.json(
        { error: 'Failed to update talent group schedule', code: 'UPDATE_ERROR', details: updateError.message },
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
        scheduled_dates: processedDates
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
      message: 'Talent group schedule updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/talent-groups/[groupId]/schedule:', error)
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