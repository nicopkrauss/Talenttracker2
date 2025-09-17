import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { readinessInvalidationSchema } from '@/lib/types'

// POST /api/projects/[id]/readiness/invalidate - Trigger readiness recalculation
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
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
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

    // Validate project ID format
    const { id: projectId } = await params
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, status')
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
        { error: 'Failed to verify project', code: 'PROJECT_VERIFICATION_ERROR' },
        { status: 500 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = readinessInvalidationSchema.safeParse(body)

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

    const { reason, optimistic_state } = validationResult.data

    try {
      // Note: Materialized view refresh is handled automatically by triggers
      // This endpoint provides a way to get fresh readiness data and handle optimistic updates
      console.log(`Readiness invalidation requested for project ${projectId} - reason: ${reason}`)

      // Get updated readiness data using the function
      const { data: readinessArray, error: readinessError } = await supabase
        .rpc('get_project_readiness', { p_project_id: projectId })

      if (readinessError) {
        console.error('Error fetching updated readiness:', readinessError)
        return NextResponse.json(
          { error: 'Failed to fetch updated readiness', code: 'READINESS_FETCH_ERROR' },
          { status: 500 }
        )
      }

      if (!readinessArray || readinessArray.length === 0) {
        return NextResponse.json(
          { error: 'Readiness data not found', code: 'READINESS_NOT_FOUND' },
          { status: 404 }
        )
      }

      const readiness = readinessArray[0]

      // Transform to API format
      const readinessResponse = {
        status: readiness.readiness_status,
        features: {
          team_management: readiness.team_management_available,
          talent_tracking: readiness.talent_tracking_available,
          scheduling: readiness.scheduling_available,
          time_tracking: readiness.time_tracking_available,
        },
        blocking_issues: readiness.blocking_issues || [],
        available_features: readiness.available_features || [],
        counts: {
          role_templates: readiness.role_template_count,
          team_assignments: readiness.team_assignment_count,
          locations: readiness.location_count,
          talent: readiness.talent_count,
        },
        calculated_at: readiness.calculated_at,
      }

      // Log the invalidation for debugging
      console.log(`Readiness invalidated for project ${projectId} - reason: ${reason}`, {
        user_id: user.id,
        optimistic_state,
        new_status: readinessResponse.status
      })

      return NextResponse.json({
        data: {
          readiness: readinessResponse,
          timestamp: new Date().toISOString(),
          reason,
          optimistic_state
        }
      })

    } catch (error) {
      console.error('Error during readiness invalidation:', error)
      return NextResponse.json(
        { 
          error: 'Failed to invalidate readiness',
          code: 'INVALIDATION_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/readiness/invalidate:', error)
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
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to invalidate readiness.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to invalidate readiness.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to invalidate readiness.' },
    { status: 405 }
  )
}