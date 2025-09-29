import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { canApproveTimecards } from '@/lib/role-utils'
import { AuditLogService } from '@/lib/audit-log-service'

const rejectTimecardSchema = z.object({
  timecardId: z.string().uuid(),
  comments: z.string().min(1, 'Comments are required when rejecting a timecard'), // Requirement 5.4
  rejectedFields: z.array(z.string()).optional(), // Array of field names that were flagged
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

    const { timecardId, comments, rejectedFields } = validationResult.data

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

    // Get the current timecard data before updating for audit logging
    const { data: currentTimecard, error: currentError } = await supabase
      .from('timecard_headers')
      .select('*')
      .eq('id', timecardId)
      .single()

    if (currentError || !currentTimecard) {
      return NextResponse.json(
        { error: 'Failed to fetch current timecard data', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Update the timecard status to rejected
    const { error: updateError } = await supabase
      .from('timecard_headers')
      .update({
        status: 'rejected',
        rejection_reason: comments,
        rejected_fields: rejectedFields || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', timecardId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to reject timecard', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    // Log the rejection action in audit log
    try {
      const auditLogService = new AuditLogService(supabase)
      
      // Log status change using logStatusChange method (requirement 2.2, 3.3)
      await auditLogService.logStatusChange(
        timecardId,
        currentTimecard.status, // Should be 'submitted'
        'rejected',
        user.id
      )

      // Log other field changes using recordChanges
      const otherChanges = []
      if (comments && comments !== currentTimecard.rejection_reason) {
        otherChanges.push({
          fieldName: 'rejection_reason',
          oldValue: currentTimecard.rejection_reason,
          newValue: comments
        })
      }

      // Add rejected fields change if provided
      if (rejectedFields && rejectedFields.length > 0) {
        otherChanges.push({
          fieldName: 'rejected_fields',
          oldValue: currentTimecard.rejected_fields || [],
          newValue: rejectedFields
        })
      }

      // Record other field changes if any
      if (otherChanges.length > 0) {
        await auditLogService.recordChanges(
          timecardId,
          otherChanges,
          user.id,
          'rejection_edit', // Use rejection_edit to track rejection actions
          new Date(currentTimecard.period_start_date)
        )
      }
    } catch (auditError) {
      console.error('Failed to create audit log for rejection:', auditError)
      // Don't fail the rejection if audit logging fails, but log the error
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