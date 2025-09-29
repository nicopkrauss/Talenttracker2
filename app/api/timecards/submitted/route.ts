import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Simple API to fetch submitted timecards for approval
 * This is a fallback that works with whatever timecard table structure exists
 */
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
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get user profile for role-based access
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 403 }
      )
    }

    if (userProfile.status !== 'active') {
      return NextResponse.json(
        { error: 'Account not active', code: 'ACCOUNT_NOT_ACTIVE' },
        { status: 403 }
      )
    }

    // Check if user has approval permissions
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'in_house'
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view submitted timecards', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    // Use timecard_headers (normalized structure)
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
        rejection_reason,
        rejected_fields,
        manually_edited,
        edit_comments,
        admin_edited,
        last_edited_by,
        edit_type,
        created_at,
        updated_at,
        timecard_daily_entries(
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
        profiles!timecard_headers_user_id_fkey(full_name, email),
        projects!timecard_headers_project_id_fkey(name)
      `)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: timecards, error } = await query

    if (error) {
      console.error('Error fetching submitted timecards:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch submitted timecards', 
          code: 'DATABASE_ERROR',
          details: error.message
        },
        { status: 500 }
      )
    }

    console.log('Found', timecards?.length || 0, 'submitted timecards')

    // Transform data to consistent format for the frontend
    const processedTimecards = (timecards || []).map(timecard => {
      // New structure with daily entries
      const dailyEntries = timecard.timecard_daily_entries || []
      const sortedEntries = dailyEntries.sort((a: any, b: any) => 
        new Date(a.work_date).getTime() - new Date(b.work_date).getTime()
      )
      
      const firstDay = sortedEntries[0]
      const isMultiDay = sortedEntries.length > 1

      return {
        id: timecard.id,
        user_id: timecard.user_id,
        project_id: timecard.project_id,
        status: timecard.status,
        submitted_at: timecard.submitted_at,
        rejection_reason: timecard.rejection_reason,
        rejected_fields: timecard.rejected_fields,
        manually_edited: timecard.manually_edited,
        edit_comments: timecard.edit_comments,
        admin_edited: timecard.admin_edited,
        last_edited_by: timecard.last_edited_by,
        edit_type: timecard.edit_type,
        created_at: timecard.created_at,
        updated_at: timecard.updated_at,
        pay_rate: timecard.pay_rate,
        admin_notes: timecard.admin_notes,
        
        // Period information
        period_start_date: timecard.period_start_date,
        period_end_date: timecard.period_end_date,
        
        // Totals
        total_hours: timecard.total_hours || 0,
        total_break_duration: timecard.total_break_duration || 0,
        total_pay: timecard.total_pay || 0,
        
        // First day's details for display
        date: firstDay?.work_date || timecard.period_start_date,
        check_in_time: firstDay?.check_in_time ? `${firstDay.work_date}T${firstDay.check_in_time}` : null,
        check_out_time: firstDay?.check_out_time ? `${firstDay.work_date}T${firstDay.check_out_time}` : null,
        break_start_time: firstDay?.break_start_time ? `${firstDay.work_date}T${firstDay.break_start_time}` : null,
        break_end_time: firstDay?.break_end_time ? `${firstDay.work_date}T${firstDay.break_end_time}` : null,
        
        // Multi-day information
        is_multi_day: isMultiDay,
        working_days: sortedEntries.length,
        daily_entries: sortedEntries,
        
        // Relations
        profiles: timecard.profiles,
        projects: timecard.projects
      }
    })

    return NextResponse.json({ 
      data: processedTimecards,
      count: processedTimecards.length,
      structure: 'normalized'
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