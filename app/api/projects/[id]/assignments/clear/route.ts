import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(
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

    const projectId = params.id

    // Check project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Clear all talent assignments for this project
    const { error: talentError } = await supabase
      .from('talent_project_assignments')
      .update({
        escort_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)

    if (talentError) {
      console.error('Error clearing talent assignments:', talentError)
      return NextResponse.json(
        { error: 'Failed to clear talent assignments', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Clear all talent group assignments for this project
    const { error: groupError } = await supabase
      .from('talent_groups')
      .update({
        assigned_escort_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)

    if (groupError) {
      console.error('Error clearing group assignments:', groupError)
      return NextResponse.json(
        { error: 'Failed to clear group assignments', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        message: 'All assignments cleared successfully'
      }
    })

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/assignments/clear:', error)
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