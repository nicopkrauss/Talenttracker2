/**
 * API Route: Evaluate Single Project Transition
 * 
 * This endpoint evaluates a specific project for automatic transitions.
 * It provides detailed evaluation results for monitoring and debugging.
 * 
 * Requirements Coverage:
 * - 1.3, 1.4, 1.5, 1.6: Automatic transitions based on dates and completion
 * - 5.3, 5.4: Timezone-aware transition calculations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AutomaticTransitionEvaluator } from '@/lib/services/automatic-transition-evaluator'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const projectId = params.id

    // Get authenticated user
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user has access to this project
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Check project access
    let hasAccess = false
    
    if (profile?.role === 'admin' || profile?.role === 'in_house') {
      hasAccess = true
    } else {
      // Check if user is assigned to this project
      const { data: assignment } = await supabase
        .from('team_assignments')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()
      
      hasAccess = !!assignment
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Evaluate the project
    const evaluator = new AutomaticTransitionEvaluator()
    const evaluation = await evaluator.evaluateProject(projectId)

    return NextResponse.json({
      success: true,
      data: evaluation,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error evaluating project transition:', error)
    
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const projectId = params.id

    // Get authenticated user
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user has admin privileges for forced evaluation
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'in_house')) {
      return NextResponse.json(
        { error: 'Insufficient permissions for forced evaluation', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { executeTransition = false, dryRun = false } = body

    // Evaluate the project
    const evaluator = new AutomaticTransitionEvaluator({ dryRun })
    const evaluation = await evaluator.evaluateProject(projectId)

    let transitionResult = null

    // Execute transition if requested and conditions are met
    if (executeTransition && evaluation.shouldTransition && !dryRun) {
      try {
        const phaseEngine = new (await import('@/lib/services/phase-engine')).PhaseEngine()
        
        if (evaluation.evaluation.targetPhase) {
          await phaseEngine.executeTransition(
            projectId,
            evaluation.evaluation.targetPhase,
            (await import('@/lib/services/phase-engine')).TransitionTrigger.MANUAL,
            user.id,
            'Manual transition via API'
          )
          
          transitionResult = {
            success: true,
            fromPhase: evaluation.currentPhase,
            toPhase: evaluation.evaluation.targetPhase,
            timestamp: new Date().toISOString()
          }
        }
      } catch (transitionError) {
        transitionResult = {
          success: false,
          error: transitionError instanceof Error ? transitionError.message : 'Unknown error'
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        evaluation,
        transitionResult
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in project transition evaluation API:', error)
    
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