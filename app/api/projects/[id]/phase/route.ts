import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PhaseEngine } from '@/lib/services/phase-engine'

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
      .select('id, name, status, created_by')
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
        .eq('project_id', id)
        .eq('user_id', user.id)
        .single()

      if (!assignment) {
        return NextResponse.json(
          { error: 'Access denied', code: 'ACCESS_DENIED' },
          { status: 403 }
        )
      }
    }

    // Get current phase using PhaseEngine
    const phaseEngine = new PhaseEngine()
    const currentPhase = await phaseEngine.getCurrentPhase(id)
    
    // Get transition evaluation
    const transitionResult = await phaseEngine.evaluateTransition(id)

    return NextResponse.json({
      data: {
        projectId: id,
        currentPhase,
        transitionResult,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Phase API Error:', error)
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

