import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { canApproveTimecardsWithSettings } from '@/lib/role-utils'

const adminNotesSchema = z.object({
  timecardId: z.string().uuid(),
  adminNotes: z.string()
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
    const validationResult = adminNotesSchema.safeParse(body)
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

    const { timecardId, adminNotes } = validationResult.data

    // Check user permissions
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

    const canManageAdminNotes = canApproveTimecardsWithSettings(profile.role, globalSettings)
    
    if (!canManageAdminNotes) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage admin notes', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Validate timecard exists
    const { data: timecard, error: fetchError } = await supabase
      .from('timecard_headers')
      .select('id')
      .eq('id', timecardId)
      .single()

    if (fetchError || !timecard) {
      return NextResponse.json(
        { error: 'Timecard not found', code: 'TIMECARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Update admin notes
    const { error: updateError } = await supabase
      .from('timecard_headers')
      .update({
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', timecardId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update admin notes', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Admin notes updated successfully'
    })

  } catch (error) {
    console.error('Admin notes update error:', error)
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