import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface GlobalSettings {
  breakDurations: {
    defaultEscortMinutes: number
    defaultStaffMinutes: number
  }
  timecardNotifications: {
    reminderFrequencyDays: number
    submissionOpensOnShowDay: boolean
  }
  shiftLimits: {
    maxHoursBeforeStop: number
    overtimeWarningHours: number
  }
  systemSettings: {
    archiveDate: {
      month: number
      day: number
    }
    postShowTransitionTime: string
  }
}

interface RolePermissions {
  inHouse: {
    canApproveTimecards: boolean
    canInitiateCheckout: boolean
    canManageProjects: boolean
  }
  supervisor: {
    canApproveTimecards: boolean
    canInitiateCheckout: boolean
  }
  coordinator: {
    canApproveTimecards: boolean
    canInitiateCheckout: boolean
  }
}

interface GlobalSettingsRow {
  id: string
  default_escort_break_minutes: number
  default_staff_break_minutes: number
  timecard_reminder_frequency_days: number
  submission_opens_on_show_day: boolean
  max_hours_before_stop: number
  overtime_warning_hours: number
  archive_date_month: number
  archive_date_day: number
  post_show_transition_time: string | Date
  in_house_can_approve_timecards: boolean
  in_house_can_initiate_checkout: boolean
  in_house_can_manage_projects: boolean
  supervisor_can_approve_timecards: boolean
  supervisor_can_initiate_checkout: boolean
  coordinator_can_approve_timecards: boolean
  coordinator_can_initiate_checkout: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

// Function to convert database row to API format
function convertRowToApiFormat(row: GlobalSettingsRow): { settings: GlobalSettings; permissions: RolePermissions } {
  return {
    settings: {
      breakDurations: {
        defaultEscortMinutes: row.default_escort_break_minutes,
        defaultStaffMinutes: row.default_staff_break_minutes
      },
      timecardNotifications: {
        reminderFrequencyDays: row.timecard_reminder_frequency_days,
        submissionOpensOnShowDay: row.submission_opens_on_show_day
      },
      shiftLimits: {
        maxHoursBeforeStop: row.max_hours_before_stop,
        overtimeWarningHours: row.overtime_warning_hours
      },
      systemSettings: {
        archiveDate: {
          month: row.archive_date_month,
          day: row.archive_date_day
        },
        postShowTransitionTime: typeof row.post_show_transition_time === 'string' 
          ? row.post_show_transition_time 
          : row.post_show_transition_time.toTimeString().slice(0, 5)
      }
    },
    permissions: {
      inHouse: {
        canApproveTimecards: row.in_house_can_approve_timecards,
        canInitiateCheckout: row.in_house_can_initiate_checkout,
        canManageProjects: row.in_house_can_manage_projects
      },
      supervisor: {
        canApproveTimecards: row.supervisor_can_approve_timecards,
        canInitiateCheckout: row.supervisor_can_initiate_checkout
      },
      coordinator: {
        canApproveTimecards: row.coordinator_can_approve_timecards,
        canInitiateCheckout: row.coordinator_can_initiate_checkout
      }
    }
  }
}

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function GET() {
  try {
    const supabase = await createSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Get global settings from global_settings table
    const { data: settingsRow, error: settingsError } = await supabase
      .from('global_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch settings', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Convert database row to API format
    const { settings, permissions } = convertRowToApiFormat(settingsRow)

    return NextResponse.json({
      data: {
        settings,
        permissions
      }
    })

  } catch (error) {
    console.error('Global settings GET error:', error)
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
    const supabase = await createSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { settings, permissions } = body

    if (!settings || !permissions) {
      return NextResponse.json(
        { error: 'Missing settings or permissions data', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate settings structure
    if (!settings.breakDurations || !settings.timecardNotifications || 
        !settings.shiftLimits || !settings.systemSettings) {
      return NextResponse.json(
        { error: 'Invalid settings structure', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Convert API format to database columns
    const updateData = {
      default_escort_break_minutes: settings.breakDurations.defaultEscortMinutes,
      default_staff_break_minutes: settings.breakDurations.defaultStaffMinutes,
      timecard_reminder_frequency_days: settings.timecardNotifications.reminderFrequencyDays,
      submission_opens_on_show_day: settings.timecardNotifications.submissionOpensOnShowDay,
      max_hours_before_stop: settings.shiftLimits.maxHoursBeforeStop,
      overtime_warning_hours: settings.shiftLimits.overtimeWarningHours,
      archive_date_month: settings.systemSettings.archiveDate.month,
      archive_date_day: settings.systemSettings.archiveDate.day,
      post_show_transition_time: settings.systemSettings.postShowTransitionTime,
      in_house_can_approve_timecards: permissions.inHouse.canApproveTimecards,
      in_house_can_initiate_checkout: permissions.inHouse.canInitiateCheckout,
      in_house_can_manage_projects: permissions.inHouse.canManageProjects,
      supervisor_can_approve_timecards: permissions.supervisor.canApproveTimecards,
      supervisor_can_initiate_checkout: permissions.supervisor.canInitiateCheckout,
      coordinator_can_approve_timecards: permissions.coordinator.canApproveTimecards,
      coordinator_can_initiate_checkout: permissions.coordinator.canInitiateCheckout,
      updated_by: user.id
    }

    // Update global settings
    const { error: updateError } = await supabase
      .from('global_settings')
      .update(updateData)
      .eq('id', '00000000-0000-0000-0000-000000000001')

    if (updateError) {
      console.error('Error updating global settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update global settings', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Global settings updated successfully',
      data: {
        settings,
        permissions
      }
    })

  } catch (error) {
    console.error('Global settings PUT error:', error)
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