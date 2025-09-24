import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createTimecardCalculationEngine } from '@/lib/timecard-calculation-engine'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', code: 'MISSING_PROJECT_ID' },
        { status: 400 }
      )
    }

    // Get current timecard record for the date
    const { data: timecard, error: timecardError } = await supabase
      .from('timecard_headers')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .eq('date', date)
      .eq('status', 'draft')
      .maybeSingle()

    if (timecardError) {
      console.error('Error fetching timecard:', timecardError)
      return NextResponse.json(
        { error: 'Failed to fetch timecard', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Get global settings
    const { data: globalSettings, error: settingsError } = await supabase
      .from('global_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('Error fetching global settings:', settingsError)
      // Use defaults if settings not found
      const defaultSettings = {
        default_escort_break_minutes: 30,
        default_staff_break_minutes: 60,
        max_hours_before_stop: 20,
        overtime_warning_hours: 12,
        timecard_reminder_frequency_days: 1,
        submission_opens_on_show_day: true
      }
      
      return NextResponse.json({
        timecard,
        globalSettings: defaultSettings
      })
    }

    return NextResponse.json({
      timecard,
      globalSettings
    })

  } catch (error) {
    console.error('API Error:', error)
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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { projectId, action, timestamp } = body

    if (!projectId || !action || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const date = new Date(timestamp).toISOString().split('T')[0]
    const actionTimestamp = new Date(timestamp).toISOString()

    // Get existing timecard or create new one
    let { data: timecard, error: fetchError } = await supabase
      .from('timecard_headers')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .eq('date', date)
      .eq('status', 'draft')
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching timecard:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch timecard', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Prepare update data based on action
    let updateData: any = {
      updated_at: actionTimestamp
    }

    switch (action) {
      case 'check_in':
        updateData.check_in_time = actionTimestamp
        break
      case 'start_break':
        updateData.break_start_time = actionTimestamp
        break
      case 'end_break':
        updateData.break_end_time = actionTimestamp
        break
      case 'check_out':
        updateData.check_out_time = actionTimestamp
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action', code: 'INVALID_ACTION' },
          { status: 400 }
        )
    }

    // Create calculation engine for real-time updates
    const calculationEngine = createTimecardCalculationEngine(supabase)

    let result
    if (timecard) {
      // Update existing timecard
      const { data, error } = await supabase
        .from('timecard_headers')
        .update(updateData)
        .eq('id', timecard.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating timecard:', error)
        return NextResponse.json(
          { error: 'Failed to update timecard', code: 'DATABASE_ERROR' },
          { status: 500 }
        )
      }
      result = data
    } else {
      // Create new timecard
      const { data, error } = await supabase
        .from('timecard_headers')
        .insert({
          user_id: user.id,
          project_id: projectId,
          date,
          status: 'draft',
          total_hours: 0,
          break_duration: 0,
          pay_rate: 0,
          total_pay: 0,
          manually_edited: false,
          created_at: actionTimestamp,
          ...updateData
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating timecard:', error)
        return NextResponse.json(
          { error: 'Failed to create timecard', code: 'DATABASE_ERROR' },
          { status: 500 }
        )
      }
      result = data
    }

    // Apply real-time calculations after timecard update
    if (result?.id) {
      const calculationSuccess = await calculationEngine.updateTimecardCalculations(result.id)
      
      if (calculationSuccess) {
        // Fetch the updated timecard with calculations
        const { data: updatedTimecard, error: fetchUpdatedError } = await supabase
          .from('timecard_headers')
          .select('*')
          .eq('id', result.id)
          .single()

        if (!fetchUpdatedError && updatedTimecard) {
          result = updatedTimecard
        }
      } else {
        console.warn('Failed to update timecard calculations for:', result.id)
      }
    }

    return NextResponse.json({ timecard: result })

  } catch (error) {
    console.error('API Error:', error)
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