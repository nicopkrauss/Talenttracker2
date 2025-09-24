import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    // Update timecard status to submitted for all provided IDs
    const { error } = await supabase
      .from('timecard_headers')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .in('id', timecardIds)
      .eq('user_id', user.id) // Ensure user can only submit their own timecards

    if (error) {
      console.error('Error submitting timecards:', error)
      return NextResponse.json(
        { error: 'Failed to submit timecards' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in bulk submit timecards API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}