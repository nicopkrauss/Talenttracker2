/**
 * Timecard Calculation API Endpoint
 * 
 * Provides real-time calculation services for timecard data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createTimecardCalculationEngine, type TimecardData } from '@/lib/timecard-calculation-engine'
import { z } from 'zod'

// Validation schema for calculation requests
const CalculationRequestSchema = z.object({
  user_id: z.string().uuid(),
  project_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_in_time: z.string().datetime().optional(),
  check_out_time: z.string().datetime().optional(),
  break_start_time: z.string().datetime().optional(),
  break_end_time: z.string().datetime().optional(),
  apply_grace_period: z.boolean().optional().default(true),
  default_break_duration: z.number().min(0).max(120).optional().default(30)
})

const TimecardUpdateSchema = z.object({
  timecard_id: z.string().uuid()
})

export async function POST(request: NextRequest) {
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

    // Parse and validate request
    const body = await request.json()
    const validationResult = CalculationRequestSchema.safeParse(body)
    
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

    const data = validationResult.data

    // Verify user has access to this project
    const { data: teamAssignment, error: accessError } = await supabase
      .from('team_assignments')
      .select('id')
      .eq('user_id', data.user_id)
      .eq('project_id', data.project_id)
      .single()

    if (accessError || !teamAssignment) {
      return NextResponse.json(
        { error: 'Access denied to project', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    // Create calculation engine
    const calculationEngine = createTimecardCalculationEngine(supabase)

    // Prepare timecard data
    const timecardData: TimecardData = {
      user_id: data.user_id,
      project_id: data.project_id,
      date: data.date,
      check_in_time: data.check_in_time || null,
      check_out_time: data.check_out_time || null,
      break_start_time: data.break_start_time || null,
      break_end_time: data.break_end_time || null,
      status: 'draft',
      manually_edited: false
    }

    // Apply grace period logic if requested and break times are present
    if (data.apply_grace_period && data.break_start_time && data.break_end_time) {
      const adjustedBreakDuration = calculationEngine.applyBreakGracePeriod(
        data.break_start_time,
        data.break_end_time,
        data.default_break_duration
      )
      
      // Recalculate break end time if grace period applied
      if (adjustedBreakDuration === data.default_break_duration) {
        const breakStart = new Date(data.break_start_time)
        const adjustedBreakEnd = new Date(breakStart.getTime() + (adjustedBreakDuration * 60 * 1000))
        timecardData.break_end_time = adjustedBreakEnd.toISOString()
      }
    }

    // Calculate timecard
    const calculation = await calculationEngine.calculateTimecard(timecardData)

    if (!calculation.is_valid) {
      return NextResponse.json(
        {
          error: 'Calculation failed',
          code: 'CALCULATION_ERROR',
          details: calculation.validation_errors
        },
        { status: 400 }
      )
    }

    // Return calculation results
    return NextResponse.json({
      data: {
        total_hours: calculation.total_hours,
        break_duration: calculation.break_duration,
        total_pay: calculation.total_pay,
        manually_edited_flag: calculation.manually_edited_flag,
        validation_errors: calculation.validation_errors,
        timecard_data: timecardData
      }
    })

  } catch (error) {
    console.error('Timecard calculation API error:', error)
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

export async function PUT(request: NextRequest) {
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

    // Parse and validate request
    const body = await request.json()
    const validationResult = TimecardUpdateSchema.safeParse(body)
    
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

    const { timecard_id } = validationResult.data

    // Create calculation engine
    const calculationEngine = createTimecardCalculationEngine(supabase)

    // Update timecard calculations
    const success = await calculationEngine.updateTimecardCalculations(timecard_id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update timecard calculations', code: 'UPDATE_FAILED' },
        { status: 400 }
      )
    }

    // Fetch updated timecard
    const { data: updatedTimecard, error: fetchError } = await supabase
      .from('timecard_headers')
      .select('*')
      .eq('id', timecard_id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch updated timecard', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedTimecard
    })

  } catch (error) {
    console.error('Timecard update API error:', error)
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