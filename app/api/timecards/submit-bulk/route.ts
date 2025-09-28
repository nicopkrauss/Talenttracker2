import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { withTimecardAuditLogging, type TimecardAuditContext } from '@/lib/timecard-audit-integration'
import { TIMECARD_HEADERS_SELECT } from '@/lib/timecard-columns'

export async function POST(request: NextRequest) {
  try {
    const { timecardIds } = await request.json()

    if (!timecardIds || !Array.isArray(timecardIds) || timecardIds.length === 0) {
      return NextResponse.json(
        { error: 'Timecard IDs array is required' },
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
    const { data: timecards, error: fetchError } = await supabase
      .from('timecard_headers')
      .select(TIMECARD_HEADERS_SELECT)
      .in('id', timecardIds)
      .eq('user_id', user.id)

    if (fetchError || !timecards || timecards.length === 0) {
      return NextResponse.json(
        { error: 'Timecards not found or access denied' },
        { status: 404 }
      )
    }

    // Update each timecard with audit logging
    const updatePromises = timecards.map(async (timecard) => {
      const auditContext: TimecardAuditContext = {
        timecardId: timecard.id,
        userId: user.id,
        actionType: 'user_edit',
        workDate: new Date(timecard.period_start_date)
      }

      return withTimecardAuditLogging(
        supabase,
        auditContext,
        async () => {
          const { error } = await supabase
            .from('timecard_headers')
            .update({
              status: 'submitted',
              submitted_at: new Date().toISOString(),
            })
            .eq('id', timecard.id)
            .eq('user_id', user.id)

          if (error) {
            console.error(`Error submitting timecard ${timecard.id}:`, error)
            throw new Error(`Failed to submit timecard ${timecard.id}`)
          }

          return true
        }
      )
    })

    await Promise.all(updatePromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in bulk submit timecards API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}