import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const unifiedReorderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    type: z.enum(['talent', 'group']),
    displayOrder: z.number()
  })).min(1, 'At least one item is required')
})

// PUT /api/projects/[id]/talent-roster/reorder-unified - Reorder talent and groups together
export async function PUT(
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
    const body = await request.json()
    
    // Validate request body
    const validationResult = unifiedReorderSchema.safeParse(body)
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

    const { items } = validationResult.data

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

    // Separate talent and group items
    const talentItems = items.filter(item => item.type === 'talent')
    const groupItems = items.filter(item => item.type === 'group')

    // Update talent assignments display order
    const talentUpdatePromises = talentItems.map(item => {
      return supabase
        .from('talent_project_assignments')
        .update({ 
          display_order: item.displayOrder,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('talent_id', item.id)
    })

    // Update talent groups display order
    const groupUpdatePromises = groupItems.map(item => {
      return supabase
        .from('talent_groups')
        .update({ 
          display_order: item.displayOrder,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('id', item.id)
    })

    // Execute all updates
    const allPromises = [...talentUpdatePromises, ...groupUpdatePromises]
    const results = await Promise.all(allPromises)
    
    // Check for any errors in the updates
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Error updating roster order:', errors)
      return NextResponse.json(
        { error: 'Failed to update roster order', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Roster order updated successfully',
      updatedItems: items.length
    })

  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/talent-roster/reorder-unified:', error)
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