import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const phaseConfigurationSchema = z.object({
  autoTransitionsEnabled: z.boolean(),
  archiveMonth: z.number().min(1).max(12),
  archiveDay: z.number().min(1).max(31),
  postShowTransitionHour: z.number().min(0).max(23),
  // Project-level overrides
  location: z.string().optional(),
  timezone: z.string().optional(),
})

const phaseConfigurationUpdateSchema = phaseConfigurationSchema.partial()

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id, 
        name,
        status,
        location,
        auto_transitions_enabled,
        timezone,
        rehearsal_start_date,
        show_end_date,
        phase_updated_at
      `)
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get project settings for defaults
    const { data: settings, error: settingsError } = await supabase
      .from('project_settings')
      .select(`
        auto_transitions_enabled,
        archive_month,
        archive_day,
        post_show_transition_hour
      `)
      .eq('project_id', id)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching project settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch configuration', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Get derived dates from assignments
    const { data: assignments } = await supabase
      .from('talent_daily_assignments')
      .select('assignment_date')
      .eq('project_id', id)
      .order('assignment_date', { ascending: true })

    const assignmentDates = assignments 
      ? [...new Set(assignments.map(a => a.assignment_date))].sort()
      : []

    const rehearsalStartDate = assignmentDates.length > 0 ? assignmentDates[0] : null
    const showEndDate = assignmentDates.length > 0 ? assignmentDates[assignmentDates.length - 1] : null

    // Combine project and settings data with defaults
    const configuration = {
      // Project-level configuration
      currentPhase: project.status,
      phaseUpdatedAt: project.phase_updated_at,
      autoTransitionsEnabled: project.auto_transitions_enabled ?? settings?.auto_transitions_enabled ?? true,
      location: project.location,
      timezone: project.timezone,
      rehearsalStartDate,
      showEndDate,
      
      // Settings-level configuration with defaults
      archiveMonth: settings?.archive_month ?? 4,
      archiveDay: settings?.archive_day ?? 1,
      postShowTransitionHour: settings?.post_show_transition_hour ?? 6,
    }

    return NextResponse.json({ data: configuration })
  } catch (error) {
    console.error('Phase Configuration API Error:', error)
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

export async function PUT(
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user has admin access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['admin', 'in_house'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Validate request data
    const body = await request.json()
    const validationResult = phaseConfigurationUpdateSchema.safeParse(body)
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

    const {
      autoTransitionsEnabled,
      archiveMonth,
      archiveDay,
      postShowTransitionHour,
      location,
      timezone
    } = validationResult.data

    // Validate archive date combination
    if (archiveMonth !== undefined && archiveDay !== undefined) {
      try {
        // Test if the date is valid
        new Date(2024, archiveMonth - 1, archiveDay)
        if (archiveDay > 31 || (archiveMonth === 2 && archiveDay > 29)) {
          return NextResponse.json(
            { 
              error: 'Invalid archive date combination',
              code: 'INVALID_DATE',
              details: 'Archive day is invalid for the specified month'
            },
            { status: 400 }
          )
        }
      } catch (error) {
        return NextResponse.json(
          { 
            error: 'Invalid archive date',
            code: 'INVALID_DATE',
            details: 'Archive month and day combination is invalid'
          },
          { status: 400 }
        )
      }
    }

    // Auto-determine timezone from location if provided
    let finalTimezone = timezone
    if (location && !timezone) {
      try {
        const { LocationTimezoneService } = await import('@/lib/services/location-timezone-service')
        finalTimezone = LocationTimezoneService.getTimezoneFromLocation(location)
      } catch (error) {
        console.warn('Failed to import LocationTimezoneService:', error)
      }
    }

    // Validate timezone if provided
    if (finalTimezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: finalTimezone })
      } catch (error) {
        return NextResponse.json(
          { 
            error: 'Invalid timezone',
            code: 'INVALID_TIMEZONE',
            details: 'Timezone must be a valid IANA timezone identifier'
          },
          { status: 400 }
        )
      }
    }

    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Update project-level configuration
    const projectUpdates: any = {}
    if (autoTransitionsEnabled !== undefined) {
      projectUpdates.auto_transitions_enabled = autoTransitionsEnabled
    }
    if (location !== undefined) {
      projectUpdates.location = location
    }
    if (finalTimezone !== undefined) {
      projectUpdates.timezone = finalTimezone
    }

    if (Object.keys(projectUpdates).length > 0) {
      const { error: projectUpdateError } = await supabase
        .from('projects')
        .update(projectUpdates)
        .eq('id', id)

      if (projectUpdateError) {
        console.error('Error updating project configuration:', projectUpdateError)
        return NextResponse.json(
          { error: 'Failed to update project configuration', code: 'UPDATE_ERROR' },
          { status: 500 }
        )
      }
    }

    // Update settings-level configuration
    const settingsUpdates: any = {}
    if (autoTransitionsEnabled !== undefined) {
      settingsUpdates.auto_transitions_enabled = autoTransitionsEnabled
    }
    if (archiveMonth !== undefined) {
      settingsUpdates.archive_month = archiveMonth
    }
    if (archiveDay !== undefined) {
      settingsUpdates.archive_day = archiveDay
    }
    if (postShowTransitionHour !== undefined) {
      settingsUpdates.post_show_transition_hour = postShowTransitionHour
    }

    if (Object.keys(settingsUpdates).length > 0) {
      settingsUpdates.updated_at = new Date().toISOString()
      settingsUpdates.updated_by = user.id

      const { error: settingsUpdateError } = await supabase
        .from('project_settings')
        .upsert({
          project_id: id,
          ...settingsUpdates
        })

      if (settingsUpdateError) {
        console.error('Error updating project settings:', settingsUpdateError)
        return NextResponse.json(
          { error: 'Failed to update settings configuration', code: 'UPDATE_ERROR' },
          { status: 500 }
        )
      }
    }

    // Log the configuration change
    await supabase
      .from('project_audit_log')
      .insert({
        project_id: id,
        user_id: user.id,
        action: 'phase_configuration_updated',
        details: {
          projectUpdates,
          settingsUpdates,
          updatedBy: user.id,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
      })

    // Fetch updated configuration to return
    const { data: updatedProject } = await supabase
      .from('projects')
      .select(`
        id, 
        name,
        status,
        location,
        auto_transitions_enabled,
        timezone,
        phase_updated_at
      `)
      .eq('id', id)
      .single()

    const { data: updatedSettings } = await supabase
      .from('project_settings')
      .select(`
        auto_transitions_enabled,
        archive_month,
        archive_day,
        post_show_transition_hour
      `)
      .eq('project_id', id)
      .single()

    // Get updated derived dates
    const { data: updatedAssignments } = await supabase
      .from('talent_daily_assignments')
      .select('assignment_date')
      .eq('project_id', id)
      .order('assignment_date', { ascending: true })

    const updatedAssignmentDates = updatedAssignments 
      ? [...new Set(updatedAssignments.map(a => a.assignment_date))].sort()
      : []

    const updatedRehearsalStartDate = updatedAssignmentDates.length > 0 ? updatedAssignmentDates[0] : null
    const updatedShowEndDate = updatedAssignmentDates.length > 0 ? updatedAssignmentDates[updatedAssignmentDates.length - 1] : null

    const updatedConfiguration = {
      currentPhase: updatedProject?.status,
      phaseUpdatedAt: updatedProject?.phase_updated_at,
      autoTransitionsEnabled: updatedProject?.auto_transitions_enabled ?? updatedSettings?.auto_transitions_enabled ?? true,
      location: updatedProject?.location,
      timezone: updatedProject?.timezone,
      rehearsalStartDate: updatedRehearsalStartDate,
      showEndDate: updatedShowEndDate,
      archiveMonth: updatedSettings?.archive_month ?? 4,
      archiveDay: updatedSettings?.archive_day ?? 1,
      postShowTransitionHour: updatedSettings?.post_show_transition_hour ?? 6,
    }

    return NextResponse.json({ data: updatedConfiguration })
  } catch (error) {
    console.error('Phase Configuration Update API Error:', error)
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