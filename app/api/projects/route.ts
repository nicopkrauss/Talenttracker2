import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { projectFormSchema } from '@/lib/types'
import { hasAdminAccess } from '@/lib/role-utils'

// GET /api/projects - List projects for current user with role-based filtering
export async function GET(request: NextRequest) {
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

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get user profile to determine role and access
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', session.user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user is approved/active
    if (userProfile.status !== 'approved' && userProfile.status !== 'active') {
      return NextResponse.json(
        { error: 'Account not approved', code: 'ACCOUNT_NOT_APPROVED' },
        { status: 403 }
      )
    }

    let projectsQuery = supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        production_company,
        hiring_contact,
        project_location: location,
        start_date,
        end_date,
        status,
        created_at,
        updated_at,
        created_by,
        created_by_profile:profiles!projects_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (hasAdminAccess(userProfile.role)) {
      // Admin and In-House users can see all projects
      // No additional filtering needed
    } else {
      // Supervisor, TLC, and Escort users can only see projects they're assigned to
      // For now, we'll show active projects only since team assignments aren't implemented yet
      projectsQuery = projectsQuery.eq('status', 'active')
    }

    const { data: projects, error: projectsError } = await projectsQuery

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return NextResponse.json(
        { error: 'Failed to fetch projects', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: projects || [],
      user_role: userProfile.role,
      total_count: projects?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/projects:', error)
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

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
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

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', session.user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user has permission to create projects (Admin or In-House only)
    if (!hasAdminAccess(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create projects', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
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

    // Create the project
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description || null,
        production_company: projectData.production_company || null,
        hiring_contact: projectData.hiring_contact || null,
        location: projectData.project_location || null,
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        status: 'prep',
        created_by: session.user.id
      })
      .select(`
        id,
        name,
        description,
        production_company,
        hiring_contact,
        project_location: location,
        start_date,
        end_date,
        status,
        created_at,
        updated_at,
        created_by
      `)
      .single()

    if (createError) {
      console.error('Error creating project:', createError)
      return NextResponse.json(
        { 
          error: 'Failed to create project',
          code: 'CREATE_ERROR',
          details: createError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: newProject,
      message: 'Project created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/projects:', error)
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
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to create projects.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to create projects.' },
    { status: 405 }
  )
}