export interface ShiftAlert {
  id: string
  user_id: string
  user_name: string
  project_id: string
  project_name: string
  shift_duration_hours: number
  alert_level: 'warning' | 'critical'
  check_in_time: string
}

export interface ShiftDurationSummary {
  user_id: string
  user_name: string
  role: string
  check_in_time: string
  duration_hours: number
  alert_level: 'none' | 'warning' | 'critical'
  project_name: string
}

export class ShiftTrackingService {
  constructor(private supabase: any) {}

  /**
   * Get all active shifts with duration calculations
   */
  async getActiveShiftsWithDuration(projectId?: string): Promise<ShiftDurationSummary[]> {
    const today = new Date().toISOString().split('T')[0]
    
    let query = this.supabase
      .from('shifts')
      .select(`
        id,
        user_id,
        project_id,
        check_in_time,
        status,
        profiles!inner(full_name),
        projects!inner(name),
        team_assignments!inner(
          role,
          project_roles(role)
        )
      `)
      .eq('shift_date', today)
      .eq('status', 'checked_in')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: shifts, error } = await query

    if (error) {
      throw new Error(`Failed to fetch active shifts: ${error.message}`)
    }

    const now = new Date()
    
    return (shifts || []).map(shift => {
      const checkInTime = new Date(shift.check_in_time)
      const durationHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
      
      let alertLevel: 'none' | 'warning' | 'critical' = 'none'
      if (durationHours >= 12) {
        alertLevel = 'critical'
      } else if (durationHours >= 8) {
        alertLevel = 'warning'
      }

      return {
        user_id: shift.user_id,
        user_name: shift.profiles.full_name,
        role: shift.team_assignments?.project_roles?.role || 'unknown',
        check_in_time: shift.check_in_time,
        duration_hours: durationHours,
        alert_level: alertLevel,
        project_name: shift.projects.name
      }
    })
  }

  /**
   * Get shifts that exceed duration thresholds
   */
  async getShiftAlerts(projectId?: string): Promise<ShiftAlert[]> {
    const shifts = await this.getActiveShiftsWithDuration(projectId)
    
    return shifts
      .filter(shift => shift.alert_level !== 'none')
      .map(shift => ({
        id: `${shift.user_id}-${shift.check_in_time}`,
        user_id: shift.user_id,
        user_name: shift.user_name,
        project_id: projectId || '',
        project_name: shift.project_name,
        shift_duration_hours: shift.duration_hours,
        alert_level: shift.alert_level as 'warning' | 'critical',
        check_in_time: shift.check_in_time
      }))
  }

  /**
   * Send notifications for shift duration alerts
   */
  async sendShiftAlertNotifications(projectId: string): Promise<void> {
    const alerts = await this.getShiftAlerts(projectId)
    
    // Group alerts by severity
    const criticalAlerts = alerts.filter(alert => alert.alert_level === 'critical')
    const warningAlerts = alerts.filter(alert => alert.alert_level === 'warning')

    // Get project administrators and supervisors
    const { data: projectTeam } = await this.supabase
      .from('team_assignments')
      .select(`
        user_id,
        role,
        profiles!inner(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .in('role', ['admin', 'in_house', 'supervisor'])

    if (!projectTeam || projectTeam.length === 0) {
      return
    }

    // Send notifications for critical alerts (12+ hours)
    if (criticalAlerts.length > 0) {
      for (const teamMember of projectTeam) {
        await this.createNotification({
          user_id: teamMember.user_id,
          title: 'Critical: Staff Overtime Alert',
          message: `${criticalAlerts.length} staff member(s) have worked 12+ hours and require immediate attention.`,
          type: 'shift_alert_critical',
          project_id: projectId
        })
      }
    }

    // Send notifications for warning alerts (8+ hours) - only to supervisors and above
    if (warningAlerts.length > 0) {
      const supervisors = projectTeam.filter(member => 
        ['admin', 'in_house', 'supervisor'].includes(member.role)
      )

      for (const supervisor of supervisors) {
        await this.createNotification({
          user_id: supervisor.user_id,
          title: 'Staff Overtime Warning',
          message: `${warningAlerts.length} staff member(s) have worked 8+ hours. Monitor for break compliance.`,
          type: 'shift_alert_warning',
          project_id: projectId
        })
      }
    }
  }

  /**
   * Create a notification record
   */
  private async createNotification(notification: {
    user_id: string
    title: string
    message: string
    type: string
    project_id: string
  }): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .insert([notification])

    if (error) {
      console.error('Failed to create notification:', error)
    }
  }

  /**
   * Get staff check-in status for a project
   */
  async getStaffCheckInStatus(projectId: string): Promise<{
    total: number
    checkedIn: number
    onBreak: number
    checkedOut: number
  }> {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: shifts } = await this.supabase
      .from('shifts')
      .select('status')
      .eq('project_id', projectId)
      .eq('shift_date', today)

    if (!shifts) {
      return { total: 0, checkedIn: 0, onBreak: 0, checkedOut: 0 }
    }

    const statusCounts = shifts.reduce((acc, shift) => {
      acc[shift.status] = (acc[shift.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: shifts.length,
      checkedIn: statusCounts.checked_in || 0,
      onBreak: statusCounts.on_break || 0,
      checkedOut: statusCounts.checked_out || 0
    }
  }

  /**
   * Calculate project KPIs for real-time dashboard
   */
  async calculateProjectKPIs(projectId: string): Promise<{
    staffStatus: {
      total: number
      checkedIn: number
      onBreak: number
      overtime: { warning: number; critical: number }
    }
    talentStatus: {
      expected: number
      present: number
      onLocation: number
      onBreak: number
    }
  }> {
    // Get staff status
    const staffStatus = await this.getStaffCheckInStatus(projectId)
    const shifts = await this.getActiveShiftsWithDuration(projectId)
    const overtimeWarning = shifts.filter(s => s.alert_level === 'warning').length
    const overtimeCritical = shifts.filter(s => s.alert_level === 'critical').length

    // Get talent status
    const { data: project } = await this.supabase
      .from('projects')
      .select('talent_expected')
      .eq('id', projectId)
      .single()

    const { data: talentStatus } = await this.supabase
      .from('talent_status')
      .select('status')
      .eq('project_id', projectId)

    const talentCounts = (talentStatus || []).reduce((acc, status) => {
      acc[status.status] = (acc[status.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      staffStatus: {
        total: staffStatus.total,
        checkedIn: staffStatus.checkedIn,
        onBreak: staffStatus.onBreak,
        overtime: {
          warning: overtimeWarning,
          critical: overtimeCritical
        }
      },
      talentStatus: {
        expected: project?.talent_expected || 0,
        present: (talentCounts.on_location || 0) + (talentCounts.on_break || 0),
        onLocation: talentCounts.on_location || 0,
        onBreak: talentCounts.on_break || 0
      }
    }
  }
}

// Factory function to create service with Supabase client
export function createShiftTrackingService(supabase: any) {
  return new ShiftTrackingService(supabase)
}