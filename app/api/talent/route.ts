import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { talentProfileSchema } from '@/lib/types'
import { hasAdminAccess } from '@/lib/role-utils'

// GET /api/talent - List talent with search and filtering
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

    // Get authenticated user
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

    // Parse query parameters for search and filtering
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const projectId = searchParams.get('project_id')
    const assignmentStatus = searchParams.get('assignment_status') || 'all'
    const sortBy = searchParams.get('sort_by') || 'first_name'
    const sortOrder = searchParams.get('sort_order') || 'asc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build the base query
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
        contact_info,
        created_at,
        updated_at,
        talent_project_assignments(
          id,
          project_id,
          status,
          assigned_at,
          assigned_by,
          escort_id,
          projects(name, status)
        )
      `)

    // Apply project filtering if specified
    if (projectId) {
      talentQuery = talentQuery.eq('talent_project_assignments.project_id', projectId)
    }

    // Apply assignment status filtering
    if (assignmentStatus !== 'all') {
      talentQuery = talentQuery.eq('talent_project_assignments.status', assignmentStatus)
    }

    // Apply search filtering
    if (search) {
      talentQuery = talentQuery.or(`
        first_name.ilike.%${search}%,
        last_name.ilike.%${search}%,
        rep_name.ilike.%${search}%,
        rep_email.ilike.%${search}%
      `)
    }

    // Apply sorting
    const validSortFields = ['first_name', 'last_name', 'rep_name', 'created_at']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'first_name'
    const order = sortOrder === 'desc' ? false : true
    
    talentQuery = talentQuery
      .order(sortField, { ascending: order })
      .range(offset, offset + limit - 1)

    const { data: talent, error: talentError } = await talentQuery

    if (talentError) {
      console.error('Error fetching talent:', talentError)
      return NextResponse.json(
        { error: 'Failed to fetch talent', code: 'FETCH_ERROR', details: talentError.message },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('talent')
      .select('id', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(`
        first_name.ilike.%${search}%,
        last_name.ilike.%${search}%,
        rep_name.ilike.%${search}%,
        rep_email.ilike.%${search}%
      `)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting talent count:', countError)
    }

    return NextResponse.json({
      data: talent || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      },
      filters: {
        search,
        project_id: projectId,
        assignment_status: assignmentStatus,
        sort_by: sortField,
        sort_order: sortOrder
      }
    })

  } catch (error) {
    console.error('Error in GET /api/talent:', error)
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

// POST /api/talent - Create new talent
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

    // Check if user has permission to create talent (Admin, In-House, Supervisor, Coordinator)
    const allowedRoles = ['admin', 'in_house', 'supervisor', 'coordinator']
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create talent', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
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

    // Create the talent record
    const { data: newTalent, error: createError } = await supabase
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
      .select(`
        id,
        first_name,
        last_name,
        rep_name,
        rep_email,
        rep_phone,
        notes,
        contact_info,
        created_at,
        updated_at
      `)
      .single()

    if (createError) {
      console.error('Error creating talent:', createError)
      return NextResponse.json(
        { 
          error: 'Failed to create talent',
          code: 'CREATE_ERROR',
          details: createError.message
        },
        { status: 500 }
      )
    }

    // Log the creation for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_created',
        user_id: user.id,
        details: `Created talent: ${talentData.first_name} ${talentData.last_name}`
      })

    return NextResponse.json({
      data: newTalent,
      message: 'Talent created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/talent:', error)
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