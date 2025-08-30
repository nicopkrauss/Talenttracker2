import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { hasAdminAccess } from '@/lib/role-utils'

// PUT /api/projects/[id]/checklist - Update setup checklist
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
        { error: 'Insufficient permissions to update project checklist', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Validate project ID format
    const projectId = params.id
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { 
      roles_and_pay_completed,
      talent_roster_completed,
      team_assignments_completed,
      locations_completed
    } = body

    // Validate boolean values
    if (
      typeof roles_and_pay_completed !== 'boolean' ||
      typeof talent_roster_completed !== 'boolean' ||
      typeof team_assignments_completed !== 'boolean' ||
      typeof locations_completed !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Invalid checklist data. All fields must be boolean values.', code: 'INVALID_DATA' },
        { status: 400 }
      )
    }

    // Check if all items are completed
    const allCompleted = roles_and_pay_completed && 
                        talent_roster_completed && 
                        team_assignments_completed && 
                        locations_completed

    const completedAt = allCompleted ? new Date().toISOString() : null

    // Update or create the checklist
    const { data: checklist, error: checklistError } = await supabase
      .from('project_setup_checklist')
      .upsert({
        project_id: projectId,
        roles_and_pay_completed,
        talent_roster_completed,
        team_assignments_completed,
        locations_completed,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (checklistError) {
      console.error('Error updating checklist:', checklistError)
      return NextResponse.json(
        { 
          error: 'Failed to update checklist',
          code: 'UPDATE_ERROR',
          details: checklistError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: checklist,
      message: 'Checklist updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/checklist:', error)
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