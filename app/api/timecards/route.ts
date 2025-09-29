import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { canApproveTimecards } from '@/lib/role-utils'

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

    // Get user profile to check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const userId = url.searchParams.get('userId')
    const projectId = url.searchParams.get('project_id')

    // Check if user has approval permissions - simplified without system_settings
    const hasApprovalPermission = canApproveTimecards(profile.role)

    // Use timecard_headers table (the actual table name in the database)
    let query = supabase
      .from('timecard_headers')
      .select(`
        id,
        user_id,
        project_id,
        status,
        period_start_date,
        period_end_date,
        total_hours,
        total_break_duration,
        total_pay,
        pay_rate,
        created_at,
        updated_at,
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
        ),
        profiles:profiles!user_id(full_name),
        projects:projects!project_id(name)
      `)
      .order('created_at', { ascending: false })

    if (hasApprovalPermission) {
      // Users with approval permissions can see all timecards or filter by status
      if (status) {
        query = query.eq('status', status)
      }
      if (userId) {
        query = query.eq('user_id', userId)
      }
      if (projectId) {
        query = query.eq('project_id', projectId)
      }
    } else {
      // Regular users can only see their own timecards (requirement 6.4)
      query = query.eq('user_id', user.id)
      if (status) {
        query = query.eq('status', status)
      }
      if (projectId) {
        query = query.eq('project_id', projectId)
      }
    }

    const { data: timecards, error: fetchError } = await query

    if (fetchError) {
      console.error('Timecards query error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch timecards', code: 'FETCH_ERROR', details: fetchError.message },
        { status: 500 }
      )
    }

    // Process timecards - sort daily entries by date for each timecard
    const processedTimecards = (timecards || []).map(timecard => ({
      ...timecard,
      // Add compatibility fields for components expecting old structure
      date: timecard.period_start_date,
      break_duration: timecard.total_break_duration || 0,
      working_days: timecard.daily_entries?.length || 1,
      // Sort daily entries by date
      daily_entries: (timecard.daily_entries || []).sort((a, b) => 
        new Date(a.work_date).getTime() - new Date(b.work_date).getTime()
      )
    }))

    return NextResponse.json({
      timecards: processedTimecards,
      hasApprovalPermission,
      userRole: profile.role,
      count: processedTimecards.length
    })

  } catch (error) {
    console.error('Timecard fetch error:', error)
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