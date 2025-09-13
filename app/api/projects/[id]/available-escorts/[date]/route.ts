import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { EscortAvailabilityStatus } from '@/lib/types'
import { createProjectScheduleFromStrings, getDayType } from '@/lib/schedule-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
) {
  try {
    const { id: projectId, date: dateStr } = await params
    
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

    // Validate date format
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format', code: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    // Check project access and get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Create project schedule to determine day type
    const projectSchedule = createProjectScheduleFromStrings(project.start_date, project.end_date)
    const dayType = getDayType(date, projectSchedule)

    if (dayType === 'outside_project') {
      return NextResponse.json(
        { error: 'Date is outside project range', code: 'DATE_OUT_OF_RANGE' },
        { status: 400 }
      )
    }

    // Get all confirmed team members (escorts) for this project
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_assignments')
      .select(`
        id,
        user_id,
        role,
        available_dates,
        profiles:user_id (
          id,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .not('available_dates', 'is', null)

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return NextResponse.json(
        { error: 'Failed to fetch team members', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Get current assignments for the specific date from unified daily assignments system
    const { data: talentDailyAssignments, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select(`
        escort_id,
        assignment_date,
        talent:talent_id (
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .eq('assignment_date', dateStr)
      .not('escort_id', 'is', null)

    if (talentError) {
      console.error('Error fetching talent daily assignments:', talentError)
    }

    const { data: groupDailyAssignments, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select(`
        escort_id,
        assignment_date,
        group:group_id (
          group_name
        )
      `)
      .eq('project_id', projectId)
      .eq('assignment_date', dateStr)
      .not('escort_id', 'is', null)

    if (groupError) {
      console.error('Error fetching group daily assignments:', groupError)
    }

    // Build escort availability status
    const escorts: EscortAvailabilityStatus[] = []

    if (teamMembers) {
      for (const member of teamMembers) {
        // Check if escort is available on the requested date
        const isAvailableOnDate = member.available_dates?.includes(dateStr)
        if (!isAvailableOnDate) continue

        // Check current assignments for this escort
        let currentAssignment: { talentName: string; date: Date } | undefined
        let section: 'available' | 'rehearsal_assigned' | 'current_day_assigned' = 'available'

        // Check talent daily assignments for current date
        if (talentDailyAssignments) {
          for (const assignment of talentDailyAssignments) {
            if (assignment.escort_id === member.user_id) {
              section = 'current_day_assigned'
              currentAssignment = {
                talentName: `${assignment.talent?.first_name || ''} ${assignment.talent?.last_name || ''}`.trim(),
                date: new Date(assignment.assignment_date + 'T00:00:00')
              }
              break
            }
          }
        }

        // Check group daily assignments for current date (only if not already assigned to talent)
        if (section === 'available' && groupDailyAssignments) {
          for (const assignment of groupDailyAssignments) {
            if (assignment.escort_id === member.user_id) {
              section = 'current_day_assigned'
              currentAssignment = {
                talentName: assignment.group?.group_name || 'Unknown Group',
                date: new Date(assignment.assignment_date + 'T00:00:00')
              }
              break
            }
          }
        }

        // If still available and this is a rehearsal day, check for other rehearsal assignments
        if (section === 'available' && dayType === 'rehearsal') {
          // Get all assignments for this escort on other dates to check for rehearsal conflicts
          const { data: otherTalentAssignments } = await supabase
            .from('talent_daily_assignments')
            .select(`
              assignment_date,
              talent:talent_id (
                first_name,
                last_name
              )
            `)
            .eq('project_id', projectId)
            .eq('escort_id', member.user_id)
            .neq('assignment_date', dateStr)

          if (otherTalentAssignments) {
            for (const assignment of otherTalentAssignments) {
              const assignedDate = new Date(assignment.assignment_date + 'T00:00:00')
              const assignedDayType = getDayType(assignedDate, projectSchedule)
              if (assignedDayType === 'rehearsal') {
                section = 'rehearsal_assigned'
                currentAssignment = {
                  talentName: `${assignment.talent?.first_name || ''} ${assignment.talent?.last_name || ''}`.trim(),
                  date: assignedDate
                }
                break
              }
            }
          }

          // Check group assignments for rehearsal conflicts if still available
          if (section === 'available') {
            const { data: otherGroupAssignments } = await supabase
              .from('group_daily_assignments')
              .select(`
                assignment_date,
                group:group_id (
                  group_name
                )
              `)
              .eq('project_id', projectId)
              .eq('escort_id', member.user_id)
              .neq('assignment_date', dateStr)

            if (otherGroupAssignments) {
              for (const assignment of otherGroupAssignments) {
                const assignedDate = new Date(assignment.assignment_date + 'T00:00:00')
                const assignedDayType = getDayType(assignedDate, projectSchedule)
                if (assignedDayType === 'rehearsal') {
                  section = 'rehearsal_assigned'
                  currentAssignment = {
                    talentName: assignment.group?.group_name || 'Unknown Group',
                    date: assignedDate
                  }
                  break
                }
              }
            }
          }
        }

        escorts.push({
          escortId: member.user_id,
          escortName: member.profiles.full_name,
          section,
          currentAssignment
        })
      }
    }

    return NextResponse.json({
      data: {
        date: dateStr,
        dayType,
        escorts
      }
    })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/available-escorts/[date]:', error)
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