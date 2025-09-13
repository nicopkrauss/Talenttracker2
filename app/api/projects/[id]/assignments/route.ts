import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const assignmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  assignments: z.array(z.object({
    talentId: z.string().uuid('Invalid talent ID'),
    escortId: z.string().uuid('Invalid escort ID').nullable().optional(),
    escortIds: z.array(z.string().uuid('Invalid escort ID')).optional(), // For multi-dropdown groups
    dropdownCount: z.number().int().min(1).optional() // Number of dropdowns to display
  }))
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const body = await request.json()

    // Validate request body
    const validationResult = assignmentSchema.safeParse(body)
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

    const { date, assignments } = validationResult.data

    // Check project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Validate date is within project range
    const assignmentDate = new Date(date + 'T00:00:00')
    const projectStart = new Date(project.start_date + 'T00:00:00')
    const projectEnd = new Date(project.end_date + 'T00:00:00')
    
    if (assignmentDate < projectStart || assignmentDate > projectEnd) {
      return NextResponse.json(
        { error: 'Date is outside project range', code: 'DATE_OUT_OF_RANGE' },
        { status: 400 }
      )
    }

    console.log('🔧 DEBUG: Processing assignments:', assignments)
    
    // Process each assignment
    for (const assignment of assignments) {
      const { talentId, escortId, escortIds, dropdownCount } = assignment
      console.log('🔧 DEBUG: Processing assignment:', { talentId, escortId, escortIds, dropdownCount })

      // Check if this is a talent group or individual talent
      const { data: talentGroup } = await supabase
        .from('talent_groups')
        .select('id')
        .eq('id', talentId)
        .eq('project_id', projectId)
        .single()

      if (talentGroup) {
        console.log('🔧 DEBUG: Found talent group, updating...')
        // Update talent group assignment
        const updateData: any = {
          updated_at: new Date().toISOString()
        }

        // Handle multi-dropdown assignment for groups
        if (escortIds !== undefined) {
          // Handle escortIds array (including empty arrays for clearing)
          updateData.assigned_escort_ids = escortIds
          // Also update the legacy single escort field with the first escort for backward compatibility
          updateData.assigned_escort_id = escortIds.length > 0 ? escortIds[0] : null
        } else if (escortId !== undefined) {
          // Handle single escort assignment (backward compatibility)
          updateData.assigned_escort_id = escortId
          updateData.assigned_escort_ids = escortId ? [escortId] : []
        }

        // Update dropdown count if provided
        if (dropdownCount !== undefined) {
          updateData.escort_dropdown_count = dropdownCount
        }

        console.log('🔧 DEBUG: Updating talent group with data:', updateData)

        const { error: updateError } = await supabase
          .from('talent_groups')
          .update(updateData)
          .eq('id', talentId)
          .eq('project_id', projectId)
        
        if (updateError) {
          console.log('🔧 DEBUG: Update error:', updateError)
        } else {
          console.log('🔧 DEBUG: Update successful')
        }

        if (updateError) {
          console.error('Error updating talent group assignment:', updateError)
          return NextResponse.json(
            { error: 'Failed to update group assignment', code: 'DATABASE_ERROR' },
            { status: 500 }
          )
        }
      } else {
        // Update individual talent assignment
        const { error: updateError } = await supabase
          .from('talent_project_assignments')
          .update({
            escort_id: escortId,
            updated_at: new Date().toISOString()
          })
          .eq('talent_id', talentId)
          .eq('project_id', projectId)

        if (updateError) {
          console.error('Error updating talent assignment:', updateError)
          return NextResponse.json(
            { error: 'Failed to update talent assignment', code: 'DATABASE_ERROR' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      data: {
        message: 'Assignments updated successfully',
        date,
        updatedCount: assignments.length
      }
    })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/assignments:', error)
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