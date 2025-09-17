import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { TimezoneService } from './timezone-service'
import { ProjectPhase, TransitionResult, PhaseConfiguration } from '../types/project-phase'

export enum TransitionTrigger {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled'
}



export interface PhaseTransitionLog {
  id: string
  projectId: string
  fromPhase: ProjectPhase
  toPhase: ProjectPhase
  trigger: TransitionTrigger
  triggeredBy?: string
  reason?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ActionItem {
  id: string
  title: string
  description: string
  category: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  requiredForTransition: boolean
}

/**
 * Core Phase Engine Service
 * Manages project lifecycle phases, transitions, and validation
 */
export class PhaseEngine {
  private supabase: any

  constructor() {
    // Initialize Supabase client for server-side operations
    this.supabase = null
  }

  private async getSupabaseClient() {
    if (!this.supabase) {
      const cookieStore = await cookies()
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
    return this.supabase
  }

  /**
   * Get the current phase of a project
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
   */
  async getCurrentPhase(projectId: string): Promise<ProjectPhase> {
    try {
      const supabase = await this.getSupabaseClient()
      
      const { data: project, error } = await supabase
        .from('projects')
        .select('status, phase_updated_at, auto_transitions_enabled')
        .eq('id', projectId)
        .single()

      if (error) {
        throw new Error(`Failed to get project phase: ${error.message}`)
      }

      if (!project) {
        throw new Error(`Project ${projectId} not found`)
      }

      // Return current status as phase (leveraging existing project_status enum)
      return project.status as ProjectPhase
    } catch (error) {
      console.error('Error getting current phase:', error)
      throw error
    }
  }

  /**
   * Evaluate if a project can transition to the next phase
   * Requirements: 1.2, 1.3, 1.4, 1.5, 4.4, 4.5
   */
  async evaluateTransition(projectId: string): Promise<TransitionResult> {
    try {
      const currentPhase = await this.getCurrentPhase(projectId)
      const supabase = await this.getSupabaseClient()

      // Get project details for transition evaluation
      const { data: project, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_setup_checklist(*),
          project_settings(*)
        `)
        .eq('id', projectId)
        .single()

      if (error || !project) {
        return {
          canTransition: false,
          targetPhase: null,
          blockers: ['Project not found or inaccessible']
        }
      }

      // Evaluate transition based on current phase
      switch (currentPhase) {
        case ProjectPhase.PREP:
          return await this.evaluatePrepToStaffing(projectId, project)
        
        case ProjectPhase.STAFFING:
          return await this.evaluateStaffingToPreShow(projectId, project)
        
        case ProjectPhase.PRE_SHOW:
          return await this.evaluatePreShowToActive(projectId, project)
        
        case ProjectPhase.ACTIVE:
          return await this.evaluateActiveToPostShow(projectId, project)
        
        case ProjectPhase.POST_SHOW:
          return await this.evaluatePostShowToComplete(projectId, project)
        
        case ProjectPhase.COMPLETE:
          return await this.evaluateCompleteToArchived(projectId, project)
        
        case ProjectPhase.ARCHIVED:
          return {
            canTransition: false,
            targetPhase: null,
            blockers: ['Project is already archived']
          }
        
        default:
          return {
            canTransition: false,
            targetPhase: null,
            blockers: ['Unknown phase state']
          }
      }
    } catch (error) {
      console.error('Error evaluating transition:', error)
      return {
        canTransition: false,
        targetPhase: null,
        blockers: [`Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * Execute a phase transition with atomic operations
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.4, 4.5
   */
  async executeTransition(
    projectId: string, 
    targetPhase: ProjectPhase, 
    trigger: TransitionTrigger,
    triggeredBy?: string,
    reason?: string
  ): Promise<void> {
    const supabase = await this.getSupabaseClient()
    
    try {
      // Start transaction
      const currentPhase = await this.getCurrentPhase(projectId)
      
      // Validate transition is allowed
      const evaluation = await this.evaluateTransition(projectId)
      if (!evaluation.canTransition || evaluation.targetPhase !== targetPhase) {
        throw new Error(`Transition not allowed: ${evaluation.blockers.join(', ')}`)
      }

      // Execute atomic update
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          status: targetPhase,
          phase_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (updateError) {
        throw new Error(`Failed to update project phase: ${updateError.message}`)
      }

      // Log the transition using existing audit_log table
      await this.logTransition(projectId, currentPhase, targetPhase, trigger, triggeredBy, reason)

      console.log(`Project ${projectId} transitioned from ${currentPhase} to ${targetPhase}`)
    } catch (error) {
      console.error('Error executing transition:', error)
      throw error
    }
  }

  /**
   * Log phase transition to audit trail
   * Requirements: 4.4, 4.5
   */
  private async logTransition(
    projectId: string,
    fromPhase: ProjectPhase,
    toPhase: ProjectPhase,
    trigger: TransitionTrigger,
    triggeredBy?: string,
    reason?: string
  ): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient()
      
      // Use existing project_audit_log table for phase transitions
      const { error } = await supabase
        .from('project_audit_log')
        .insert({
          project_id: projectId,
          action: 'phase_transition',
          details: {
            from_phase: fromPhase,
            to_phase: toPhase,
            trigger: trigger,
            triggered_by: triggeredBy,
            reason: reason,
            timestamp: new Date().toISOString()
          },
          user_id: triggeredBy,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to log phase transition:', error)
        // Don't throw here - transition should succeed even if logging fails
      }
    } catch (error) {
      console.error('Error logging transition:', error)
      // Don't throw here - transition should succeed even if logging fails
    }
  }

  /**
   * Get phase-specific action items using existing readiness data
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
   */
  async getPhaseActionItems(projectId: string, phase?: ProjectPhase): Promise<ActionItem[]> {
    try {
      const currentPhase = phase || await this.getCurrentPhase(projectId)
      const supabase = await this.getSupabaseClient()

      // Get project readiness data to generate action items
      let readiness = null
      try {
        const { data: readinessData, error: readinessError } = await supabase
          .from('project_readiness')
          .select('*')
          .eq('project_id', projectId)
          .single()

        if (readinessError && readinessError.code === 'PGRST116') {
          // Create readiness record if it doesn't exist
          const { data: newReadiness, error: createError } = await supabase
            .from('project_readiness')
            .insert({ project_id: projectId })
            .select('*')
            .single()

          if (createError) {
            console.error('Error creating project readiness:', createError)
            // Use default readiness data
            readiness = this.getDefaultReadinessData(projectId)
          } else {
            readiness = newReadiness
          }
        } else if (readinessError) {
          console.error('Error fetching project readiness:', readinessError)
          // Use default readiness data
          readiness = this.getDefaultReadinessData(projectId)
        } else {
          readiness = readinessData
        }
      } catch (error) {
        console.error('Error with readiness data:', error)
        readiness = this.getDefaultReadinessData(projectId)
      }

      // Get additional project data for context
      let project = null
      try {
        const { data: projectData } = await supabase
          .from('projects')
          .select(`
            name,
            status,
            rehearsal_start_date,
            show_end_date,
            project_settings(*)
          `)
          .eq('id', projectId)
          .single()
        
        project = projectData
      } catch (error) {
        console.error('Error fetching project data:', error)
        // Use minimal project data
        project = { name: 'Unknown Project', status: currentPhase }
      }

      // Generate phase-specific action items based on current phase and readiness data
      switch (currentPhase) {
        case ProjectPhase.PREP:
          return this.generatePrepActionItems(projectId, readiness, project)
        
        case ProjectPhase.STAFFING:
          return this.generateStaffingActionItems(projectId, readiness, project)
        
        case ProjectPhase.PRE_SHOW:
          return this.generatePreShowActionItems(projectId, readiness, project)
        
        case ProjectPhase.ACTIVE:
          return this.generateActiveActionItems(projectId, readiness, project)
        
        case ProjectPhase.POST_SHOW:
          return this.generatePostShowActionItems(projectId, readiness, project)
        
        case ProjectPhase.COMPLETE:
          return this.generateCompleteActionItems(projectId, readiness, project)
        
        case ProjectPhase.ARCHIVED:
          return [] // No action items for archived projects
        
        default:
          return []
      }
    } catch (error) {
      console.error('Error getting phase action items:', error)
      return []
    }
  }

  // Private methods for phase transition evaluation
  private async evaluatePrepToStaffing(projectId: string, project: any): Promise<TransitionResult> {
    const blockers: string[] = []
    
    // Check vital project information completion
    if (!project.project_setup_checklist?.roles_finalized) {
      blockers.push('Project roles must be finalized')
    }
    
    if (!project.project_setup_checklist?.locations_finalized) {
      blockers.push('Project locations must be defined')
    }

    if (!project.name || project.name.trim() === '') {
      blockers.push('Project name is required')
    }

    return {
      canTransition: blockers.length === 0,
      targetPhase: blockers.length === 0 ? ProjectPhase.STAFFING : null,
      blockers,
      reason: 'Vital project information must be complete'
    }
  }

  private async evaluateStaffingToPreShow(projectId: string, project: any): Promise<TransitionResult> {
    const blockers: string[] = []
    
    // Check staffing completion
    if (!project.project_setup_checklist?.team_assignments_finalized) {
      blockers.push('Team assignments must be complete')
    }
    
    if (!project.project_setup_checklist?.talent_roster_finalized) {
      blockers.push('Talent roster must be finalized')
    }

    return {
      canTransition: blockers.length === 0,
      targetPhase: blockers.length === 0 ? ProjectPhase.PRE_SHOW : null,
      blockers,
      reason: 'Staffing and talent assignment must be complete'
    }
  }

  private async evaluatePreShowToActive(projectId: string, project: any): Promise<TransitionResult> {
    const blockers: string[] = []
    
    // Check if rehearsal start date has arrived (midnight local time)
    if (!project.rehearsal_start_date) {
      blockers.push('Rehearsal start date must be set')
    } else {
      // Get project timezone for accurate transition calculation
      const timezone = TimezoneService.getProjectTimezone(project)
      const now = TimezoneService.getCurrentTimeInTimezone(timezone)
      
      // Calculate transition time (midnight in project timezone)
      const rehearsalStart = TimezoneService.calculateTransitionTime(
        new Date(project.rehearsal_start_date),
        '00:00',
        timezone
      )
      
      if (now < rehearsalStart) {
        const scheduledAt = rehearsalStart
        return {
          canTransition: false,
          targetPhase: ProjectPhase.ACTIVE,
          blockers: [`Scheduled to activate at ${TimezoneService.formatInTimezone(rehearsalStart, timezone)}`],
          scheduledAt,
          reason: 'Waiting for rehearsal start date'
        }
      }
    }

    return {
      canTransition: blockers.length === 0,
      targetPhase: blockers.length === 0 ? ProjectPhase.ACTIVE : null,
      blockers,
      reason: 'Rehearsal start time has arrived'
    }
  }

  private async evaluateActiveToPostShow(projectId: string, project: any): Promise<TransitionResult> {
    const blockers: string[] = []
    
    // Check if show end date has passed (6AM local time next day)
    if (!project.show_end_date) {
      blockers.push('Show end date must be set')
    } else {
      // Get project timezone and post-show transition time setting
      const timezone = TimezoneService.getProjectTimezone(project)
      const postShowHour = project.project_settings?.post_show_transition_hour || 6
      const now = TimezoneService.getCurrentTimeInTimezone(timezone)
      
      // Calculate transition time (6AM day after show end in project timezone)
      const showEndDate = new Date(project.show_end_date)
      showEndDate.setDate(showEndDate.getDate() + 1) // Next day
      
      const postShowTransition = TimezoneService.calculateTransitionTime(
        showEndDate,
        `${postShowHour.toString().padStart(2, '0')}:00`,
        timezone
      )
      
      if (now < postShowTransition) {
        const scheduledAt = postShowTransition
        return {
          canTransition: false,
          targetPhase: ProjectPhase.POST_SHOW,
          blockers: [`Scheduled to transition at ${TimezoneService.formatInTimezone(postShowTransition, timezone)}`],
          scheduledAt,
          reason: 'Waiting for post-show transition time'
        }
      }
    }

    return {
      canTransition: blockers.length === 0,
      targetPhase: blockers.length === 0 ? ProjectPhase.POST_SHOW : null,
      blockers,
      reason: 'Show has ended'
    }
  }

  private async evaluatePostShowToComplete(projectId: string, project: any): Promise<TransitionResult> {
    const blockers: string[] = []
    
    // Check if all timecards are approved and paid
    const supabase = await this.getSupabaseClient()
    
    const { data: pendingTimecards } = await supabase
      .from('timecards')
      .select('id')
      .eq('project_id', projectId)
      .neq('status', 'approved')

    if (pendingTimecards && pendingTimecards.length > 0) {
      blockers.push(`${pendingTimecards.length} timecards pending approval`)
    }

    return {
      canTransition: blockers.length === 0,
      targetPhase: blockers.length === 0 ? ProjectPhase.COMPLETE : null,
      blockers,
      reason: 'All timecards must be approved and paid'
    }
  }

  private async evaluateCompleteToArchived(projectId: string, project: any): Promise<TransitionResult> {
    const blockers: string[] = []
    
    // Check if archive date has arrived (default April 1st)
    const timezone = TimezoneService.getProjectTimezone(project)
    const now = TimezoneService.getCurrentTimeInTimezone(timezone)
    const projectYear = new Date(project.created_at).getFullYear()
    const currentYear = now.getFullYear()
    
    // Get archive settings from project_settings or use defaults
    const archiveMonth = project.project_settings?.archive_month || 4 // April
    const archiveDay = project.project_settings?.archive_day || 1
    
    // Archive date for projects from previous year
    if (currentYear > projectYear) {
      // Calculate archive date in project timezone
      const archiveDate = TimezoneService.calculateTransitionTime(
        new Date(currentYear, archiveMonth - 1, archiveDay),
        '00:00',
        timezone
      )
      
      if (now < archiveDate) {
        return {
          canTransition: false,
          targetPhase: ProjectPhase.ARCHIVED,
          blockers: [`Scheduled to archive on ${TimezoneService.formatInTimezone(archiveDate, timezone)}`],
          scheduledAt: archiveDate,
          reason: 'Waiting for archive date'
        }
      }
    } else {
      blockers.push('Project must be from previous year to archive')
    }

    return {
      canTransition: blockers.length === 0,
      targetPhase: blockers.length === 0 ? ProjectPhase.ARCHIVED : null,
      blockers,
      reason: 'Archive date has arrived for previous year project'
    }
  }

  // Private methods for generating phase-specific action items using existing readiness data
  private async generatePrepActionItems(projectId: string, readiness: any, project: any): Promise<ActionItem[]> {
    const items: ActionItem[] = []
    
    // Critical setup items required for transition to staffing phase
    if (readiness.roles_status === 'default-only') {
      items.push({
        id: 'prep-roles',
        title: 'Add Project Roles & Pay Rates',
        description: 'Define all roles needed for this project with appropriate pay rates',
        category: 'setup',
        priority: 'high',
        completed: false,
        requiredForTransition: true
      })
    } else if (!readiness.roles_finalized) {
      items.push({
        id: 'prep-finalize-roles',
        title: 'Finalize Project Roles',
        description: 'Mark role configuration as complete when ready',
        category: 'setup',
        priority: 'medium',
        completed: false,
        requiredForTransition: true
      })
    }

    if (readiness.locations_status === 'default-only') {
      items.push({
        id: 'prep-locations',
        title: 'Define Talent Locations',
        description: 'Set up location tracking areas for talent management',
        category: 'setup',
        priority: 'high',
        completed: false,
        requiredForTransition: true
      })
    } else if (!readiness.locations_finalized) {
      items.push({
        id: 'prep-finalize-locations',
        title: 'Finalize Location Setup',
        description: 'Mark location configuration as complete when ready',
        category: 'setup',
        priority: 'medium',
        completed: false,
        requiredForTransition: true
      })
    }

    // Basic project information
    if (!project?.name || project.name.trim() === '') {
      items.push({
        id: 'prep-project-name',
        title: 'Set Project Name',
        description: 'Provide a clear name for this project',
        category: 'setup',
        priority: 'high',
        completed: false,
        requiredForTransition: true
      })
    }

    if (!project?.rehearsal_start_date) {
      items.push({
        id: 'prep-rehearsal-date',
        title: 'Set Rehearsal Start Date',
        description: 'Define when rehearsals begin for automatic phase transitions',
        category: 'setup',
        priority: 'medium',
        completed: false,
        requiredForTransition: false
      })
    }

    if (!project?.show_end_date) {
      items.push({
        id: 'prep-show-end-date',
        title: 'Set Show End Date',
        description: 'Define when the show ends for automatic phase transitions',
        category: 'setup',
        priority: 'medium',
        completed: false,
        requiredForTransition: false
      })
    }

    return items
  }

  private async generateStaffingActionItems(projectId: string, readiness: any, project: any): Promise<ActionItem[]> {
    const items: ActionItem[] = []
    
    // Team assignment requirements
    if (readiness.total_staff_assigned === 0) {
      items.push({
        id: 'staffing-assign-team',
        title: 'Assign Team Members',
        description: 'No staff assigned to this project. Assign team members to project roles.',
        category: 'staffing',
        priority: 'high',
        completed: false,
        requiredForTransition: true
      })
    } else if (!readiness.team_finalized) {
      items.push({
        id: 'staffing-finalize-team',
        title: 'Finalize Team Assignments',
        description: `${readiness.total_staff_assigned} staff assigned. Mark team setup as complete when ready.`,
        category: 'staffing',
        priority: 'medium',
        completed: false,
        requiredForTransition: true
      })
    }

    // Talent roster requirements
    if (readiness.total_talent === 0) {
      items.push({
        id: 'staffing-add-talent',
        title: 'Add Talent to Roster',
        description: 'No talent assigned to this project. Add talent to enable assignments.',
        category: 'staffing',
        priority: 'high',
        completed: false,
        requiredForTransition: true
      })
    } else if (!readiness.talent_finalized) {
      items.push({
        id: 'staffing-finalize-talent',
        title: 'Finalize Talent Roster',
        description: `${readiness.total_talent} talent assigned. Mark talent roster as complete when ready.`,
        category: 'staffing',
        priority: 'medium',
        completed: false,
        requiredForTransition: true
      })
    }

    // Escort assignment requirements
    if (readiness.total_talent > 0 && readiness.escort_count === 0) {
      items.push({
        id: 'staffing-assign-escorts',
        title: 'Assign Talent Escorts',
        description: 'Talent needs escort assignments for proper management',
        category: 'staffing',
        priority: 'high',
        completed: false,
        requiredForTransition: false
      })
    }

    // Supervisor assignment recommendation
    if (readiness.total_staff_assigned > 0 && readiness.supervisor_count === 0) {
      items.push({
        id: 'staffing-assign-supervisor',
        title: 'Assign a Supervisor',
        description: 'No supervisor assigned for team oversight and checkout controls',
        category: 'staffing',
        priority: 'medium',
        completed: false,
        requiredForTransition: false
      })
    }

    // Role-specific staffing guidance
    if (readiness.coordinator_count === 0 && readiness.total_staff_assigned > 2) {
      items.push({
        id: 'staffing-consider-coordinator',
        title: 'Consider Adding a Coordinator',
        description: 'For larger teams, a coordinator can help with informational oversight',
        category: 'staffing',
        priority: 'low',
        completed: false,
        requiredForTransition: false
      })
    }

    return items
  }

  private async generatePreShowActionItems(projectId: string, readiness: any, project: any): Promise<ActionItem[]> {
    const items: ActionItem[] = []
    
    // Assignment completion for upcoming show
    if (readiness.urgent_assignment_issues > 0) {
      const issuePlural = readiness.urgent_assignment_issues === 1 ? 'assignment' : 'assignments'
      items.push({
        id: 'preshow-urgent-assignments',
        title: 'Complete Urgent Assignments',
        description: `${readiness.urgent_assignment_issues} ${issuePlural} needed for upcoming show dates`,
        category: 'assignments',
        priority: 'high',
        completed: false,
        requiredForTransition: false
      })
    }

    // Final preparations based on overall readiness
    if (readiness.overall_status !== 'production-ready') {
      items.push({
        id: 'preshow-final-prep',
        title: 'Complete Final Preparations',
        description: 'Ensure all setup items are finalized before rehearsals begin',
        category: 'preparation',
        priority: 'high',
        completed: false,
        requiredForTransition: false
      })
    }

    // Team communication and coordination
    if (readiness.total_staff_assigned > 1) {
      items.push({
        id: 'preshow-team-communication',
        title: 'Verify Team Communication',
        description: 'Ensure all team members have necessary contact information and schedules',
        category: 'communication',
        priority: 'medium',
        completed: false,
        requiredForTransition: false
      })
    }

    // Talent preparation
    if (readiness.total_talent > 0) {
      items.push({
        id: 'preshow-talent-briefing',
        title: 'Talent Briefing',
        description: 'Ensure talent and representatives have all necessary information',
        category: 'preparation',
        priority: 'medium',
        completed: false,
        requiredForTransition: false
      })
    }

    // Location and logistics check
    if (readiness.locations_status !== 'default-only') {
      items.push({
        id: 'preshow-location-check',
        title: 'Location Setup Verification',
        description: 'Verify all location tracking areas are properly configured',
        category: 'preparation',
        priority: 'medium',
        completed: false,
        requiredForTransition: false
      })
    }

    // Technology and equipment readiness
    items.push({
      id: 'preshow-tech-check',
      title: 'Technology Check',
      description: 'Verify all devices and systems are ready for live operations',
      category: 'preparation',
      priority: 'medium',
      completed: false,
      requiredForTransition: false
    })

    return items
  }

  private async generateActiveActionItems(projectId: string, readiness: any, project: any): Promise<ActionItem[]> {
    const items: ActionItem[] = []
    
    // Real-time operations monitoring
    if (readiness.total_talent > 0) {
      items.push({
        id: 'active-talent-tracking',
        title: 'Monitor Talent Locations',
        description: `Track ${readiness.total_talent} talent members in real-time during operations`,
        category: 'operations',
        priority: 'high',
        completed: false,
        requiredForTransition: false
      })
    }

    // Time tracking oversight
    if (readiness.total_staff_assigned > 0) {
      items.push({
        id: 'active-time-tracking',
        title: 'Oversee Time Tracking',
        description: `Monitor ${readiness.total_staff_assigned} team members' time tracking and breaks`,
        category: 'operations',
        priority: 'high',
        completed: false,
        requiredForTransition: false
      })
    }

    // Assignment management during active phase
    if (readiness.urgent_assignment_issues > 0) {
      items.push({
        id: 'active-assignment-issues',
        title: 'Resolve Assignment Issues',
        description: `Address ${readiness.urgent_assignment_issues} urgent assignment issues`,
        category: 'operations',
        priority: 'high',
        completed: false,
        requiredForTransition: false
      })
    }

    // Supervisor oversight
    if (readiness.supervisor_count > 0 && readiness.escort_count > 0) {
      items.push({
        id: 'active-supervisor-oversight',
        title: 'Supervisor Coordination',
        description: 'Coordinate with supervisors for team checkout and operational decisions',
        category: 'operations',
        priority: 'medium',
        completed: false,
        requiredForTransition: false
      })
    }

    // Communication and coordination
    items.push({
      id: 'active-communication',
      title: 'Maintain Communication',
      description: 'Keep open communication channels with all team members and talent',
      category: 'operations',
      priority: 'medium',
      completed: false,
      requiredForTransition: false
    })

    // Daily operational tasks
    items.push({
      id: 'active-daily-operations',
      title: 'Daily Operations Management',
      description: 'Handle daily operational tasks, scheduling, and coordination',
      category: 'operations',
      priority: 'medium',
      completed: false,
      requiredForTransition: false
    })

    return items
  }

  private async generatePostShowActionItems(projectId: string, readiness: any, project: any): Promise<ActionItem[]> {
    const items: ActionItem[] = []
    
    const supabase = await this.getSupabaseClient()
    
    // Check for pending timecards - critical for transition to complete
    const { data: pendingTimecards } = await supabase
      .from('timecards')
      .select('id, status')
      .eq('project_id', projectId)
      .neq('status', 'approved')

    if (pendingTimecards && pendingTimecards.length > 0) {
      const submittedCount = pendingTimecards.filter(tc => tc.status === 'submitted').length
      const draftCount = pendingTimecards.filter(tc => tc.status === 'draft').length
      
      items.push({
        id: 'postshow-review-timecards',
        title: 'Review and Approve Timecards',
        description: `${pendingTimecards.length} timecards pending approval (${submittedCount} submitted, ${draftCount} draft)`,
        category: 'payroll',
        priority: 'high',
        completed: false,
        requiredForTransition: true
      })
    }

    // Check for missing timecards
    if (readiness.total_staff_assigned > 0) {
      const { data: existingTimecards } = await supabase
        .from('timecards')
        .select('user_id', { count: 'exact' })
        .eq('project_id', projectId)

      const timecardCount = existingTimecards?.length || 0
      if (timecardCount < readiness.total_staff_assigned) {
        const missingCount = readiness.total_staff_assigned - timecardCount
        items.push({
          id: 'postshow-missing-timecards',
          title: 'Collect Missing Timecards',
          description: `${missingCount} team members haven't submitted timecards yet`,
          category: 'payroll',
          priority: 'high',
          completed: false,
          requiredForTransition: true
        })
      }
    }

    // Payroll processing
    let approvedTimecards = null
    try {
      const result = await supabase
        .from('timecards')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId)
        .eq('status', 'approved')
      
      approvedTimecards = result.data
    } catch (error) {
      console.error('Error fetching approved timecards:', error)
      approvedTimecards = []
    }

    if ((approvedTimecards?.length || 0) > 0) {
      items.push({
        id: 'postshow-process-payroll',
        title: 'Process Payroll',
        description: `Process payroll for ${approvedTimecards?.length || 0} approved timecards`,
        category: 'payroll',
        priority: 'high',
        completed: false,
        requiredForTransition: true
      })
    }

    // Project documentation and wrap-up
    items.push({
      id: 'postshow-project-summary',
      title: 'Create Project Summary',
      description: 'Document project outcomes, lessons learned, and final statistics',
      category: 'completion',
      priority: 'medium',
      completed: false,
      requiredForTransition: false
    })

    // Data archival preparation
    if (readiness.total_talent > 0 || readiness.total_staff_assigned > 0) {
      items.push({
        id: 'postshow-data-review',
        title: 'Review Project Data',
        description: 'Review and organize project data for archival',
        category: 'completion',
        priority: 'medium',
        completed: false,
        requiredForTransition: false
      })
    }

    // Final communications
    items.push({
      id: 'postshow-final-communications',
      title: 'Final Team Communications',
      description: 'Send final communications to team and talent about project completion',
      category: 'completion',
      priority: 'low',
      completed: false,
      requiredForTransition: false
    })

    return items
  }

  /**
   * Get default readiness data when database query fails
   */
  private getDefaultReadinessData(projectId: string) {
    return {
      project_id: projectId,
      roles_status: 'default-only',
      locations_status: 'default-only',
      total_staff_assigned: 0,
      total_talent: 0,
      escort_count: 0,
      supervisor_count: 0,
      coordinator_count: 0,
      team_finalized: false,
      talent_finalized: false,
      roles_finalized: false,
      locations_finalized: false,
      overall_status: 'getting-started',
      urgent_assignment_issues: 0
    }
  }

  private async generateCompleteActionItems(projectId: string, readiness: any, project: any): Promise<ActionItem[]> {
    const items: ActionItem[] = []
    
    // Project summary and documentation
    items.push({
      id: 'complete-final-summary',
      title: 'Finalize Project Summary',
      description: 'Complete final project documentation and performance summary',
      category: 'completion',
      priority: 'low',
      completed: false,
      requiredForTransition: false
    })

    // Data archival preparation
    items.push({
      id: 'complete-archival-prep',
      title: 'Prepare for Archival',
      description: 'Organize and prepare project data for long-term archival storage',
      category: 'archival',
      priority: 'low',
      completed: false,
      requiredForTransition: false
    })

    // Final data verification
    if (readiness.total_staff_assigned > 0 || readiness.total_talent > 0) {
      items.push({
        id: 'complete-data-verification',
        title: 'Verify Data Integrity',
        description: 'Perform final verification of all project data before archival',
        category: 'archival',
        priority: 'low',
        completed: false,
        requiredForTransition: false
      })
    }

    // Archive configuration review
    const archiveMonth = project?.project_settings?.archive_month || 4
    const archiveDay = project?.project_settings?.archive_day || 1
    items.push({
      id: 'complete-archive-settings',
      title: 'Review Archive Settings',
      description: `Project will auto-archive on ${archiveMonth}/${archiveDay}. Adjust if needed.`,
      category: 'archival',
      priority: 'low',
      completed: false,
      requiredForTransition: false
    })

    return items
  }
}