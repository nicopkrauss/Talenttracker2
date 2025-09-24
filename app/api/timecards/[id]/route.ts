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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch timecard with related data
    const { data: timecard, error } = await supabase
      .from('timecard_headers')
      .select(`
        *,
        profiles:user_id(full_name),
        projects:project_id(name),
        daily_entries:timecard_daily_entries(
          id,
          work_date,
          check_in_time,
          check_out_time,
          break_start_time,
          break_end_time,
          hours_worked,
          break_duration,
          daily_pay
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching timecard:', error)
      return NextResponse.json(
        { error: 'Timecard not found' },
        { status: 404 }
      )
    }

    if (!timecard) {
      return NextResponse.json(
        { error: 'Timecard not found' },
        { status: 404 }
      )
    }

    // Transform the data to match the expected format
    const transformedTimecard = {
      ...timecard,
      // Set the date field from period_start_date for compatibility
      date: timecard.period_start_date,
      user_name: Array.isArray(timecard.profiles) 
        ? timecard.profiles[0]?.full_name || 'Unknown User'
        : timecard.profiles?.full_name || 'Unknown User',
      project_name: Array.isArray(timecard.projects)
        ? timecard.projects[0]?.name || 'Unknown Project'
        : timecard.projects?.name || 'Unknown Project'
      // daily_entries is already included from the select query
    }

    return NextResponse.json({ timecard: transformedTimecard })
  } catch (error) {
    console.error('Error in timecard API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}