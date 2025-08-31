import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { projectFormSchema } from '@/lib/types'
import { hasAdminAccess } from '@/lib/role-utils'

// GET /api/projects/[id] - Get project details
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

    // Get authenticated user (more secure than getSession)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get user profile to determine access
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

    // Validate project ID format
    const { id: projectId } = await params
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      )
    }

    // Get project details with related data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        production_company,
        hiring_contact,
        location,
        talent_expected,
        start_date,
        end_date,
        status,
        created_at,
        updated_at,
        created_by,
        created_by_profile:profiles!projects_created_by_fkey(full_name),
        project_setup_checklist (
          project_id,
          roles_and_pay_completed,
          talent_roster_completed,
          team_assignments_completed,
          locations_completed,
          completed_at,
          created_at,
          updated_at
        )
      `)
      .eq('id', projectId)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
          { status: 404 }
        )
      }
      console.error('Error fetching project:', projectError)
      return NextResponse.json(
        { error: 'Failed to fetch project', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Check access permissions
    const isAdmin = hasAdminAccess(userProfile.role)
    
    if (!isAdmin) {
      // Non-admin users need to be assigned to the project
      // For now, we'll allow access to active projects only
      // TODO: Implement proper team assignment checking when that feature is ready
      if (project.status !== 'active') {
        return NextResponse.json(
          { error: 'Access denied to this project', code: 'ACCESS_DENIED' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      data: project
    })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]:', error)
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

// PUT /api/projects/[id] - Update project
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

    // Get authenticated user (more secure than getSession)
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

    // Check if user has permission to update projects (Admin or In-House only)
    if (!hasAdminAccess(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update projects', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Validate project ID format
    const { id: projectId } = await params
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      )
    }

    // Check if project exists
    const { data: existingProject, error: existsError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', projectId)
      .single()

    if (existsError) {
      if (existsError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
          { status: 404 }
        )
      }
      console.error('Error checking project existence:', existsError)
      return NextResponse.json(
        { error: 'Failed to verify project', code: 'VERIFICATION_ERROR' },
        { status: 500 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = projectFormSchema.safeParse(body)

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

    const projectData = validationResult.data

    // Update the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        name: projectData.name,
        description: projectData.description || null,
        production_company: projectData.production_company || null,
        hiring_contact: projectData.hiring_contact || null,
        location: projectData.project_location || null,
        talent_expected: body.talent_expected || null,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        id,
        name,
        description,
        production_company,
        hiring_contact,
        location,
        talent_expected,
        start_date,
        end_date,
        status,
        created_at,
        updated_at,
        created_by
      `)
      .single()

    if (updateError) {
      console.error('Error updating project:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update project',
          code: 'UPDATE_ERROR',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedProject,
      message: 'Project updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/projects/[id]:', error)
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

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use PUT to update projects.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Project deletion not supported.' },
    { status: 405 }
  )
}