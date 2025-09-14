import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const projectSettingsSchema = z.object({
  defaultBreakDuration: z.number().min(15).max(120),
  payrollExportFormat: z.enum(['csv', 'xlsx', 'pdf']),
  notificationRules: z.object({
    timecardReminders: z.boolean(),
    shiftAlerts: z.boolean(),
    talentArrivalNotifications: z.boolean(),
    overtimeWarnings: z.boolean(),
  }),
})

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
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get project settings
    const { data: settings, error: settingsError } = await supabase
      .from('project_settings')
      .select('*')
      .eq('project_id', id)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching project settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch settings', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Return default settings if none exist
    const defaultSettings = {
      projectId: id,
      defaultBreakDuration: 30,
      payrollExportFormat: 'csv',
      notificationRules: {
        timecardReminders: true,
        shiftAlerts: true,
        talentArrivalNotifications: false,
        overtimeWarnings: true,
      },
    }

    return NextResponse.json({
      data: settings || defaultSettings
    })
  } catch (error) {
    console.error('Settings API Error:', error)
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

    // Validate request data
    const body = await request.json()
    const validationResult = projectSettingsSchema.safeParse(body)
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

    const { defaultBreakDuration, payrollExportFormat, notificationRules } = validationResult.data

    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Upsert project settings
    const { data: settings, error: settingsError } = await supabase
      .from('project_settings')
      .upsert({
        project_id: id,
        default_break_duration: defaultBreakDuration,
        payroll_export_format: payrollExportFormat,
        notification_rules: notificationRules,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .select()
      .single()

    if (settingsError) {
      console.error('Error updating project settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to update settings', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    // Log the settings change
    await supabase
      .from('project_audit_log')
      .insert({
        project_id: id,
        user_id: user.id,
        action: 'settings_updated',
        details: {
          defaultBreakDuration,
          payrollExportFormat,
          notificationRules,
        },
        created_at: new Date().toISOString(),
      })

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('Settings Update API Error:', error)
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