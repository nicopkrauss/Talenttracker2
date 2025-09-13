import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const scheduleUpdateSchema = z.object({
  scheduledDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"))
})

// PUT /api/projects/[id]/talent-roster/[talentId]/schedule - Update talent schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; talentId: string }> }
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

    // Check if user has permission to manage talent scheduling (Admin, In-House, Supervisor, Coordinator)
    const allowedRoles = ['admin', 'in_house', 'supervisor', 'coordinator']
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update talent schedule', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Await params
    const { id: projectId, talentId } = await params

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status, start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify talent assignment exists
    const { data: talentAssignment, error: assignmentError } = await supabase
      .from('talent_project_assignments')
      .select('id, talent_id')
      .eq('talent_id', talentId)
      .eq('project_id', projectId)
      .single()

    if (assignmentError || !talentAssignment) {
      return NextResponse.json(
        { error: 'Talent assignment not found', code: 'ASSIGNMENT_NOT_FOUND' },
        { status: 404 }
      )
    }

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

    const { scheduledDates } = validationResult.data

    // Validate that scheduled dates fall within project date range
    const projectStartDate = new Date(project.start_date)
    const projectEndDate = new Date(project.end_date)
    
    for (const dateStr of scheduledDates) {
      const date = new Date(dateStr)
      if (date < projectStartDate || date > projectEndDate) {
        return NextResponse.json(
          { 
            error: 'Scheduled dates must be within project date range',
            code: 'INVALID_DATE_RANGE',
            details: `Date ${dateStr} is outside project range (${project.start_date} to ${project.end_date})`
          },
          { status: 400 }
        )
      }
    }

    // Update scheduling using the unified daily assignment system
    try {
      // First, remove all existing scheduling entries for this talent
      const { error: deleteError } = await supabase
        .from('talent_daily_assignments')
        .delete()
        .eq('project_id', projectId)
        .eq('talent_id', talentId)

      if (deleteError) {
        throw new Error(`Failed to clear existing schedule: ${deleteError.message}`)
      }

      // Insert new scheduling entries (with escort_id = null for scheduling without assignment)
      if (scheduledDates.length > 0) {
        const schedulingRecords = scheduledDates.map(date => ({
          talent_id: talentId,
          project_id: projectId,
          assignment_date: date,
          escort_id: null // Scheduled but not assigned
        }))

        const { error: insertError } = await supabase
          .from('talent_daily_assignments')
          .insert(schedulingRecords)

        if (insertError) {
          throw new Error(`Failed to create schedule entries: ${insertError.message}`)
        }
      }

      // Update the talent assignment timestamp
      const { data: updatedAssignment, error: updateError } = await supabase
        .from('talent_project_assignments')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', talentAssignment.id)
        .select('id, talent_id, updated_at')
        .single()

      if (updateError) {
        throw new Error(`Failed to update assignment timestamp: ${updateError.message}`)
      }
    } catch (error: any) {
      console.error('Error updating talent schedule:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update talent schedule',
          code: 'UPDATE_ERROR',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Log the schedule update for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_schedule_updated',
        user_id: user.id,
        details: `Updated schedule for talent ${talentId} in project ${project.name}: ${scheduledDates.join(', ')}`
      })

    return NextResponse.json({
      data: {
        talentId: talentId,
        projectId: projectId,
        scheduledDates: scheduledDates,
        updatedAt: new Date().toISOString()
      },
      message: 'Talent schedule updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/talent-roster/[talentId]/schedule:', error)
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