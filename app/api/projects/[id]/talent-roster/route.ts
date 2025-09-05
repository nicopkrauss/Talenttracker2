import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { talentProfileSchema } from '@/lib/types'

// GET /api/projects/[id]/talent-roster - Fetch project talent roster
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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Await params
    const { id: projectId } = await params

    // Check if user has access to this project
    const { data: projectAccess, error: accessError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', projectId)
      .single()

    if (accessError || !projectAccess) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse query parameters for filtering and sorting
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const sortBy = searchParams.get('sort_by') || 'first_name'
    const sortOrder = searchParams.get('sort_order') || 'asc'

    // Build the query for talent assigned to this project
    let talentQuery = supabase
      .from('talent')
      .select(`
        id,
        first_name,
        last_name,
        rep_name,
        rep_email,
        rep_phone,
        notes,
        created_at,
        updated_at,
        talent_project_assignments!inner(
          id,
          status,
          assigned_at
        )
      `)
      .eq('talent_project_assignments.project_id', projectId)

    // Apply status filtering
    if (status !== 'all') {
      talentQuery = talentQuery.eq('talent_project_assignments.status', status)
    }

    // Apply search filtering (name only for simplified interface)
    if (search) {
      talentQuery = talentQuery.or(`
        first_name.ilike.%${search}%,
        last_name.ilike.%${search}%
      `)
    }

    // Apply sorting
    const validSortFields = ['first_name', 'last_name', 'created_at']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'first_name'
    const order = sortOrder === 'desc' ? false : true
    
    talentQuery = talentQuery.order(sortField, { ascending: order })

    const { data: talent, error: talentError } = await talentQuery

    if (talentError) {
      console.error('Error fetching talent roster:', talentError)
      return NextResponse.json(
        { error: 'Failed to fetch talent roster', code: 'FETCH_ERROR', details: talentError.message },
        { status: 500 }
      )
    }

    // Transform the data to flatten the assignment information
    const transformedTalent = talent?.map(t => ({
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      rep_name: t.rep_name,
      rep_email: t.rep_email,
      rep_phone: t.rep_phone,
      notes: t.notes,
      created_at: t.created_at,
      updated_at: t.updated_at,
      assignment: t.talent_project_assignments[0] // Should only be one per project
    })) || []

    return NextResponse.json({
      data: transformedTalent,
      project: {
        id: projectAccess.id,
        name: projectAccess.name,
        status: projectAccess.status
      },
      filters: {
        search,
        status,
        sort_by: sortField,
        sort_order: sortOrder
      }
    })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/talent-roster:', error)
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

// POST /api/projects/[id]/talent-roster - Add talent to project (manual entry)
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

    // Check if user has permission to manage talent (Admin, In-House, Supervisor, Coordinator)
    const allowedRoles = ['admin', 'in_house', 'supervisor', 'coordinator']
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add talent', code: 'INSUFFICIENT_PERMISSIONS' },
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
    const validationResult = talentProfileSchema.safeParse(body)

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

    const talentData = validationResult.data

    // Start a transaction to create talent and assignment
    const { data: newTalent, error: createTalentError } = await supabase
      .from('talent')
      .insert({
        first_name: talentData.first_name,
        last_name: talentData.last_name,
        rep_name: talentData.rep_name,
        rep_email: talentData.rep_email,
        rep_phone: talentData.rep_phone,
        notes: talentData.notes || null,
        contact_info: {} // Initialize as empty object
      })
      .select('id, first_name, last_name, rep_name, rep_email, rep_phone, notes, created_at, updated_at')
      .single()

    if (createTalentError) {
      console.error('Error creating talent:', createTalentError)
      return NextResponse.json(
        { 
          error: 'Failed to create talent',
          code: 'CREATE_TALENT_ERROR',
          details: createTalentError.message
        },
        { status: 500 }
      )
    }

    // Create project assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('talent_project_assignments')
      .insert({
        talent_id: newTalent.id,
        project_id: projectId,
        assigned_by: user.id,
        status: 'active'
      })
      .select('id, status, assigned_at')
      .single()

    if (assignmentError) {
      console.error('Error creating talent assignment:', assignmentError)
      // Try to clean up the talent record if assignment failed
      await supabase.from('talent').delete().eq('id', newTalent.id)
      
      return NextResponse.json(
        { 
          error: 'Failed to assign talent to project',
          code: 'CREATE_ASSIGNMENT_ERROR',
          details: assignmentError.message
        },
        { status: 500 }
      )
    }

    // Log the creation for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_added_to_project',
        user_id: user.id,
        details: `Added talent ${talentData.first_name} ${talentData.last_name} to project ${project.name}`
      })

    return NextResponse.json({
      data: {
        ...newTalent,
        assignment
      },
      message: 'Talent added to project successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/talent-roster:', error)
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