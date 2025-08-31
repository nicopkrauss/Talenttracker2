import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProjectStatistics } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const projectId = params.id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, talent_expected')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get talent assignments count
    const { count: talentAssigned } = await supabase
      .from('talent_project_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'active')

    // Get team assignments count
    const { count: staffAssigned } = await supabase
      .from('team_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_active', true)

    // Get staff check-in status for today
    const today = new Date().toISOString().split('T')[0]
    const { count: staffCheckedIn } = await supabase
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('shift_date', today)
      .eq('status', 'checked_in')

    // Get talent presence count for today
    const { count: talentPresent } = await supabase
      .from('talent_status')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .in('status', ['on_location', 'on_break'])

    // Get active escorts count for today
    const { count: activeEscorts } = await supabase
      .from('shifts')
      .select(`
        *,
        profiles!inner(role)
      `, { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('shift_date', today)
      .eq('status', 'checked_in')
      .eq('profiles.role', 'talent_escort')

    // Calculate staff overtime (shifts over 8 and 12 hours)
    const { data: activeShifts } = await supabase
      .from('shifts')
      .select('check_in_time, check_out_time')
      .eq('project_id', projectId)
      .eq('shift_date', today)
      .eq('status', 'checked_in')

    let over8Hours = 0
    let over12Hours = 0

    if (activeShifts) {
      const now = new Date()
      activeShifts.forEach(shift => {
        if (shift.check_in_time) {
          const checkInTime = new Date(shift.check_in_time)
          const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
          
          if (hoursWorked > 8) over8Hours++
          if (hoursWorked > 12) over12Hours++
        }
      })
    }

    // Get project roles to calculate staff needed
    const { data: projectRoles } = await supabase
      .from('project_roles')
      .select('role')
      .eq('project_id', projectId)

    const staffNeeded = projectRoles?.length || 0

    const statistics: ProjectStatistics = {
      talentExpected: project.talent_expected || 0,
      talentAssigned: talentAssigned || 0,
      staffNeeded,
      staffAssigned: staffAssigned || 0,
      staffCheckedIn: staffCheckedIn || 0,
      talentPresent: talentPresent || 0,
      activeEscorts: activeEscorts || 0,
      staffOvertime: {
        over8Hours,
        over12Hours
      }
    }

    return NextResponse.json({ data: statistics })

  } catch (error) {
    console.error('Error fetching project statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}