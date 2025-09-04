import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema for search parameters
const searchParamsSchema = z.object({
  q: z.string().optional(), // General search query
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  rep_name: z.string().optional(),
  rep_email: z.string().optional(),
  project_id: z.string().optional(), // Remove UUID validation to allow empty strings
  assignment_status: z.enum(['active', 'inactive', 'completed', 'unassigned', 'all']).default('all'),
  has_assignments: z.enum(['true', 'false', 'all']).default('all'),
  sort_by: z.enum(['first_name', 'last_name', 'rep_name', 'created_at', 'updated_at']).default('first_name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  include_projects: z.enum(['true', 'false']).default('true'),
  include_status: z.enum(['true', 'false']).default('false')
})

// GET /api/talent/search - Advanced talent search with filtering
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

    // Check if user is approved/active
    if (userProfile.status !== 'approved' && userProfile.status !== 'active') {
      return NextResponse.json(
        { error: 'Account not approved', code: 'ACCOUNT_NOT_APPROVED' },
        { status: 403 }
      )
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validationResult = searchParamsSchema.safeParse(params)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid search parameters',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const {
      q,
      first_name,
      last_name,
      rep_name,
      rep_email,
      project_id,
      assignment_status,
      has_assignments,
      sort_by,
      sort_order,
      limit,
      offset,
      include_projects,
      include_status
    } = validationResult.data

    // Build the select clause based on includes
    let selectClause = `
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
    `

    if (include_projects === 'true') {
      selectClause += `,
        talent_project_assignments(
          id,
          project_id,
          status,
          assigned_at,
          assigned_by,
          escort_id,
          projects(id, name, status)
        )
      `
    }

    if (include_status === 'true') {
      selectClause += `,
        talent_status(
          id,
          project_id,
          current_location_id,
          status,
          last_updated,
          projects(name),
          current_location:project_locations(name, color)
        )
      `
    }

    // Start building the query
    let talentQuery = supabase.from('talent').select(selectClause)

    // Apply search filters
    const searchConditions: string[] = []

    // General search query (searches across multiple fields)
    if (q && q.trim()) {
      const searchTerm = q.trim()
      searchConditions.push(`
        first_name.ilike.%${searchTerm}%,
        last_name.ilike.%${searchTerm}%,
        rep_name.ilike.%${searchTerm}%,
        rep_email.ilike.%${searchTerm}%
      `)
    }

    // Specific field searches
    if (first_name) {
      talentQuery = talentQuery.ilike('first_name', `%${first_name}%`)
    }
    if (last_name) {
      talentQuery = talentQuery.ilike('last_name', `%${last_name}%`)
    }
    if (rep_name) {
      talentQuery = talentQuery.ilike('rep_name', `%${rep_name}%`)
    }
    if (rep_email) {
      talentQuery = talentQuery.ilike('rep_email', `%${rep_email}%`)
    }

    // Apply general search if conditions exist
    if (searchConditions.length > 0) {
      talentQuery = talentQuery.or(searchConditions.join(','))
    }

    // Handle assignment filtering (simplified)
    if (project_id && project_id.trim() !== '' && project_id !== 'all') {
      talentQuery = talentQuery.eq('talent_project_assignments.project_id', project_id)
    }
    
    if (assignment_status !== 'all' && assignment_status !== 'unassigned') {
      talentQuery = talentQuery.eq('talent_project_assignments.status', assignment_status)
    }

    // Apply sorting
    const ascending = sort_order === 'asc'
    talentQuery = talentQuery.order(sort_by, { ascending })

    // Apply pagination
    talentQuery = talentQuery.range(offset, offset + limit - 1)

    // Execute the query
    const { data: talent, error: talentError } = await talentQuery

    if (talentError) {
      console.error('Error searching talent:', talentError)
      return NextResponse.json(
        { error: 'Failed to search talent', code: 'SEARCH_ERROR', details: talentError.message },
        { status: 500 }
      )
    }

    // Get total count for pagination (simplified count query)
    let countQuery = supabase
      .from('talent')
      .select('id', { count: 'exact', head: true })

    // Apply the same filters for count
    if (q && q.trim()) {
      const searchTerm = q.trim()
      countQuery = countQuery.or(`
        first_name.ilike.%${searchTerm}%,
        last_name.ilike.%${searchTerm}%,
        rep_name.ilike.%${searchTerm}%,
        rep_email.ilike.%${searchTerm}%
      `)
    }

    if (first_name) {
      countQuery = countQuery.ilike('first_name', `%${first_name}%`)
    }
    if (last_name) {
      countQuery = countQuery.ilike('last_name', `%${last_name}%`)
    }
    if (rep_name) {
      countQuery = countQuery.ilike('rep_name', `%${rep_name}%`)
    }
    if (rep_email) {
      countQuery = countQuery.ilike('rep_email', `%${rep_email}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting talent count:', countError)
    }

    // Process results to add computed fields
    const processedTalent = talent?.map(t => ({
      ...t,
      full_name: `${t.first_name} ${t.last_name}`,
      assignment_count: t.talent_project_assignments?.length || 0,
      active_assignments: t.talent_project_assignments?.filter(a => a.status === 'active').length || 0,
      has_active_assignments: (t.talent_project_assignments?.filter(a => a.status === 'active').length || 0) > 0
    }))

    return NextResponse.json({
      data: processedTalent || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
        page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil((count || 0) / limit)
      },
      filters: {
        q,
        first_name,
        last_name,
        rep_name,
        rep_email,
        project_id,
        assignment_status,
        has_assignments,
        sort_by,
        sort_order,
        include_projects,
        include_status
      },
      summary: {
        total_talent: count || 0,
        results_returned: processedTalent?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/talent/search:', error)
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