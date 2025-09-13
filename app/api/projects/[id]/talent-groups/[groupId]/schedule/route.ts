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

    // Update scheduling using the unified daily assignment system
    // First, remove all existing scheduling entries for this group
    const { error: deleteError } = await supabase
      .from('group_daily_assignments')
      .delete()
      .eq('project_id', projectId)
      .eq('group_id', groupId)

    if (deleteError) {
      console.error('Error clearing existing schedule:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing schedule', code: 'DELETE_ERROR', details: deleteError.message },
        { status: 500 }
      )
    }

    // Insert new scheduling entries (with escort_id = null for scheduling without assignment)
    if (processedDates.length > 0) {
      const schedulingRecords = processedDates.map(date => ({
        group_id: groupId,
        project_id: projectId,
        assignment_date: date,
        escort_id: null // Scheduled but not assigned
      }))

      const { error: insertError } = await supabase
        .from('group_daily_assignments')
        .insert(schedulingRecords)

      if (insertError) {
        console.error('Error creating schedule entries:', insertError)
        return NextResponse.json(
          { error: 'Failed to create schedule entries', code: 'INSERT_ERROR', details: insertError.message },
          { status: 500 }
        )
      }
    }

    // Update the talent group timestamp and get updated data
    const { data: updatedGroup, error: updateError } = await supabase
      .from('talent_groups')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .eq('project_id', projectId)
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

    if (updateError) {
      console.error('Error updating group timestamp:', updateError)
      return NextResponse.json(
        { error: 'Failed to update group timestamp', code: 'UPDATE_ERROR', details: updateError.message },
        { status: 500 }
      )
    }

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Talent group not found or access denied', code: 'GROUP_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Transform the response to match the TalentGroup interface (camelCase)
    const transformedGroup = {
      id: updatedGroup.id,
      projectId: updatedGroup.project_id,
      groupName: updatedGroup.group_name,
      members: updatedGroup.members,
      scheduledDates: processedDates,
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