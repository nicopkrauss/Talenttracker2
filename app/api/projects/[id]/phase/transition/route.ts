import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PhaseEngine, TransitionTrigger } from '@/lib/services/phase-engine'
import { z } from 'zod'

const transitionSchema = z.object({
  targetPhase: z.enum(['prep', 'staffing', 'pre_show', 'active', 'post_show', 'complete', 'archived']),
  reason: z.string().optional(),
  force: z.boolean().default(false)
})

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

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check admin permissions for manual transitions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'in_house') {
      return NextResponse.json(
        { error: 'Admin access required for manual transitions', code: 'ADMIN_REQUIRED' },
        { status: 403 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validationResult = transitionSchema.safeParse(body)
    
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

    const { id } = await params
    const { targetPhase, reason, force } = validationResult.data

    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Execute transition using PhaseEngine
    const phaseEngine = new PhaseEngine()
    
    if (!force) {
      // Check if transition is valid
      const transitionResult = await phaseEngine.evaluateTransition(id)
      if (!transitionResult.canTransition || transitionResult.targetPhase !== targetPhase) {
        return NextResponse.json(
          { 
            error: 'Invalid transition',
            code: 'INVALID_TRANSITION',
            details: {
              canTransition: transitionResult.canTransition,
              blockers: transitionResult.blockers,
              expectedPhase: transitionResult.targetPhase,
              currentPhase: await phaseEngine.getCurrentPhase(id)
            }
          },
          { status: 400 }
        )
      }
    }

    // Get current phase before transition
    const currentPhase = await phaseEngine.getCurrentPhase(id)

    // Execute the transition
    await phaseEngine.executeTransition(
      id, 
      targetPhase, 
      TransitionTrigger.MANUAL,
      user.id,
      reason || 'Manual transition by administrator'
    )

    // Get updated phase information
    const newPhase = await phaseEngine.getCurrentPhase(id)
    const newTransitionResult = await phaseEngine.evaluateTransition(id)

    return NextResponse.json({
      data: {
        projectId: id,
        previousPhase: currentPhase,
        currentPhase: newPhase,
        transitionResult: newTransitionResult,
        transitionedAt: new Date().toISOString(),
        transitionedBy: {
          id: user.id,
          name: profile?.full_name || 'Unknown User',
          email: user.email
        },
        reason: reason || 'Manual transition by administrator',
        forced: force
      }
    })

  } catch (error) {
    console.error('Phase Transition API Error:', error)
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