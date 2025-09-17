import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface PhaseConfiguration {
  // Current state
  currentPhase: string
  phaseUpdatedAt: string | null
  
  // Project-level configuration
  autoTransitionsEnabled: boolean
  timezone: string | null
  rehearsalStartDate: string | null
  showEndDate: string | null
  
  // Settings-level configuration
  archiveMonth: number
  archiveDay: number
  postShowTransitionHour: number
}

export interface PhaseConfigurationUpdate {
  autoTransitionsEnabled?: boolean
  timezone?: string
  rehearsalStartDate?: string
  showEndDate?: string
  archiveMonth?: number
  archiveDay?: number
  postShowTransitionHour?: number
}

export class PhaseConfigurationService {
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
   * Get default phase configuration values
   */
  static getDefaults(): Partial<PhaseConfiguration> {
    return {
      autoTransitionsEnabled: true,
      archiveMonth: 4,
      archiveDay: 1,
      postShowTransitionHour: 6,
    }
  }

  /**
   * Get phase configuration for a project
   */
  async getConfiguration(projectId: string): Promise<PhaseConfiguration> {
    // Get project data
    const { data: project, error: projectError } = await this.supabase
      .from('projects')
      .select(`
        id, 
        name,
        status,
        auto_transitions_enabled,
        timezone,
        rehearsal_start_date,
        show_end_date,
        phase_updated_at
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // Get project settings
    const { data: settings, error: settingsError } = await this.supabase
      .from('project_settings')
      .select(`
        auto_transitions_enabled,
        archive_month,
        archive_day,
        post_show_transition_hour
      `)
      .eq('project_id', projectId)
      .single()

    // Ignore not found errors for settings
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.warn('Error fetching project settings:', settingsError)
    }

    const defaults = PhaseConfigurationService.getDefaults()

    // Combine project and settings data with fallback to defaults
    return {
      currentPhase: project.status,
      phaseUpdatedAt: project.phase_updated_at,
      autoTransitionsEnabled: project.auto_transitions_enabled ?? settings?.auto_transitions_enabled ?? defaults.autoTransitionsEnabled!,
      timezone: project.timezone,
      rehearsalStartDate: project.rehearsal_start_date,
      showEndDate: project.show_end_date,
      archiveMonth: settings?.archive_month ?? defaults.archiveMonth!,
      archiveDay: settings?.archive_day ?? defaults.archiveDay!,
      postShowTransitionHour: settings?.post_show_transition_hour ?? defaults.postShowTransitionHour!,
    }
  }

  /**
   * Update phase configuration for a project
   */
  async updateConfiguration(
    projectId: string, 
    updates: PhaseConfigurationUpdate,
    userId: string
  ): Promise<PhaseConfiguration> {
    // Validate the updates
    this.validateConfiguration(updates)

    // Check if project exists
    const { data: project, error: projectError } = await this.supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // Separate project-level and settings-level updates
    const projectUpdates: any = {}
    const settingsUpdates: any = {}

    if (updates.autoTransitionsEnabled !== undefined) {
      projectUpdates.auto_transitions_enabled = updates.autoTransitionsEnabled
      settingsUpdates.auto_transitions_enabled = updates.autoTransitionsEnabled
    }
    if (updates.timezone !== undefined) {
      projectUpdates.timezone = updates.timezone
    }
    if (updates.rehearsalStartDate !== undefined) {
      projectUpdates.rehearsal_start_date = updates.rehearsalStartDate
    }
    if (updates.showEndDate !== undefined) {
      projectUpdates.show_end_date = updates.showEndDate
    }
    if (updates.archiveMonth !== undefined) {
      settingsUpdates.archive_month = updates.archiveMonth
    }
    if (updates.archiveDay !== undefined) {
      settingsUpdates.archive_day = updates.archiveDay
    }
    if (updates.postShowTransitionHour !== undefined) {
      settingsUpdates.post_show_transition_hour = updates.postShowTransitionHour
    }

    // Update project if needed
    if (Object.keys(projectUpdates).length > 0) {
      const { error: projectUpdateError } = await this.supabase
        .from('projects')
        .update(projectUpdates)
        .eq('id', projectId)

      if (projectUpdateError) {
        throw new Error(`Failed to update project configuration: ${projectUpdateError.message}`)
      }
    }

    // Update settings if needed
    if (Object.keys(settingsUpdates).length > 0) {
      settingsUpdates.updated_at = new Date().toISOString()
      settingsUpdates.updated_by = userId

      const { error: settingsUpdateError } = await this.supabase
        .from('project_settings')
        .upsert({
          project_id: projectId,
          ...settingsUpdates
        })

      if (settingsUpdateError) {
        throw new Error(`Failed to update settings configuration: ${settingsUpdateError.message}`)
      }
    }

    // Log the configuration change
    await this.logConfigurationChange(projectId, userId, { projectUpdates, settingsUpdates })

    // Return updated configuration
    return this.getConfiguration(projectId)
  }

  /**
   * Validate phase configuration values
   */
  private validateConfiguration(config: PhaseConfigurationUpdate): void {
    // Validate archive date combination
    if (config.archiveMonth !== undefined && config.archiveDay !== undefined) {
      try {
        const testDate = new Date(2024, config.archiveMonth - 1, config.archiveDay)
        if (testDate.getMonth() !== config.archiveMonth - 1 || testDate.getDate() !== config.archiveDay) {
          throw new Error('Invalid archive date combination')
        }
      } catch (error) {
        throw new Error('Invalid archive date combination')
      }
    }

    // Validate individual archive values
    if (config.archiveMonth !== undefined && (config.archiveMonth < 1 || config.archiveMonth > 12)) {
      throw new Error('Archive month must be between 1 and 12')
    }

    if (config.archiveDay !== undefined && (config.archiveDay < 1 || config.archiveDay > 31)) {
      throw new Error('Archive day must be between 1 and 31')
    }

    if (config.postShowTransitionHour !== undefined && (config.postShowTransitionHour < 0 || config.postShowTransitionHour > 23)) {
      throw new Error('Post-show transition hour must be between 0 and 23')
    }

    // Validate date strings
    if (config.rehearsalStartDate !== undefined && config.rehearsalStartDate !== null) {
      const date = new Date(config.rehearsalStartDate)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid rehearsal start date format')
      }
    }

    if (config.showEndDate !== undefined && config.showEndDate !== null) {
      const date = new Date(config.showEndDate)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid show end date format')
      }
    }

    // Validate timezone
    if (config.timezone !== undefined && config.timezone !== null) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: config.timezone })
      } catch (error) {
        throw new Error('Invalid timezone identifier')
      }
    }
  }

  /**
   * Log configuration changes to audit log
   */
  private async logConfigurationChange(
    projectId: string, 
    userId: string, 
    changes: { projectUpdates: any; settingsUpdates: any }
  ): Promise<void> {
    try {
      await this.supabase
        .from('project_audit_log')
        .insert({
          project_id: projectId,
          user_id: userId,
          action: 'phase_configuration_updated',
          details: {
            ...changes,
            updatedBy: userId,
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString(),
        })
    } catch (error) {
      console.error('Failed to log configuration change:', error)
      // Don't throw - logging failure shouldn't break the update
    }
  }

  /**
   * Get system-wide default configuration for new projects
   */
  async getSystemDefaults(): Promise<Partial<PhaseConfiguration>> {
    // This could be extended to fetch from a system settings table
    // For now, return hardcoded defaults
    return PhaseConfigurationService.getDefaults()
  }

  /**
   * Apply default configuration to a new project
   */
  async applyDefaultsToProject(projectId: string, userId: string): Promise<void> {
    const defaults = await this.getSystemDefaults()

    const settingsData = {
      project_id: projectId,
      auto_transitions_enabled: defaults.autoTransitionsEnabled,
      archive_month: defaults.archiveMonth,
      archive_day: defaults.archiveDay,
      post_show_transition_hour: defaults.postShowTransitionHour,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }

    const { error } = await this.supabase
      .from('project_settings')
      .insert(settingsData)

    if (error) {
      console.error('Failed to apply default configuration:', error)
      // Don't throw - this is a nice-to-have, not critical
    }
  }

  /**
   * Check if automatic transitions are enabled for a project
   */
  async isAutoTransitionsEnabled(projectId: string): Promise<boolean> {
    const config = await this.getConfiguration(projectId)
    return config.autoTransitionsEnabled
  }

  /**
   * Get the next scheduled transition time for a project
   */
  async getNextTransitionTime(projectId: string): Promise<Date | null> {
    const config = await this.getConfiguration(projectId)
    
    if (!config.autoTransitionsEnabled) {
      return null
    }

    const timezone = config.timezone || 'UTC'
    const currentPhase = config.currentPhase

    switch (currentPhase) {
      case 'pre_show':
        if (config.rehearsalStartDate) {
          // Transition to active at midnight on rehearsal start date
          const rehearsalDate = new Date(config.rehearsalStartDate + 'T00:00:00')
          return this.convertToTimezone(rehearsalDate, timezone)
        }
        break

      case 'active':
        if (config.showEndDate) {
          // Transition to post_show at configured hour after show end date
          const showEndDate = new Date(config.showEndDate)
          showEndDate.setDate(showEndDate.getDate() + 1) // Next day
          showEndDate.setHours(config.postShowTransitionHour, 0, 0, 0)
          return this.convertToTimezone(showEndDate, timezone)
        }
        break

      case 'complete':
      case 'completed':
        // Transition to archived on archive date
        const now = new Date()
        const currentYear = now.getFullYear()
        const archiveYear = now.getMonth() >= config.archiveMonth - 1 && now.getDate() >= config.archiveDay 
          ? currentYear + 1 
          : currentYear
        
        const archiveDate = new Date(archiveYear, config.archiveMonth - 1, config.archiveDay)
        return this.convertToTimezone(archiveDate, timezone)

      default:
        return null
    }

    return null
  }

  /**
   * Convert date to specified timezone
   */
  private convertToTimezone(date: Date, timezone: string): Date {
    try {
      // This is a simplified conversion - in production you might want to use a library like date-fns-tz
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
}