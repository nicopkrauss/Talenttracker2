/**
 * Automatic Transition Evaluator Service
 * 
 * This service implements real-time phase evaluation and automatic transitions
 * for the project lifecycle management system. It handles scheduled transitions,
 * criteria-based evaluations, and provides monitoring capabilities.
 * 
 * Requirements Coverage:
 * - 1.3: Automatic transition to active mode at rehearsal start (midnight local)
 * - 1.4: Automatic transition to post-show mode after show end (6AM local next day)
 * - 1.5: Automatic transition to complete mode when timecards are approved
 * - 1.6: Automatic transition to archived mode on archive date
 * - 5.3: Timezone-aware transition calculations
 * - 5.4: Accurate timezone handling across year boundaries
 * 
 * @author Phase Engine Team
 * @version 1.0.0
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PhaseEngine, ProjectPhase, TransitionTrigger, TransitionResult } from './phase-engine'
import { TimezoneService } from './timezone-service'
import { CriteriaValidator } from './criteria-validator'

export interface TransitionEvaluation {
  projectId: string
  currentPhase: ProjectPhase
  evaluation: TransitionResult
  shouldTransition: boolean
  scheduledAt?: Date
  error?: string
}

export interface TransitionMonitoringResult {
  totalProjects: number
  evaluatedProjects: number
  successfulTransitions: number
  failedTransitions: number
  scheduledTransitions: number
  errors: Array<{
    projectId: string
    error: string
    timestamp: Date
  }>
}

export interface AutomaticTransitionConfig {
  enabledPhases: ProjectPhase[]
  evaluationIntervalMinutes: number
  maxRetryAttempts: number
  alertOnFailure: boolean
  dryRun: boolean
}

/**
 * Automatic Transition Evaluator
 * Handles real-time phase evaluation and automatic transitions
 */
export class AutomaticTransitionEvaluator {
  private phaseEngine: PhaseEngine
  private criteriaValidator: CriteriaValidator
  private supabase: any
  private config: AutomaticTransitionConfig

