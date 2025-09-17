/**
 * API Route: Cron Job for Automatic Transitions
 * 
 * This endpoint is designed to be called by cron jobs or scheduled tasks
 * to perform periodic evaluation of automatic transitions.
 * 
 * Requirements Coverage:
 * - 1.3, 1.4, 1.5, 1.6: Automatic transitions based on dates and completion
 * - 5.3, 5.4: Timezone-aware transition calculations
 * 
 * Usage:
 * - Set up a cron job to call this endpoint every 15 minutes
 * - Use authorization header or API key for security
 * - Monitor response for success/failure status
 */

import { NextRequest, NextResponse } from 'next/server'
import { runScheduledEvaluation } from '@/lib/services/transition-scheduler'
import { AutomaticTransitionEvaluator } from '@/lib/services/automatic-transition-evaluator'

export async function POST(request: NextRequest) {
  try {
    // Verify authorization for cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron job not configured', code: 'CONFIGURATION_ERROR' },
        { status: 500 }
      )
    }

    // Check authorization
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job attempt')
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Run the scheduled evaluation
    console.log('Starting scheduled transition evaluation via cron job')
    const result = await runScheduledEvaluation()

    // Log results
    console.log(`Cron job completed: ${result.successfulTransitions} successful, ${result.failedTransitions} failed, ${result.scheduledTransitions} scheduled`)

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        totalProjects: result.totalProjects,
        evaluatedProjects: result.evaluatedProjects,
        successfulTransitions: result.successfulTransitions,
        failedTransitions: result.failedTransitions,
        scheduledTransitions: result.scheduledTransitions,
        errorCount: result.errors.length
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    })

  } catch (error) {
    console.error('Error in cron job transition evaluation:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        code: 'CRON_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support GET for health checks
export async function GET(request: NextRequest) {
  try {
    // Simple health check for cron job endpoint
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
    
    if (!cronSecret) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Cron job not configured',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Unauthorized',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'Cron job endpoint is ready',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}