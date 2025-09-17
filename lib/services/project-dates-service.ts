import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface ProjectDates {
  projectStartDate: string | null // Start of rehearsals
  projectEndDate: string | null   // Show day (last day)
  rehearsalStartDate: string | null // Same as projectStartDate
  showEndDate: string | null       // Same as projectEndDate
  allAssignmentDates: string[]     // For reference only
  hasAssignments: boolean          // For reference only
}

export class ProjectDatesService {
  private supabase

  constructor() {
    const cookieStore = cookies()
    this.supabase = createServerClient(
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
  }

  /**
   * Get comprehensive project dates including derived rehearsal and show dates
   */
  async getProjectDates(projectId: string): Promise<ProjectDates> {
    // Get project basic dates
    const { data: project, error: projectError } = await this.supabase
      .from('projects')
      .select('start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // Get all assignment dates for this project (for reference only)
    const { data: assignments, error: assignmentsError } = await this.supabase
      .from('talent_daily_assignments')
      .select('assignment_date')
      .eq('project_id', projectId)
      .order('assignment_date', { ascending: true })

    if (assignmentsError) {
      console.warn('Error fetching assignment dates:', assignmentsError)
    }

    // Extract unique assignment dates
    const assignmentDates = assignments 
      ? [...new Set(assignments.map(a => a.assignment_date))].sort()
      : []

    // Use project dates directly: start_date = rehearsal start, end_date = show day
    const rehearsalStartDate = project.start_date
    const showEndDate = project.end_date

    return {
      projectStartDate: project.start_date,
      projectEndDate: project.end_date,
      rehearsalStartDate,
      showEndDate,
      allAssignmentDates: assignmentDates,
      hasAssignments: assignmentDates.length > 0
    }
  }

  /**
   * Get the next transition date based on current phase and project dates
   */
  async getNextTransitionDate(projectId: string, currentPhase: string, timezone: string = 'UTC'): Promise<Date | null> {
    const dates = await this.getProjectDates(projectId)

    switch (currentPhase) {
      case 'pre_show':
        if (dates.projectStartDate) {
          // Transition to active at midnight on project start date (rehearsal start)
          const rehearsalDate = new Date(dates.projectStartDate + 'T00:00:00')
          return this.convertToTimezone(rehearsalDate, timezone)
        }
        break

      case 'active':
        if (dates.projectEndDate) {
          // Transition to post_show at 6:00 AM the day after project end date (show day)
          const showEndDate = new Date(dates.projectEndDate)
          showEndDate.setDate(showEndDate.getDate() + 1) // Next day
          showEndDate.setHours(6, 0, 0, 0) // 6:00 AM
          return this.convertToTimezone(showEndDate, timezone)
        }
        break

      case 'complete':
      case 'completed':
        // This would be handled by archive configuration
        // Return null as it's not date-based
        return null

      default:
        return null
    }

    return null
  }

  /**
   * Check if project has scheduling conflicts with automatic transitions
   */
  async validateTransitionDates(projectId: string): Promise<{
    isValid: boolean
    warnings: string[]
    errors: string[]
  }> {
    const dates = await this.getProjectDates(projectId)
    const warnings: string[] = []
    const errors: string[] = []

    // Check if we have required project dates
    if (!dates.projectStartDate) {
      errors.push('Project start date is required for automatic transitions.')
    }

    if (!dates.projectEndDate) {
      errors.push('Project end date is required for automatic transitions.')
    }

    // Check for reasonable date ranges
    if (dates.projectStartDate && dates.projectEndDate) {
      const projectStart = new Date(dates.projectStartDate)
      const projectEnd = new Date(dates.projectEndDate)
      const daysDiff = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff < 0) {
        errors.push('Project end date is before project start date.')
      } else if (daysDiff > 365) {
        warnings.push('Project spans more than a year. This may affect automatic archiving.')
      } else if (daysDiff === 0) {
        warnings.push('Project starts and ends on the same day. Consider if this is correct.')
      }
    }

    // Optional: Check if assignment dates align with project dates
    if (dates.hasAssignments && dates.allAssignmentDates.length > 0) {
      const firstAssignment = dates.allAssignmentDates[0]
      const lastAssignment = dates.allAssignmentDates[dates.allAssignmentDates.length - 1]

      if (dates.projectStartDate && firstAssignment < dates.projectStartDate) {
        warnings.push('Some talent assignments are scheduled before project start date.')
      }

      if (dates.projectEndDate && lastAssignment > dates.projectEndDate) {
        warnings.push('Some talent assignments are scheduled after project end date.')
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }

  /**
   * Get a summary of project timeline for display
   */
  async getProjectTimeline(projectId: string): Promise<{
    phase: string
    description: string
    startDate: string | null
    endDate: string | null
    daysRemaining?: number
  }[]> {
    const dates = await this.getProjectDates(projectId)
    const timeline: Array<{
      phase: string
      description: string
      startDate: string | null
      endDate: string | null
      daysRemaining?: number
    }> = []

    // Pre-show phase (before project start)
    timeline.push({
      phase: 'prep',
      description: 'Project preparation and setup',
      startDate: null, // Open-ended start
      endDate: dates.projectStartDate ? this.subtractDays(dates.projectStartDate, 1) : null
    })

    // Active phase (project start to end - includes rehearsals and show)
    if (dates.projectStartDate && dates.projectEndDate) {
      const projectStart = new Date(dates.projectStartDate)
      const projectEnd = new Date(dates.projectEndDate)
      const daysDiff = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === 0) {
        // Single day project
        timeline.push({
          phase: 'active',
          description: 'Show day',
          startDate: dates.projectStartDate,
          endDate: dates.projectEndDate
        })
      } else {
        // Multi-day project: rehearsals + show
        timeline.push({
          phase: 'active',
          description: `Rehearsals (${daysDiff} day${daysDiff > 1 ? 's' : ''})`,
          startDate: dates.projectStartDate,
          endDate: this.subtractDays(dates.projectEndDate, 1)
        })

        timeline.push({
          phase: 'active',
          description: 'Show day',
          startDate: dates.projectEndDate,
          endDate: dates.projectEndDate
        })
      }
    }

    // Post-show phase
    if (dates.projectEndDate) {
      timeline.push({
        phase: 'post_show',
        description: 'Post-show wrap-up',
        startDate: this.addDays(dates.projectEndDate, 1),
        endDate: null // Open-ended until archive
      })
    }

    // Calculate days remaining for current/upcoming phases
    const today = new Date()
    timeline.forEach(phase => {
      if (phase.startDate) {
        const startDate = new Date(phase.startDate)
        if (startDate > today) {
          phase.daysRemaining = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }
      }
    })

    return timeline
  }

  /**
   * Convert date to specified timezone
   */
  private convertToTimezone(date: Date, timezone: string): Date {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      const parts = formatter.formatToParts(date)
      const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
      const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1
      const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
      const second = parseInt(parts.find(p => p.type === 'second')?.value || '0')
      
      return new Date(year, month, day, hour, minute, second)
    } catch (error) {
      console.warn('Timezone conversion failed, using UTC:', error)
      return date
    }
  }

  /**
   * Add days to a date string
   */
  private addDays(dateString: string, days: number): string {
    const date = new Date(dateString)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  /**
   * Subtract days from a date string
   */
  private subtractDays(dateString: string, days: number): string {
    const date = new Date(dateString)
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  /**
   * Update project timezone based on location
   */
  async updateProjectTimezoneFromLocation(projectId: string, location: string): Promise<string | null> {
    const { LocationTimezoneService } = await import('./location-timezone-service')
    const timezone = LocationTimezoneService.getTimezoneFromLocation(location)

    if (timezone) {
      const { error } = await this.supabase
        .from('projects')
        .update({ timezone })
        .eq('id', projectId)

      if (error) {
        throw new Error(`Failed to update project timezone: ${error.message}`)
      }
    }

    return timezone
  }
}