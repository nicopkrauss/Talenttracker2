import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, created_by')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check user permissions for this project
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const hasAdminAccess = profile?.role === 'admin' || profile?.role === 'in_house'
    const isProjectCreator = project.created_by === user.id

    if (!hasAdminAccess && !isProjectCreator) {
      // Check if user is assigned to this project
      const { data: assignment } = await supabase
        .from('team_assignments')
        .select('id')
        .eq('project_id', params.id)
        .eq('user_id', user.id)
        .single()

      if (!assignment) {
        return NextResponse.json(
          { error: 'Access denied', code: 'ACCESS_DENIED' },
          { status: 403 }
        )
      }
    }

    // Get phase transition history from project_audit_log
    const { data: history, error: historyError } = await supabase
      .from('project_audit_log')
      .select(`
        id,
        action,
        details,
        created_at,
        user_id,
        user:profiles!project_audit_log_user_id_fkey(full_name, email)
      `)
      .eq('project_id', id)
      .eq('action', 'phase_transition')
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('History fetch error:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch transition history', code: 'HISTORY_FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Format the history data
    const formattedHistory = history.map(entry => ({
      id: entry.id,
      transitionedAt: entry.created_at,
      transitionedBy: {
        id: entry.user_id,
        name: entry.user?.full_name || 'Unknown User',
        email: entry.user?.email
      },
      fromPhase: entry.details?.from_phase || 'unknown',
      toPhase: entry.details?.to_phase || 'unknown',
      trigger: entry.details?.trigger || 'unknown',
      reason: entry.details?.reason || 'No reason provided',
      metadata: entry.details
    }))

    return NextResponse.json({
      data: {
        projectId: id,
        history: formattedHistory,
        totalTransitions: formattedHistory.length
      }
    })

  } catch (error) {
    console.error('Phase History API Error:', error)
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