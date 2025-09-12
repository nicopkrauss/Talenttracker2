import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const reorderSchema = z.object({
  talentIds: z.array(z.string()).min(1, 'At least one talent ID is required')
})

// PUT /api/projects/[id]/talent-roster/reorder - Reorder talent assignments
export async function PUT(
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

    const projectId = params.id
    const body = await request.json()
    
    // Validate request body
    const validationResult = reorderSchema.safeParse(body)
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

    const { talentIds } = validationResult.data

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user has permission to modify this project
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const hasAdminAccess = userProfile?.role === 'admin' || userProfile?.role === 'in_house'
    const isProjectCreator = project.created_by === user.id

    if (!hasAdminAccess && !isProjectCreator) {
      // Check if user is assigned to this project with appropriate role
      const { data: teamAssignment } = await supabase
        .from('team_assignments')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (!teamAssignment || !['supervisor', 'coordinator'].includes(teamAssignment.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        )
      }
    }

    // Verify all talent IDs belong to this project
    const { data: existingAssignments, error: assignmentsError } = await supabase
      .from('talent_project_assignments')
      .select('id, talent_id')
      .eq('project_id', projectId)
      .in('talent_id', talentIds)

    if (assignmentsError) {
      console.error('Error fetching talent assignments:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch talent assignments', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Check if all provided talent IDs exist in the project
    const existingTalentIds = new Set(existingAssignments.map(a => a.talent_id))
    const invalidTalentIds = talentIds.filter(id => !existingTalentIds.has(id))
    
    if (invalidTalentIds.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some talent IDs are not assigned to this project',
          code: 'INVALID_TALENT_IDS',
          details: { invalidTalentIds }
        },
        { status: 400 }
      )
    }

    // Update display_order for each talent assignment
    const updatePromises = talentIds.map((talentId, index) => {
      return supabase
        .from('talent_project_assignments')
        .update({ 
          display_order: index + 1,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('talent_id', talentId)
    })

    const results = await Promise.all(updatePromises)
    
    // Check for any errors in the updates
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Error updating talent assignment order:', errors)
      return NextResponse.json(
        { error: 'Failed to update talent assignment order', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    // Fetch updated assignments to return
    const { data: updatedAssignments, error: fetchError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        talent_id,
        display_order,
        talent:talent_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .order('display_order', { ascending: true })

    if (fetchError) {
      console.error('Error fetching updated assignments:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch updated assignments', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Talent assignment order updated successfully',
      data: updatedAssignments
    })

  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/talent-roster/reorder:', error)
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