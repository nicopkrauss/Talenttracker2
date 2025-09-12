import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createProjectScheduleFromStrings } from '@/lib/schedule-utils'

// GET /api/projects/[id]/schedule - Get calculated project schedule information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date, status')
      .eq('id', params.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Calculate project schedule
    try {
      const schedule = createProjectScheduleFromStrings(project.start_date, project.end_date)
      
      return NextResponse.json({
        data: {
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
          schedule: {
            startDate: schedule.startDate.toISOString(),
            endDate: schedule.endDate.toISOString(),
            isSingleDay: schedule.isSingleDay,
            rehearsalDates: schedule.rehearsalDates.map(date => date.toISOString()),
            showDates: schedule.showDates.map(date => date.toISOString()),
            allDates: schedule.allDates.map(date => date.toISOString()),
            totalDays: schedule.allDates.length,
            rehearsalDaysCount: schedule.rehearsalDates.length,
            showDaysCount: schedule.showDates.length
          }
        }
      })
    } catch (scheduleError) {
      console.error('Error calculating project schedule:', scheduleError)
      return NextResponse.json(
        { 
          error: 'Invalid project dates', 
          code: 'INVALID_DATES',
          details: scheduleError instanceof Error ? scheduleError.message : 'Unknown error'
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/schedule:', error)
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

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve project schedule.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve project schedule.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve project schedule.' },
    { status: 405 }
  )
}