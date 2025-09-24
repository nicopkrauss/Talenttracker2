import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Normalized Timecards API (v2)
 * 
 * This API handles the new normalized timecard structure with
 * timecard_headers and timecard_daily_entries tables.
 */

export async function GET(request: NextRequest) {
  try {
    // Use service role for testing to bypass authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return ''
          },
        },
      }
    )

    // Temporarily disable authentication for testing
    console.log('Using service role for timecard access (testing mode)')

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')
    const userId = searchParams.get('user_id')

    // Build query
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
        user:profiles!timecard_headers_user_id_fkey(full_name, email),
        project:projects!timecard_headers_project_id_fkey(name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: timecards, error } = await query

    if (error) {
      console.error('Error fetching timecards:', error)
      return NextResponse.json(
        { error: 'Failed to fetch timecards', code: 'FETCH_ERROR', details: error.message },
        { status: 500 }
      )
    }

    // Transform normalized structure for multi-day timecard display
    // Keep timecards grouped but add first day's details to the main record
    const processedTimecards = timecards.map(timecard => {
      if (timecard.daily_entries && timecard.daily_entries.length > 0) {
        // Sort daily entries by date
        const sortedEntries = timecard.daily_entries.sort((a, b) => 
          new Date(a.work_date).getTime() - new Date(b.work_date).getTime()
        )
        
        // Use first day's details for the main timecard display
        const firstDay = sortedEntries[0]
        const isMultiDay = sortedEntries.length > 1
        
        return {
          // Header fields
          id: timecard.id, // Keep original timecard ID
          user_id: timecard.user_id,
          project_id: timecard.project_id,
          status: timecard.status,
          submitted_at: timecard.submitted_at,
          approved_at: timecard.approved_at,
          approved_by: timecard.approved_by,
          rejection_reason: timecard.rejection_reason,
          created_at: timecard.created_at,
          updated_at: timecard.updated_at,
          pay_rate: timecard.pay_rate,
          admin_notes: timecard.admin_notes,
          
          // Period information
          period_start_date: timecard.period_start_date,
          period_end_date: timecard.period_end_date,
          
          // Totals for the entire timecard
          total_hours: timecard.total_hours || 0,
          total_break_duration: timecard.total_break_duration || 0,
          total_pay: timecard.total_pay || 0,
          
          // First day's details (for display)
          date: firstDay.work_date,
          check_in_time: firstDay.check_in_time ? `${firstDay.work_date}T${firstDay.check_in_time}` : null,
          check_out_time: firstDay.check_out_time ? `${firstDay.work_date}T${firstDay.check_out_time}` : null,
          break_start_time: firstDay.break_start_time ? `${firstDay.work_date}T${firstDay.break_start_time}` : null,
          break_end_time: firstDay.break_end_time ? `${firstDay.work_date}T${firstDay.break_end_time}` : null,
          
          // Multi-day information
          is_multi_day: isMultiDay,
          working_days: sortedEntries.length,
          
          // All daily entries for expansion
          daily_entries: sortedEntries.map(entry => ({
            work_date: entry.work_date,
            check_in_time: entry.check_in_time ? `${entry.work_date}T${entry.check_in_time}` : null,
            check_out_time: entry.check_out_time ? `${entry.work_date}T${entry.check_out_time}` : null,
            break_start_time: entry.break_start_time ? `${entry.work_date}T${entry.break_start_time}` : null,
            break_end_time: entry.break_end_time ? `${entry.work_date}T${entry.break_end_time}` : null,
            hours_worked: entry.hours_worked || 0,
            break_duration: entry.break_duration || 0,
            daily_pay: entry.daily_pay || 0
          })),
          
          // Default values for compatibility
          manually_edited: false,
          admin_edited: false,
          
          // Relations (renamed to match frontend expectations)
          profiles: timecard.user ? {
            full_name: timecard.user.full_name
          } : null,
          projects: timecard.project ? {
            name: timecard.project.name
          } : null
        }
      } else {
        // Handle timecards without daily entries (shouldn't happen, but for safety)
        return {
          id: timecard.id,
          user_id: timecard.user_id,
          project_id: timecard.project_id,
          status: timecard.status,
          date: timecard.period_start_date,
          total_hours: timecard.total_hours || 0,
          total_break_duration: timecard.total_break_duration || 0,
          total_pay: timecard.total_pay || 0,
          pay_rate: timecard.pay_rate || 0,
          manually_edited: false,
          admin_edited: false,
          created_at: timecard.created_at,
          updated_at: timecard.updated_at,
          is_multi_day: false,
          working_days: 1,
          daily_entries: [],
          profiles: timecard.user ? {
            full_name: timecard.user.full_name
          } : null,
          projects: timecard.project ? {
            name: timecard.project.name
          } : null
        }
      }
    })

    return NextResponse.json({ 
      data: processedTimecards,
      count: processedTimecards.length
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
    // Use service role for testing to bypass authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return ''
          },
        },
      }
    )

    // Temporarily disable authentication for testing
    console.log('Using service role for timecard creation (testing mode)')
    
    // Use first available user for testing
    const { data: users } = await supabase.from('profiles').select('id').limit(1)
    const user = users?.[0] || { id: 'test-user' }

    const body = await request.json()
    
    // Validate required fields
    const { 
      project_id, 
      period_start_date, 
      period_end_date, 
      pay_rate,
      daily_entries 
    } = body

    if (!project_id || !period_start_date || !period_end_date || !daily_entries || !Array.isArray(daily_entries)) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (daily_entries.length === 0) {
      return NextResponse.json(
        { error: 'At least one daily entry is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Calculate totals from daily entries
    const total_hours = daily_entries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0)
    const total_break_duration = daily_entries.reduce((sum, entry) => sum + (entry.break_duration || 0), 0)
    const total_pay = daily_entries.reduce((sum, entry) => sum + (entry.daily_pay || 0), 0)

    // Create timecard header
    const headerData = {
      user_id: user.id,
      project_id,
      period_start_date,
      period_end_date,
      total_hours,
      total_break_duration,
      total_pay,
      pay_rate: pay_rate || 0,
      admin_notes: body.admin_notes,
      status: 'draft'
    }

    const { data: header, error: headerError } = await supabase
      .from('timecard_headers')
      .insert(headerData)
      .select()
      .single()

    if (headerError) {
      console.error('Error creating timecard header:', headerError)
      return NextResponse.json(
        { error: 'Failed to create timecard', code: 'CREATE_ERROR', details: headerError.message },
        { status: 500 }
      )
    }

    // Create daily entries
    const entriesData = daily_entries.map(entry => ({
      timecard_header_id: header.id,
      work_date: entry.work_date,
      check_in_time: entry.check_in_time,
      check_out_time: entry.check_out_time,
      break_start_time: entry.break_start_time,
      break_end_time: entry.break_end_time,
      hours_worked: entry.hours_worked || 0,
      break_duration: entry.break_duration || 0,
      daily_pay: entry.daily_pay || 0
    }))

    const { data: entries, error: entriesError } = await supabase
      .from('timecard_daily_entries')
      .insert(entriesData)
      .select()

    if (entriesError) {
      console.error('Error creating daily entries:', entriesError)
      
      // Clean up header if entries failed
      await supabase
        .from('timecard_headers')
        .delete()
        .eq('id', header.id)

      return NextResponse.json(
        { error: 'Failed to create daily entries', code: 'CREATE_ERROR', details: entriesError.message },
        { status: 500 }
      )
    }

    // Return complete timecard with entries
    const completeTimecard = {
      ...header,
      daily_entries: entries.sort((a, b) => 
        new Date(a.work_date).getTime() - new Date(b.work_date).getTime()
      )
    }

    return NextResponse.json({ 
      data: completeTimecard,
      message: 'Timecard created successfully'
    }, { status: 201 })

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