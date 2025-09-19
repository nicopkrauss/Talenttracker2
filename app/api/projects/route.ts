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

    // Get authenticated user (more secure than getSession)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get user profile to determine role and access
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
        location,
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
      // Supervisor, Coordinator, and Escort users can only see projects they're assigned to
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
    console.log('POST /api/projects - Starting request')
    
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
    console.log('User auth check:', { user: user?.id, error: userError })
    
    if (userError || !user) {
      console.log('Authentication failed:', userError)
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

    console.log('User profile check:', { profile: userProfile, error: profileError })

    if (profileError || !userProfile) {
      console.log('Profile not found:', profileError)
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user has permission to create projects (Admin or In-House only)
    console.log('Checking admin access for role:', userProfile.role)
    if (!hasAdminAccess(userProfile.role)) {
      console.log('Insufficient permissions for role:', userProfile.role)
      return NextResponse.json(
        { error: 'Insufficient permissions to create projects', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    console.log('Request body:', body)
    
    const validationResult = projectFormSchema.safeParse(body)
    console.log('Validation result:', { success: validationResult.success, error: validationResult.error })

    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.flatten().fieldErrors)
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
    console.log('Validated project data:', projectData)

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
        created_by: user.id
      })
      .select(`
        id,
        name,
        description,
        production_company,
        hiring_contact,
        location,
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

    console.log('Project created successfully, creating default role templates...')

    // Create default role templates for the new project
    const defaultRoleTemplates = [
      {
        project_id: newProject.id,
        role: 'supervisor',
        display_name: 'Supervisor',
        base_pay_rate: 300.00,
        time_type: 'daily',
        sort_order: 1,
        is_default: true,
        description: 'On-site management with day rate tracking'
      },
      {
        project_id: newProject.id,
        role: 'coordinator',
        display_name: 'Coordinator',
        base_pay_rate: 350.00,
        time_type: 'daily',
        sort_order: 2,
        is_default: true,
        description: 'Informational oversight role with day rate tracking'
      },
      {
        project_id: newProject.id,
        role: 'talent_escort',
        display_name: 'Talent Escort',
        base_pay_rate: 25.00,
        time_type: 'hourly',
        sort_order: 3,
        is_default: true,
        description: 'On-the-ground operations with hourly tracking'
      }
    ]

    const { error: templatesError } = await supabase
      .from('project_role_templates')
      .insert(defaultRoleTemplates)

    if (templatesError) {
      console.error('Error creating default role templates:', templatesError)
      // Don't fail the project creation, just log the error
      console.log('Project created but default role templates failed to create')
    } else {
      console.log('Default role templates created successfully')
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