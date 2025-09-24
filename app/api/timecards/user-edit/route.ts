import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    const { timecardId, edits, userNote } = await request.json()

    if (!timecardId) {
      return NextResponse.json(
        { error: 'Timecard ID is required', code: 'MISSING_TIMECARD_ID' },
        { status: 400 }
      )
    }

    // Get the timecard and verify ownership
    const { data: timecard, error: fetchError } = await supabase
      .from('timecard_headers')
      .select('*')
      .eq('id', timecardId)
      .eq('user_id', user.id) // Users can only edit their own timecards
      .single()

    if (fetchError || !timecard) {
      return NextResponse.json(
        { error: 'Timecard not found or access denied', code: 'TIMECARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Only allow editing of draft timecards
    if (timecard.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft timecards can be edited by users', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // Apply user edits
    const updateData = {
      ...edits,
      manually_edited: true, // Keep this for user edits
      edit_comments: userNote,
      last_edited_by: user.id,
      edit_type: 'user_correction',
      updated_at: new Date().toISOString(),
    }

    // Recalculate total_pay if pay_rate or total_hours changed
    if (edits.pay_rate !== undefined || edits.total_hours !== undefined) {
      const newPayRate = edits.pay_rate ?? timecard.pay_rate
      const newTotalHours = edits.total_hours ?? timecard.total_hours
      updateData.total_pay = newPayRate * newTotalHours
    }

    const { error: updateError } = await supabase
      .from('timecard_headers')
      .update(updateData)
      .eq('id', timecardId)

    if (updateError) {
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
    console.error('User edit error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}