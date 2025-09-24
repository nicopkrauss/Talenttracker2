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

    // Get global settings to check role-based permissions
    const { data: globalSettingsArray } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
    
    const globalSettings = globalSettingsArray && globalSettingsArray.length > 0 ? globalSettingsArray[0] : null

    // Check if user has approval permissions (requirement 6.1-6.6)
    const hasApprovalPermission = canApproveTimecards(profile.role) || 
      (profile.role === 'in_house' && globalSettings?.in_house_can_approve_timecards) ||
      (profile.role === 'supervisor' && globalSettings?.supervisor_can_approve_timecards) ||
      (profile.role === 'coordinator' && globalSettings?.coordinator_can_approve_timecards)

    // Use normalized structure: timecard_headers with daily_entries
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
        admin_notes,
        submitted_at,
        approved_at,
        approved_by,
        rejection_reason,
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
        user_profile:profiles!user_id(full_name),
        project_info:projects!project_id(name)
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
    } else {
      // Regular users can only see their own timecards (requirement 6.4)
      query = query.eq('user_id', user.id)
      if (status) {
        query = query.eq('status', status)
      }
    }

    const { data: timecards, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch timecards', code: 'FETCH_ERROR', details: fetchError.message },
        { status: 500 }
      )
    }

    // Sort daily entries by date for each timecard
    const processedTimecards = (timecards || []).map(timecard => ({
      ...timecard,
      daily_entries: timecard.daily_entries.sort((a, b) => 
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