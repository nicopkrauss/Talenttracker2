import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface LiveProjectData {
  talentLocations: TalentLocationStatus[]
  teamStatus: TeamMemberStatus[]
  kpis: {
    staffCheckedIn: number
    talentPresent: number
    activeEscorts: number
    staffOvertime: {
      over8Hours: number
      over12Hours: number
    }
  }
}

export interface TalentLocationStatus {
  id: string
  talent_id: string
  talent_name: string
  current_location?: string
  status: 'not_arrived' | 'on_location' | 'on_break' | 'departed'
  last_updated: string
  escort_name?: string
}

export interface TeamMemberStatus {
  id: string
  user_id: string
  user_name: string
  role: string
  check_in_time?: string
  shift_duration_hours?: number
  status: 'checked_out' | 'checked_in' | 'on_break'
  alert_level: 'none' | 'warning' | 'critical'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const projectId = id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Get talent location status
    const { data: talentStatus } = await supabase
      .from('talent_status')
      .select(`
        id,
        talent_id,
        status,
        last_updated,
        current_location_id,
        talent!inner(first_name, last_name),
        project_locations(name),
        talent_project_assignments!inner(
          escort_id,
          profiles(full_name)
        )
      `)
      .eq('project_id', projectId)

    const talentLocations: TalentLocationStatus[] = (talentStatus || []).map(status => ({
      id: status.id,
      talent_id: status.talent_id,
      talent_name: `${status.talent.first_name} ${status.talent.last_name}`,
      current_location: status.project_locations?.name,
      status: status.status,
      last_updated: status.last_updated,
      escort_name: status.talent_project_assignments?.profiles?.full_name
    }))

    // Get team member status
    const { data: teamShifts } = await supabase
      .from('shifts')
      .select(`
        id,
        user_id,
        check_in_time,
        check_out_time,
        status,
        profiles!inner(full_name),
        team_assignments!inner(
          role,
          project_roles(role)
        )
      `)
      .eq('project_id', projectId)
      .eq('shift_date', today)

    const now = new Date()
    const teamStatus: TeamMemberStatus[] = (teamShifts || []).map(shift => {
      let shiftDurationHours = 0
      let alertLevel: 'none' | 'warning' | 'critical' = 'none'

      if (shift.check_in_time && shift.status === 'checked_in') {
        const checkInTime = new Date(shift.check_in_time)
        shiftDurationHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
        
        if (shiftDurationHours >= 12) {
          alertLevel = 'critical'
        } else if (shiftDurationHours >= 8) {
          alertLevel = 'warning'
        }
      }

      return {
        id: shift.id,
        user_id: shift.user_id,
        user_name: shift.profiles.full_name,
        role: shift.team_assignments?.project_roles?.role || 'unknown',
        check_in_time: shift.check_in_time,
        shift_duration_hours: shiftDurationHours,
        status: shift.status,
        alert_level: alertLevel
      }
    })

    // Calculate KPIs
    const staffCheckedIn = teamStatus.filter(member => member.status === 'checked_in').length
    const talentPresent = talentLocations.filter(talent => 
      ['on_location', 'on_break'].includes(talent.status)
    ).length
    const activeEscorts = teamStatus.filter(member => 
      member.role === 'talent_escort' && member.status === 'checked_in'
    ).length
    const over8Hours = teamStatus.filter(member => 
      member.shift_duration_hours && member.shift_duration_hours > 8
    ).length
    const over12Hours = teamStatus.filter(member => 
      member.shift_duration_hours && member.shift_duration_hours > 12
    ).length

    const liveData: LiveProjectData = {
      talentLocations,
      teamStatus,
      kpis: {
        staffCheckedIn,
        talentPresent,
        activeEscorts,
        staffOvertime: {
          over8Hours,
          over12Hours
        }
      }
    }

    return NextResponse.json({ data: liveData })

  } catch (error) {
    console.error('Error fetching live project status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}