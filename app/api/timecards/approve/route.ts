import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { canApproveTimecards } from '@/lib/role-utils'

const approveTimecardSchema = z.object({
  timecardId: z.string().uuid(),
  comments: z.string().optional(),
})

const bulkApproveSchema = z.object({
  timecardIds: z.array(z.string().uuid()).min(1),
  comments: z.string().optional(),
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

    // Check if user has approval permissions
    const hasApprovalPermission = canApproveTimecards(profile.role) || 
      (profile.role === 'in_house' && globalSettings?.in_house_can_approve_timecards) ||
      (profile.role === 'supervisor' && globalSettings?.supervisor_can_approve_timecards) ||
      (profile.role === 'coordinator' && globalSettings?.coordinator_can_approve_timecards)

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve timecards', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const url = new URL(request.url)
    const isBulk = url.searchParams.get('bulk') === 'true'

    if (isBulk) {
      // Bulk approval
      const validationResult = bulkApproveSchema.safeParse(body)
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

      const { timecardIds, comments } = validationResult.data

      // Validate that all timecards exist and are in submitted status
      const { data: timecards, error: fetchError } = await supabase
        .from('timecard_headers')
        .select('id, status, manually_edited')
        .in('id', timecardIds)

      if (fetchError) {
        return NextResponse.json(
          { error: 'Failed to fetch timecards', code: 'FETCH_ERROR' },
          { status: 500 }
        )
      }

      // Validation checks before bulk approval (requirement 5.9)
      const invalidTimecards = timecards.filter(tc => tc.status !== 'submitted')
      if (invalidTimecards.length > 0) {
        return NextResponse.json(
          { 
            error: 'Some timecards are not in submitted status',
            code: 'INVALID_STATUS',
            details: { invalidIds: invalidTimecards.map(tc => tc.id) }
          },
          { status: 400 }
        )
      }

      // Check for manually edited timecards that might need special attention
      const manuallyEditedCount = timecards.filter(tc => tc.manually_edited).length
      
      // Bulk approve all valid timecards
      const { error: updateError } = await supabase
        .from('timecard_headers')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          edit_comments: comments || null,
        })
        .in('id', timecardIds)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to approve timecards', code: 'UPDATE_ERROR' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        approvedCount: timecardIds.length,
        manuallyEditedCount,
        message: `Successfully approved ${timecardIds.length} timecard(s)${manuallyEditedCount > 0 ? ` (${manuallyEditedCount} had manual edits)` : ''}`
      })

    } else {
      // Single approval
      const validationResult = approveTimecardSchema.safeParse(body)
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
        .select('id, status')
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

      // Approve the timecard
      const { error: updateError } = await supabase
        .from('timecard_headers')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          edit_comments: comments || null,
        })
        .eq('id', timecardId)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to approve timecard', code: 'UPDATE_ERROR' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Timecard approved successfully'
      })
    }

  } catch (error) {
    console.error('Timecard approval error:', error)
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