import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { withTimecardAuditLogging, type TimecardAuditContext } from '@/lib/timecard-audit-integration'
import { AuditLogService } from '@/lib/audit-log-service'
import { TIMECARD_HEADERS_SELECT } from '@/lib/timecard-columns'

export async function POST(request: NextRequest) {
  try {
    const { timecardId } = await request.json()

    if (!timecardId) {
      return NextResponse.json(
        { error: 'Timecard ID is required' },
        { status: 400 }
      )
    }

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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get timecard data for audit context
    const { data: timecard, error: fetchError } = await supabase
      .from('timecard_headers')
      .select(TIMECARD_HEADERS_SELECT)
      .eq('id', timecardId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !timecard) {
      return NextResponse.json(
        { error: 'Timecard not found or access denied' },
        { status: 404 }
      )
    }

    // Create audit context for submission (user edit)
    const auditContext: TimecardAuditContext = {
      timecardId,
      userId: user.id,
      actionType: 'user_edit',
      workDate: new Date(timecard.period_start_date)
    }

    // Update timecard status to submitted
    const { error } = await supabase
      .from('timecard_headers')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', timecardId)
      .eq('user_id', user.id) // Ensure user can only submit their own timecards

    if (error) {
      console.error('Error submitting timecard:', error)
      throw new Error('Failed to submit timecard')
    }

    // Create status change audit log entry
    try {
      const auditLogService = new AuditLogService(supabase)
      await auditLogService.logStatusChange(
        timecardId,
        timecard.status,
        'submitted',
        user.id
      )
    } catch (auditError) {
      console.error('Failed to create status change audit log:', auditError)
      // Don't fail the submission if audit logging fails, but log the error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in submit timecard API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}