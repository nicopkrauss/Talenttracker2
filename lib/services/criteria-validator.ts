import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface ValidationResult {
  isComplete: boolean
  completedItems: string[]
  pendingItems: string[]
  blockers: string[]
}

export interface CriteriaValidationError extends Error {
  code: 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'UNAUTHORIZED'
  details?: Record<string, any>
}

export class CriteriaValidator {
  private supabase

  constructor(supabaseClient?: any) {
    if (supabaseClient) {
      this.supabase = supabaseClient
    } else {
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
  }

  /**
   * Validates prep phase completion - checks vital project information
   * Requirements: 1.2 - vital project information must be complete for staffing transition
   */
  async validatePrepCompletion(projectId: string): Promise<ValidationResult> {
    try {
      const completedItems: string[] = []
      const pendingItems: string[] = []
      const blockers: string[] = []

      // Check project basic information
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('name, description, start_date, end_date, timezone, rehearsal_start_date, show_end_date')
        .eq('id', projectId)
        .single()

      if (projectError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch project data', { projectError })
      }

      if (!project) {
        blockers.push('Project not found')
        return { isComplete: false, completedItems, pendingItems, blockers }
      }

      // Validate project basic info
      if (project.name?.trim()) {
        completedItems.push('Project name defined')
      } else {
        pendingItems.push('Project name required')
      }

      if (project.description?.trim()) {
        completedItems.push('Project description provided')
      } else {
        pendingItems.push('Project description required')
      }

      if (project.start_date) {
        completedItems.push('Project start date set')
      } else {
        pendingItems.push('Project start date required')
        blockers.push('Start date is required for scheduling')
      }

      if (project.end_date) {
        completedItems.push('Project end date set')
      } else {
        pendingItems.push('Project end date required')
        blockers.push('End date is required for scheduling')
      }

      if (project.timezone) {
        completedItems.push('Project timezone configured')
      } else {
        pendingItems.push('Project timezone required')
        blockers.push('Timezone is required for phase transitions')
      }

      // Check project locations
      const { data: locations, error: locationsError } = await this.supabase
        .from('project_locations')
        .select('id')
        .eq('project_id', projectId)

      if (locationsError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch project locations', { locationsError })
      }

      if (locations && locations.length > 0) {
        completedItems.push(`${locations.length} project locations defined`)
      } else {
        pendingItems.push('Project locations required')
        blockers.push('At least one project location must be defined')
      }

      // Check project role templates
      const { data: roleTemplates, error: roleTemplatesError } = await this.supabase
        .from('project_role_templates')
        .select('id, role_name')
        .eq('project_id', projectId)

      if (roleTemplatesError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch role templates', { roleTemplatesError })
      }

      if (roleTemplates && roleTemplates.length > 0) {
        completedItems.push(`${roleTemplates.length} role templates configured`)
      } else {
        pendingItems.push('Project role templates required')
        blockers.push('At least one role template must be defined')
      }

      const isComplete = pendingItems.length === 0 && blockers.length === 0

      return {
        isComplete,
        completedItems,
        pendingItems,
        blockers
      }

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createValidationError('VALIDATION_ERROR', 'Failed to validate prep completion', { error })
    }
  }

  /**
   * Validates staffing phase completion - checks team assignments
   * Requirements: 1.3 - staffing and talent assignment must be complete for pre-show transition
   */
  async validateStaffingCompletion(projectId: string): Promise<ValidationResult> {
    try {
      const completedItems: string[] = []
      const pendingItems: string[] = []
      const blockers: string[] = []

      // Check team assignments
      const { data: teamAssignments, error: teamError } = await this.supabase
        .from('team_assignments')
        .select('id, role, user_id, profiles!team_assignments_user_id_fkey(full_name)')
        .eq('project_id', projectId)

      if (teamError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch team assignments', { teamError })
      }

      if (teamAssignments && teamAssignments.length > 0) {
        completedItems.push(`${teamAssignments.length} team members assigned`)
      } else {
        pendingItems.push('Team assignments required')
        blockers.push('At least one team member must be assigned')
      }

      // Check talent roster
      const { data: talentRoster, error: talentError } = await this.supabase
        .from('talent_project_assignments')
        .select('id, talent_id, talent!talent_project_assignments_talent_id_fkey(first_name, last_name)')
        .eq('project_id', projectId)

      if (talentError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch talent roster', { talentError })
      }

      if (talentRoster && talentRoster.length > 0) {
        completedItems.push(`${talentRoster.length} talent assigned to project`)
      } else {
        pendingItems.push('Talent roster required')
        blockers.push('At least one talent must be assigned to the project')
      }

      // Check if essential roles are filled (supervisor/coordinator)
      const essentialRoles = ['supervisor', 'coordinator']
      const assignedRoles = teamAssignments?.map(assignment => assignment.role) || []
      
      const missingEssentialRoles = essentialRoles.filter(role => !assignedRoles.includes(role))
      
      if (missingEssentialRoles.length === 0) {
        completedItems.push('Essential roles (supervisor, coordinator) assigned')
      } else {
        pendingItems.push(`Missing essential roles: ${missingEssentialRoles.join(', ')}`)
        blockers.push('Supervisor and coordinator roles must be assigned')
      }

      const isComplete = pendingItems.length === 0 && blockers.length === 0

      return {
        isComplete,
        completedItems,
        pendingItems,
        blockers
      }

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createValidationError('VALIDATION_ERROR', 'Failed to validate staffing completion', { error })
    }
  }

  /**
   * Validates pre-show readiness - checks final preparations
   * Requirements: 1.4 - pre-show preparations must be complete for active transition
   */
  async validatePreShowReadiness(projectId: string): Promise<ValidationResult> {
    try {
      const completedItems: string[] = []
      const pendingItems: string[] = []
      const blockers: string[] = []

      // Check project setup checklist completion
      const { data: checklist, error: checklistError } = await this.supabase
        .from('project_setup_checklist')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (checklistError && checklistError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch setup checklist', { checklistError })
      }

      if (checklist) {
        const checklistItems = [
          { key: 'roles_finalized', label: 'Project roles finalized' },
          { key: 'locations_finalized', label: 'Project locations finalized' },
          { key: 'talent_roster_finalized', label: 'Talent roster finalized' },
          { key: 'team_assignments_finalized', label: 'Team assignments finalized' }
        ]

        checklistItems.forEach(item => {
          if (checklist[item.key]) {
            completedItems.push(item.label)
          } else {
            pendingItems.push(item.label)
            blockers.push(`${item.label} must be completed before going active`)
          }
        })
      } else {
        pendingItems.push('Project setup checklist not initialized')
        blockers.push('Setup checklist must be completed')
      }

      // Check that rehearsal start date is set and approaching
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('rehearsal_start_date, timezone')
        .eq('id', projectId)
        .single()

      if (projectError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch project dates', { projectError })
      }

      if (project?.rehearsal_start_date) {
        completedItems.push('Rehearsal start date configured')
        
        // Check if we're close to rehearsal start (within 7 days)
        const rehearsalDate = new Date(project.rehearsal_start_date)
        const now = new Date()
        const daysUntilRehearsal = Math.ceil((rehearsalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilRehearsal <= 7 && daysUntilRehearsal >= 0) {
          completedItems.push('Rehearsal start date is approaching (within 7 days)')
        } else if (daysUntilRehearsal < 0) {
          completedItems.push('Rehearsal start date has passed')
        } else {
          pendingItems.push(`Rehearsal start date is ${daysUntilRehearsal} days away`)
        }
      } else {
        pendingItems.push('Rehearsal start date required')
        blockers.push('Rehearsal start date must be set for pre-show phase')
      }

      // Check talent escort assignments
      const { data: escortAssignments, error: escortError } = await this.supabase
        .from('talent_project_assignments')
        .select('id, assigned_escort_id')
        .eq('project_id', projectId)
        .not('assigned_escort_id', 'is', null)

      if (escortError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch escort assignments', { escortError })
      }

      const { data: totalTalent, error: totalTalentError } = await this.supabase
        .from('talent_project_assignments')
        .select('id')
        .eq('project_id', projectId)

      if (totalTalentError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch total talent count', { totalTalentError })
      }

      const escortedCount = escortAssignments?.length || 0
      const totalTalentCount = totalTalent?.length || 0

      if (totalTalentCount > 0) {
        const escortPercentage = Math.round((escortedCount / totalTalentCount) * 100)
        
        if (escortPercentage >= 80) {
          completedItems.push(`${escortPercentage}% of talent have assigned escorts`)
        } else {
          pendingItems.push(`Only ${escortPercentage}% of talent have assigned escorts`)
          if (escortPercentage < 50) {
            blockers.push('At least 50% of talent must have assigned escorts')
          }
        }
      }

      const isComplete = pendingItems.length === 0 && blockers.length === 0

      return {
        isComplete,
        completedItems,
        pendingItems,
        blockers
      }

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createValidationError('VALIDATION_ERROR', 'Failed to validate pre-show readiness', { error })
    }
  }

  /**
   * Validates timecard completion - checks payroll status
   * Requirements: 1.5 - all timecards must be approved and paid for complete transition
   */
  async validateTimecardCompletion(projectId: string): Promise<ValidationResult> {
    try {
      const completedItems: string[] = []
      const pendingItems: string[] = []
      const blockers: string[] = []

      // Check timecard submissions
      const { data: timecards, error: timecardsError } = await this.supabase
        .from('timecards')
        .select('id, status, user_id, profiles!timecards_user_id_fkey(full_name)')
        .eq('project_id', projectId)

      if (timecardsError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch timecards', { timecardsError })
      }

      if (!timecards || timecards.length === 0) {
        pendingItems.push('No timecards submitted')
        blockers.push('Timecards must be submitted before project completion')
        
        return {
          isComplete: false,
          completedItems,
          pendingItems,
          blockers
        }
      }

      // Analyze timecard statuses
      const statusCounts = timecards.reduce((acc, timecard) => {
        acc[timecard.status] = (acc[timecard.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const totalTimecards = timecards.length
      const approvedCount = statusCounts['approved'] || 0
      const paidCount = statusCounts['paid'] || 0
      const pendingCount = statusCounts['pending'] || 0
      const rejectedCount = statusCounts['rejected'] || 0

      // Report status breakdown
      if (approvedCount > 0) {
        completedItems.push(`${approvedCount} timecards approved`)
      }
      
      if (paidCount > 0) {
        completedItems.push(`${paidCount} timecards paid`)
      }

      if (pendingCount > 0) {
        pendingItems.push(`${pendingCount} timecards pending approval`)
      }

      if (rejectedCount > 0) {
        pendingItems.push(`${rejectedCount} timecards rejected and need resubmission`)
        blockers.push('Rejected timecards must be corrected and resubmitted')
      }

      // Check if all timecards are paid
      if (paidCount === totalTimecards) {
        completedItems.push('All timecards have been paid')
      } else {
        const unpaidCount = totalTimecards - paidCount
        pendingItems.push(`${unpaidCount} timecards not yet paid`)
        blockers.push('All timecards must be approved and paid for project completion')
      }

      // Check for team members without timecard submissions
      const { data: teamMembers, error: teamError } = await this.supabase
        .from('team_assignments')
        .select('user_id, profiles!team_assignments_user_id_fkey(full_name)')
        .eq('project_id', projectId)

      if (teamError) {
        throw this.createValidationError('DATABASE_ERROR', 'Failed to fetch team members', { teamError })
      }

      if (teamMembers) {
        const submittedUserIds = new Set(timecards.map(tc => tc.user_id))
        const missingSubmissions = teamMembers.filter(member => !submittedUserIds.has(member.user_id))

        if (missingSubmissions.length > 0) {
          const missingNames = missingSubmissions.map(member => member.profiles?.full_name || 'Unknown').join(', ')
          pendingItems.push(`Missing timecard submissions from: ${missingNames}`)
          blockers.push('All team members must submit timecards')
        } else {
          completedItems.push('All team members have submitted timecards')
        }
      }

      const isComplete = pendingItems.length === 0 && blockers.length === 0

      return {
        isComplete,
        completedItems,
        pendingItems,
        blockers
      }

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createValidationError('VALIDATION_ERROR', 'Failed to validate timecard completion', { error })
    }
  }

  /**
   * Creates a standardized validation error
   */
  private createValidationError(
    code: CriteriaValidationError['code'], 
    message: string, 
    details?: Record<string, any>
  ): CriteriaValidationError {
    const error = new Error(message) as CriteriaValidationError
    error.code = code
    error.details = details
    return error
  }
}