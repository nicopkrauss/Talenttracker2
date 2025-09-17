/**
 * API Route: Evaluate Automatic Transitions
 * 
 * This endpoint triggers evaluation of all projects for automatic transitions.
 * It can be used for manual triggering or called by cron jobs/schedulers.
 * 
 * Requirements Coverage:
 * - 1.3, 1.4, 1.5, 1.6: Automatic transitions based on dates and completion
 * - 5.3, 5.4: Timezone-aware transition calculations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AutomaticTransitionEvaluator } from '@/lib/services/automatic-transition-evaluator'

export async function POST(request: NextRequest) {
  try {
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

    // Check if user has admin privileges
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Parse request body for configuration options
    const body = await request.json().catch(() => ({}))
    const { dryRun = false, enabledPhases } = body

    // Create evaluator with configuration
    const evaluator = new AutomaticTransitionEvaluator({
      dryRun,
      enabledPhases,
      alertOnFailure: true
    })

    // Run evaluation
    const result = await evaluator.evaluateAllProjects()

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in transition evaluation API:', error)
    
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

export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const hoursAhead = parseInt(searchParams.get('hoursAhead') || '24')

    // Get scheduled transitions
    const evaluator = new AutomaticTransitionEvaluator()
    const scheduledTransitions = await evaluator.getScheduledTransitions(hoursAhead)

    return NextResponse.json({
      success: true,
      data: {
        scheduledTransitions,
        hoursAhead,
        count: scheduledTransitions.length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting scheduled transitions:', error)
    
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