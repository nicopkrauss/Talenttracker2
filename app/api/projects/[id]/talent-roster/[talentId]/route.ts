import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// DELETE /api/projects/[id]/talent-roster/[talentId] - Remove talent from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; talentId: string }> }
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

    // Check if user has permission to remove talent (Admin and In-House only for removal)
    if (!userProfile.role || !['admin', 'in_house'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove talent', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Await params
    const { id: projectId, talentId } = await params

    // Verify talent assignment exists
    const { data: talentAssignment, error: assignmentError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        talent_id,
        project_id,
        talent:talent(first_name, last_name),
        projects(name)
      `)
      .eq('talent_id', talentId)
      .eq('project_id', projectId)
      .single()

    if (assignmentError || !talentAssignment) {
      return NextResponse.json(
        { error: 'Talent assignment not found', code: 'ASSIGNMENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Remove the talent assignment
    const { error: deleteError } = await supabase
      .from('talent_project_assignments')
      .delete()
      .eq('id', talentAssignment.id)

    if (deleteError) {
      console.error('Error removing talent assignment:', deleteError)
      return NextResponse.json(
        { 
          error: 'Failed to remove talent from project',
          code: 'DELETE_ERROR',
          details: deleteError.message
        },
        { status: 500 }
      )
    }

    // Log the removal for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_removed_from_project',
        user_id: user.id,
        details: `Removed talent ${talentAssignment.talent?.first_name} ${talentAssignment.talent?.last_name} from project ${talentAssignment.projects?.name}`
      })

    return NextResponse.json({
      message: 'Talent removed from project successfully',
      removed_talent: {
        id: talentId,
        name: `${talentAssignment.talent?.first_name} ${talentAssignment.talent?.last_name}`
      }
    })

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/talent-roster/[talentId]:', error)
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