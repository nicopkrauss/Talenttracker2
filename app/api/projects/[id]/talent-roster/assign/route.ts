import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/projects/[id]/talent-roster/assign - Assign existing talent to project
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

    // Check if user has permission to assign talent (Admin, In-House, Supervisor, Coordinator)
    const allowedRoles = ['admin', 'in_house', 'supervisor', 'coordinator']
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to assign talent', code: 'INSUFFICIENT_PERMISSIONS' },
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
    const { talent_id } = body

    if (!talent_id) {
      return NextResponse.json(
        { error: 'Talent ID is required', code: 'MISSING_TALENT_ID' },
        { status: 400 }
      )
    }

    // Verify talent exists
    const { data: talent, error: talentError } = await supabase
      .from('talent')
      .select('id, first_name, last_name')
      .eq('id', talent_id)
      .single()

    if (talentError || !talent) {
      return NextResponse.json(
        { error: 'Talent not found', code: 'TALENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if talent is already assigned to this project
    const { data: existingAssignment, error: checkError } = await supabase
      .from('talent_project_assignments')
      .select('id')
      .eq('talent_id', talent_id)
      .eq('project_id', projectId)
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Talent is already assigned to this project', code: 'ALREADY_ASSIGNED' },
        { status: 409 }
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
        talent_id: talent_id,
        project_id: projectId,
        assigned_by: user.id,
        status: 'active',
        display_order: nextDisplayOrder
      })
      .select('id, status, assigned_at, display_order')
      .single()

    if (assignmentError) {
      console.error('Error creating talent assignment:', assignmentError)
      return NextResponse.json(
        { 
          error: 'Failed to assign talent to project',
          code: 'CREATE_ASSIGNMENT_ERROR',
          details: assignmentError.message
        },
        { status: 500 }
      )
    }

    // Log the assignment for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_assigned_to_project',
        user_id: user.id,
        details: `Assigned talent ${talent.first_name} ${talent.last_name} to project ${project.name}`
      })

    return NextResponse.json({
      data: {
        talent_id: talent_id,
        project_id: projectId,
        assignment
      },
      message: 'Talent assigned to project successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/talent-roster/assign:', error)
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