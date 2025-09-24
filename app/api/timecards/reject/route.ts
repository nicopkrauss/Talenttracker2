import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { canApproveTimecards } from '@/lib/role-utils'

const rejectTimecardSchema = z.object({
  timecardId: z.string().uuid(),
  comments: z.string().min(1, 'Comments are required when rejecting a timecard'), // Requirement 5.4
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

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to reject timecards', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate request data with required comments (requirement 5.4)
    const validationResult = rejectTimecardSchema.safeParse(body)
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

    const { timecardId, comments } = validationResult.data

    // Validate timecard exists and is in submitted status
    const { data: timecard, error: fetchError } = await supabase
      .from('timecard_headers')
      .select('id, status, user_id')
      .eq('id', timecardId)
      .single()

    if (fetchError || !timecard) {
      return NextResponse.json(
        { error: 'Timecard not found', code: 'TIMECARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (timecard.status !== 'submitted') {
      return NextResponse.json(
        { error: 'Timecard is not in submitted status', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // Reject the timecard
    const { error: updateError } = await supabase
      .from('timecard_headers')
      .update({
        status: 'rejected',
        edit_comments: comments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', timecardId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to reject timecard', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    // TODO: Send notification to user about rejection (requirement 5.6)
    // This would integrate with the notification system when implemented

    return NextResponse.json({
      success: true,
      message: 'Timecard rejected successfully'
    })

  } catch (error) {
    console.error('Timecard rejection error:', error)
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