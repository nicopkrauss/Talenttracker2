import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { canApproveTimecardsWithSettings } from '@/lib/role-utils'

const editTimecardSchema = z.object({
  timecardId: z.string().uuid(),
  updates: z.object({
    check_in_time: z.string().nullable().optional(),
    check_out_time: z.string().nullable().optional(),
    break_start_time: z.string().nullable().optional(),
    break_end_time: z.string().nullable().optional(),
    total_hours: z.number().min(0).optional(),
    break_duration: z.number().min(0).optional(),
    total_pay: z.number().min(0).optional(),
    manually_edited: z.boolean().optional(),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  }),
  adminNote: z.string().optional(), // For private admin notes (admin_notes field)
  editComment: z.string().optional(), // For user-facing edit explanations (edit_comments field)
  returnToDraft: z.boolean().optional(), // Flag for "Edit & Return" action
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

    // Parse request body
    const body = await request.json()
    const validationResult = editTimecardSchema.safeParse(body)
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

    const { timecardId, updates, adminNote, editComment, returnToDraft } = validationResult.data

    // Validate timecard exists and get current data
    const { data: timecard, error: fetchError } = await supabase
      .from('timecard_headers')
      .select('*')
      .eq('id', timecardId)
      .single()

    if (fetchError || !timecard) {
      return NextResponse.json(
        { error: 'Timecard not found', code: 'TIMECARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check permissions
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

    // Get global settings for permission check
    const { data: globalSettings } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single()

    const canApprove = canApproveTimecardsWithSettings(profile.role, globalSettings)
    const isOwner = user.id === timecard.user_id

    // Permission checks based on action type
    if (returnToDraft) {
      // "Edit & Return" action - only approvers can return submitted timecards to draft
      if (!canApprove) {
        return NextResponse.json(
          { error: 'Insufficient permissions to return timecard to draft', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        )
      }
      if (timecard.status !== 'submitted') {
        return NextResponse.json(
          { error: 'Only submitted timecards can be returned to draft', code: 'INVALID_STATUS' },
          { status: 400 }
        )
      }
    } else {
      // Regular editing - only allow editing draft timecards
      if (timecard.status !== 'draft') {
        return NextResponse.json(
          { error: 'Only draft timecards can be edited', code: 'INVALID_STATUS' },
          { status: 400 }
        )
      }
      if (!isOwner && !canApprove) {
        return NextResponse.json(
          { error: 'Insufficient permissions to edit this timecard', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // Handle "Edit & Return" action
    if (returnToDraft) {
      updateData.status = 'draft'
      updateData.admin_edited = true
      updateData.last_edited_by = user.id
      updateData.submitted_at = null // Clear submission timestamp
      
      // For "Edit & Return", use editComment for user-facing feedback
      if (editComment) {
        updateData.edit_comments = editComment
      }
      
      // Admin notes are separate and private
      if (adminNote) {
        updateData.admin_notes = adminNote
      }
    } else {
      // Regular edit handling
      
      // Handle user-facing edit comments
      if (editComment) {
        updateData.edit_comments = editComment
      }
      
      // Handle private admin notes (only for authorized users)
      if (adminNote && canApprove) {
        updateData.admin_notes = adminNote
      }

      // If admin is editing someone else's timecard, mark as admin edited
      if (!isOwner && canApprove) {
        updateData.admin_edited = true
        updateData.last_edited_by = user.id
        updateData.edit_type = 'admin_adjustment'
      } else if (isOwner) {
        updateData.edit_type = 'user_correction'
      }
    }

    // Apply the updates
    const { error: updateError } = await supabase
      .from('timecard_headers')
      .update(updateData)
      .eq('id', timecardId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update timecard', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Timecard updated successfully'
    })

  } catch (error) {
    console.error('Timecard edit error:', error)
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