  constructor(config?: Partial<AutomaticTransitionConfig>) {
    this.phaseEngine = new PhaseEngine()
    this.criteriaValidator = new CriteriaValidator()
    this.supabase = null
    
    // Default configuration
    this.config = {
      enabledPhases: [
        ProjectPhase.PRE_SHOW,
        ProjectPhase.ACTIVE,
        ProjectPhase.POST_SHOW,
        ProjectPhase.COMPLETE
      ],
      evaluationIntervalMinutes: 15,
      maxRetryAttempts: 3,
      alertOnFailure: true,
      dryRun: false,
      ...config
    }
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
   * Evaluate all projects for automatic transitions
   * Requirements: 1.3, 1.4, 1.5, 1.6, 5.3, 5.4
   */
  async evaluateAllProjects(): Promise<TransitionMonitoringResult> {
    const result: TransitionMonitoringResult = {
      totalProjects: 0,
      evaluatedProjects: 0,
      successfulTransitions: 0,
      failedTransitions: 0,
      scheduledTransitions: 0,
      errors: []
    }

    try {
      const supabase = await this.getSupabaseClient()
      
      // Get all active projects that have auto-transitions enabled
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          timezone,
          rehearsal_start_date,
          show_end_date,
          auto_transitions_enabled,
          phase_updated_at,
          created_at,
          project_settings(
            post_show_transition_hour,
            archive_month,
            archive_day
          )
        `)
        .eq('auto_transitions_enabled', true)
        .not('status', 'eq', ProjectPhase.ARCHIVED)

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`)
      }

      if (!projects || projects.length === 0) {
        console.log('No projects found for automatic transition evaluation')
        return result
      }

      result.totalProjects = projects.length
      console.log(`Evaluating ${projects.length} projects for automatic transitions`)

      // Evaluate each project
      for (const project of projects) {
        try {
          const evaluation = await this.evaluateProjectTransition(project)
          result.evaluatedProjects++

          if (evaluation.shouldTransition) {
            if (evaluation.scheduledAt && evaluation.scheduledAt > new Date()) {
              result.scheduledTransitions++
              console.log(`Project ${project.id} scheduled for transition at ${evaluation.scheduledAt}`)
            } else {
              // Execute immediate transition
              await this.executeAutomaticTransition(evaluation)
              result.successfulTransitions++
              console.log(`Successfully transitioned project ${project.id} to ${evaluation.evaluation.targetPhase}`)
            }
          }
        } catch (error) {
          result.failedTransitions++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push({
            projectId: project.id,
            error: errorMessage,
            timestamp: new Date()
          })
          
          console.error(`Failed to evaluate project ${project.id}:`, error)
          
          if (this.config.alertOnFailure) {
            await this.sendTransitionAlert(project.id, errorMessage)
          }
        }
      }

      console.log(`Transition evaluation complete: ${result.successfulTransitions} successful, ${result.failedTransitions} failed, ${result.scheduledTransitions} scheduled`)
      return result

    } catch (error) {
      console.error('Error during automatic transition evaluation:', error)
      throw error
    }
  }

  /**
   * Evaluate a single project for automatic transition
   * Requirements: 1.3, 1.4, 1.5, 1.6, 5.3, 5.4
   */
  async evaluateProjectTransition(project: any): Promise<TransitionEvaluation> {
    try {
      const currentPhase = project.status as ProjectPhase
      
      // Skip if phase is not enabled for automatic transitions
      if (!this.config.enabledPhases.includes(currentPhase)) {
        return {
          projectId: project.id,
          currentPhase,
          evaluation: {
            canTransition: false,
            targetPhase: null,
            blockers: ['Phase not enabled for automatic transitions']
          },
          shouldTransition: false
        }
      }

      // Get transition evaluation from phase engine
      const evaluation = await this.phaseEngine.evaluateTransition(project.id)
      
      if (!evaluation.canTransition) {
        return {
          projectId: project.id,
          currentPhase,
          evaluation,
          shouldTransition: false
        }
      }

      // Check if this is a time-based transition
      const isTimeBased = await this.isTimeBasedTransition(currentPhase, evaluation.targetPhase!)
      
      if (isTimeBased) {
        const transitionTime = await this.calculateTransitionTime(project, currentPhase, evaluation.targetPhase!)
        
        if (transitionTime) {
          const now = new Date()
          const shouldTransition = now >= transitionTime
          
          return {
            projectId: project.id,
            currentPhase,
            evaluation: {
              ...evaluation,
              scheduledAt: transitionTime
            },
            shouldTransition,
            scheduledAt: transitionTime
          }
        }
      }

      // For non-time-based transitions, check if criteria are met
      const criteriaResult = await this.validateTransitionCriteria(project.id, currentPhase, evaluation.targetPhase!)
      
      return {
        projectId: project.id,
        currentPhase,
        evaluation: {
          ...evaluation,
          canTransition: criteriaResult.isComplete,
          blockers: criteriaResult.isComplete ? evaluation.blockers : criteriaResult.blockers
        },
        shouldTransition: criteriaResult.isComplete && evaluation.canTransition
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        projectId: project.id,
        currentPhase: project.status as ProjectPhase,
        evaluation: {
          canTransition: false,
          targetPhase: null,
          blockers: [`Evaluation error: ${errorMessage}`]
        },
        shouldTransition: false,
        error: errorMessage
      }
    }
  }

  /**
   * Execute an automatic transition
   * Requirements: 1.3, 1.4, 1.5, 1.6
   */
  private async executeAutomaticTransition(evaluation: TransitionEvaluation): Promise<void> {
    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would transition project ${evaluation.projectId} from ${evaluation.currentPhase} to ${evaluation.evaluation.targetPhase}`)
      return
    }

    if (!evaluation.evaluation.targetPhase) {
      throw new Error('No target phase specified for transition')
    }

    try {
      await this.phaseEngine.executeTransition(
        evaluation.projectId,
        evaluation.evaluation.targetPhase,
        TransitionTrigger.AUTOMATIC,
        'system',
        evaluation.evaluation.reason || 'Automatic transition based on criteria'
      )

      // Log successful automatic transition
      await this.logAutomaticTransition(evaluation, true)

    } catch (error) {
      // Log failed automatic transition
      await this.logAutomaticTransition(evaluation, false, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Check if a transition is time-based
   */
  private async isTimeBasedTransition(currentPhase: ProjectPhase, targetPhase: ProjectPhase): Promise<boolean> {
    const timeBasedTransitions = [
      { from: ProjectPhase.PRE_SHOW, to: ProjectPhase.ACTIVE },
      { from: ProjectPhase.ACTIVE, to: ProjectPhase.POST_SHOW },
      { from: ProjectPhase.COMPLETE, to: ProjectPhase.ARCHIVED }
    ]

    return timeBasedTransitions.some(
      transition => transition.from === currentPhase && transition.to === targetPhase
    )
  }

  /**
   * Calculate transition time for time-based transitions
   * Requirements: 5.3, 5.4
   */
  private async calculateTransitionTime(
    project: any, 
    currentPhase: ProjectPhase, 
    targetPhase: ProjectPhase
  ): Promise<Date | null> {
    try {
      const timezone = TimezoneService.getProjectTimezone(project)

      switch (`${currentPhase}->${targetPhase}`) {
        case 'PRE_SHOW->ACTIVE':
        case `${ProjectPhase.PRE_SHOW}->${ProjectPhase.ACTIVE}`:
          // Transition at midnight on rehearsal start date
          if (project.rehearsal_start_date) {
            return TimezoneService.calculateTransitionTime(
              new Date(project.rehearsal_start_date),
              '00:00',
              timezone
            )
          }
          break

        case 'ACTIVE->POST_SHOW':
        case `${ProjectPhase.ACTIVE}->${ProjectPhase.POST_SHOW}`:
          // Transition at 6AM (or configured hour) the day after show end
          if (project.show_end_date) {
            const postShowHour = project.project_settings?.post_show_transition_hour || 6
            const showEndDate = new Date(project.show_end_date)
            showEndDate.setDate(showEndDate.getDate() + 1) // Next day
            
            return TimezoneService.calculateTransitionTime(
              showEndDate,
              `${postShowHour.toString().padStart(2, '0')}:00`,
              timezone
            )
          }
          break

        case 'POST_SHOW->COMPLETE':
        case `${ProjectPhase.POST_SHOW}->${ProjectPhase.COMPLETE}`:
          // This is criteria-based, not time-based
          return null

        case 'COMPLETE->ARCHIVED':
        case `${ProjectPhase.COMPLETE}->${ProjectPhase.ARCHIVED}`:
          // Transition on archive date (default April 1st) for previous year projects
          const projectYear = new Date(project.created_at).getFullYear()
          const currentYear = new Date().getFullYear()
          
          if (currentYear > projectYear) {
            const archiveMonth = project.project_settings?.archive_month || 4
            const archiveDay = project.project_settings?.archive_day || 1
            
            return TimezoneService.calculateTransitionTime(
              new Date(currentYear, archiveMonth - 1, archiveDay),
              '00:00',
              timezone
            )
          }
          break
      }

      return null
    } catch (error) {
      console.error('Error calculating transition time:', error)
      return null
    }
  }

  /**
   * Validate transition criteria using CriteriaValidator
   */
  private async validateTransitionCriteria(
    projectId: string, 
    currentPhase: ProjectPhase, 
    targetPhase: ProjectPhase
  ) {
    switch (`${currentPhase}->${targetPhase}`) {
      case 'PREP->STAFFING':
      case `${ProjectPhase.PREP}->${ProjectPhase.STAFFING}`:
        return await this.criteriaValidator.validatePrepCompletion(projectId)
      
      case 'STAFFING->PRE_SHOW':
      case `${ProjectPhase.STAFFING}->${ProjectPhase.PRE_SHOW}`:
        return await this.criteriaValidator.validateStaffingCompletion(projectId)
      
      case 'PRE_SHOW->ACTIVE':
      case `${ProjectPhase.PRE_SHOW}->${ProjectPhase.ACTIVE}`:
        return await this.criteriaValidator.validatePreShowReadiness(projectId)
      
      case 'POST_SHOW->COMPLETE':
      case `${ProjectPhase.POST_SHOW}->${ProjectPhase.COMPLETE}`:
        return await this.criteriaValidator.validateTimecardCompletion(projectId)
      
      default:
        return {
          isComplete: true,
          completedItems: [],
          pendingItems: [],
          blockers: []
        }
    }
  }

  /**
   * Log automatic transition attempt
   */
  private async logAutomaticTransition(
    evaluation: TransitionEvaluation, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient()
      
      await supabase
        .from('project_audit_log')
        .insert({
          project_id: evaluation.projectId,
          action_type: 'automatic_transition_attempt',
          action_details: {
            from_phase: evaluation.currentPhase,
            to_phase: evaluation.evaluation.targetPhase,
            success,
            error,
            evaluation_result: evaluation.evaluation,
            scheduled_at: evaluation.scheduledAt?.toISOString(),
            timestamp: new Date().toISOString()
          },
          performed_by: 'system',
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log automatic transition:', logError)
      // Don't throw here - logging failure shouldn't break the transition
    }
  }

  /**
   * Send alert for transition failures
   */
  private async sendTransitionAlert(projectId: string, error: string): Promise<void> {
    try {
      // In a real implementation, this would send notifications via email, Slack, etc.
      console.error(`TRANSITION ALERT: Project ${projectId} failed automatic transition: ${error}`)
      
      // Log the alert
      const supabase = await this.getSupabaseClient()
      await supabase
        .from('project_audit_log')
        .insert({
          project_id: projectId,
          action_type: 'transition_alert',
          action_details: {
            error,
            alert_type: 'automatic_transition_failure',
            timestamp: new Date().toISOString()
          },
          performed_by: 'system',
          created_at: new Date().toISOString()
        })
    } catch (alertError) {
      console.error('Failed to send transition alert:', alertError)
    }
  }

  /**
   * Get projects scheduled for upcoming transitions
   * Utility method for monitoring and reporting
   */
  async getScheduledTransitions(hoursAhead: number = 24): Promise<Array<{
    projectId: string
    projectName: string
    currentPhase: ProjectPhase
    targetPhase: ProjectPhase
    scheduledAt: Date
  }>> {
    try {
      const supabase = await this.getSupabaseClient()
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() + hoursAhead)

      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          timezone,
          rehearsal_start_date,
          show_end_date,
          created_at,
          project_settings(
            post_show_transition_hour,
            archive_month,
            archive_day
          )
        `)
        .eq('auto_transitions_enabled', true)
        .not('status', 'eq', ProjectPhase.ARCHIVED)

      if (error || !projects) {
        return []
      }

      const scheduledTransitions = []

      for (const project of projects) {
        try {
          const evaluation = await this.evaluateProjectTransition(project)
          
          if (evaluation.scheduledAt && 
              evaluation.scheduledAt > new Date() && 
              evaluation.scheduledAt <= cutoffTime) {
            scheduledTransitions.push({
              projectId: project.id,
              projectName: project.name,
              currentPhase: evaluation.currentPhase,
              targetPhase: evaluation.evaluation.targetPhase!,
              scheduledAt: evaluation.scheduledAt
            })
          }
        } catch (error) {
          console.error(`Error evaluating scheduled transitions for project ${project.id}:`, error)
        }
      }

      return scheduledTransitions.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    } catch (error) {
      console.error('Error getting scheduled transitions:', error)
      return []
    }
  }

  /**
   * Force evaluation of a specific project
   * Utility method for manual triggering
   */
  async evaluateProject(projectId: string): Promise<TransitionEvaluation> {
    try {
      const supabase = await this.getSupabaseClient()
      
      const { data: project, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          timezone,
          rehearsal_start_date,
          show_end_date,
          auto_transitions_enabled,
          created_at,
          project_settings(
            post_show_transition_hour,
            archive_month,
            archive_day
          )
        `)
        .eq('id', projectId)
        .single()

      if (error || !project) {
        throw new Error(`Project ${projectId} not found`)
      }

      return await this.evaluateProjectTransition(project)
    } catch (error) {
      console.error(`Error evaluating project ${projectId}:`, error)
      throw error
    }
  }
}