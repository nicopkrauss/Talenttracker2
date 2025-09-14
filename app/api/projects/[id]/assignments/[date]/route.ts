import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { TalentEscortPair } from '@/lib/types'
import { 
  createAssignmentValidationSchema,
  validateScheduleConsistency,
  validateAvailabilityConsistency
} from '@/lib/validation/scheduling-validation'
import { 
  SchedulingErrorHandler, 
  SchedulingErrorCode 
} from '@/lib/error-handling/scheduling-errors'
import { createProjectScheduleFromStrings } from '@/lib/schedule-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
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

    const { id: projectId, date: dateStr } = await params

    // Enhanced date validation
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.INVALID_DATE_FORMAT,
        'Invalid date format. Expected YYYY-MM-DD format.'
      )
      return NextResponse.json(error, { status: 400 })
    }

    // Check project access with enhanced error handling
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.PROJECT_NOT_FOUND,
        'Project not found or access denied'
      )
      return NextResponse.json(error, { status: 404 })
    }

    // Create project schedule for validation
    let projectSchedule
    try {
      projectSchedule = createProjectScheduleFromStrings(project.start_date, project.end_date)
    } catch (err) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.INVALID_DATE_FORMAT,
        'Project has invalid date configuration'
      )
      return NextResponse.json(error, { status: 400 })
    }

    // Validate date is within project range using schedule
    if (date < projectSchedule.startDate || date > projectSchedule.endDate) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.DATE_OUT_OF_RANGE,
        `Date must be between ${projectSchedule.startDate.toISOString().split('T')[0]} and ${projectSchedule.endDate.toISOString().split('T')[0]}`
      )
      return NextResponse.json(error, { status: 400 })
    }

    // Get all talent scheduled for this date (from daily assignments table - unified system)
    const { data: talentAssignments, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select(`
        id,
        talent_id,
        escort_id,
        talent:talent_id (
          id,
          first_name,
          last_name
        ),
        escort:escort_id (
          id,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .eq('assignment_date', dateStr) as { 
        data: Array<{
          id: string
          talent_id: string
          escort_id: string | null
          talent: {
            id: string
            first_name: string
            last_name: string
          }
          escort: {
            id: string
            full_name: string
          } | null
        }> | null
        error: any
      }

    if (talentError) {
      console.error('Error fetching talent daily assignments:', talentError)
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.DATABASE_ERROR,
        'Failed to fetch talent assignments from database'
      )
      SchedulingErrorHandler.logError(error, { projectId, date: dateStr, originalError: talentError })
      return NextResponse.json(error, { status: 500 })
    }

    // Get display orders for talent
    const talentIds = talentAssignments?.map(ta => ta.talent_id) || []
    let talentDisplayOrders: Record<string, number> = {}
    
    if (talentIds.length > 0) {
      const { data: talentProjects } = await supabase
        .from('talent_project_assignments')
        .select('talent_id, display_order')
        .eq('project_id', projectId)
        .in('talent_id', talentIds)
      
      if (talentProjects) {
        talentDisplayOrders = talentProjects.reduce((acc, tp) => {
          acc[tp.talent_id] = tp.display_order || 0
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Get all talent groups scheduled for this date (from daily assignments table - unified system)
    const { data: groupAssignments, error: groupsError } = await supabase
      .from('group_daily_assignments')
      .select(`
        id,
        group_id,
        escort_id,
        group:group_id (
          id,
          group_name,
          display_order
        ),
        escort:escort_id (
          id,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .eq('assignment_date', dateStr) as {
        data: Array<{
          id: string
          group_id: string
          escort_id: string | null
          group: {
            id: string
            group_name: string
            display_order: number
          }
          escort: {
            id: string
            full_name: string
          } | null
        }> | null
        error: any
      }

    if (groupsError) {
      console.error('Error fetching group daily assignments:', groupsError)
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.DATABASE_ERROR,
        'Failed to fetch group assignments from database'
      )
      SchedulingErrorHandler.logError(error, { projectId, date: dateStr, originalError: groupsError })
      return NextResponse.json(error, { status: 500 })
    }

    // Process assignments from unified daily assignment tables
    const assignments: (TalentEscortPair & { displayOrder: number })[] = []

    // Group talent assignments by talent_id to handle multiple escorts per talent
    const talentAssignmentMap = new Map<string, Array<{escortId: string | null, escortName: string}>>()
    
    if (talentAssignments) {
      for (const assignment of talentAssignments) {
        const talentId = assignment.talent_id
        if (!talentAssignmentMap.has(talentId)) {
          talentAssignmentMap.set(talentId, [])
        }
        talentAssignmentMap.get(talentId)!.push({
          escortId: assignment.escort_id,
          escortName: assignment.escort?.full_name || ''
        })
      }
    }

    // Process all scheduled individual talent (from unified daily assignments)
    talentAssignmentMap.forEach((escorts, talentId) => {
      const firstAssignment = talentAssignments?.find(ta => ta.talent_id === talentId)
      if (firstAssignment?.talent) {
        // Filter out null escorts and use the first assigned escort as primary
        const assignedEscorts = escorts.filter(e => e.escortId !== null)
        const primaryEscort = assignedEscorts[0]
        const additionalEscorts = assignedEscorts.slice(1)
        
        assignments.push({
          talentId: talentId,
          talentName: `${firstAssignment.talent.first_name || ''} ${firstAssignment.talent.last_name || ''}`.trim(),
          isGroup: false,
          escortId: primaryEscort?.escortId || undefined,
          escortName: primaryEscort?.escortName || undefined,
          escortAssignments: additionalEscorts.length > 0 ? additionalEscorts.map(e => ({
            escortId: e.escortId || undefined,
            escortName: e.escortName || undefined
          })) : undefined,
          displayOrder: talentDisplayOrders[talentId] || 0
        })
      }
    })

    // Group group assignments by group_id to handle multiple escorts per group
    const groupAssignmentMap = new Map<string, Array<{escortId: string | null, escortName: string}>>()
    
    if (groupAssignments) {
      for (const assignment of groupAssignments) {
        const groupId = assignment.group_id
        if (!groupAssignmentMap.has(groupId)) {
          groupAssignmentMap.set(groupId, [])
        }
        groupAssignmentMap.get(groupId)!.push({
          escortId: assignment.escort_id,
          escortName: assignment.escort?.full_name || ''
        })
      }
    }

    // Process all scheduled talent groups (from unified daily assignments)
    groupAssignmentMap.forEach((escorts, groupId) => {
      const firstAssignment = groupAssignments?.find(ga => ga.group_id === groupId)
      if (firstAssignment?.group) {
        // Filter out null escorts and use assigned escorts
        const assignedEscorts = escorts.filter(e => e.escortId !== null)
        const primaryEscort = assignedEscorts[0]
        
        // For groups, always show at least one dropdown (empty if no assignments)
        const escortAssignments = assignedEscorts.length > 0 
          ? assignedEscorts.map(e => ({
              escortId: e.escortId || undefined,
              escortName: e.escortName || undefined
            }))
          : [{ escortId: undefined, escortName: undefined }]
        
        assignments.push({
          talentId: groupId,
          talentName: firstAssignment.group.group_name,
          isGroup: true,
          escortId: primaryEscort?.escortId || undefined,
          escortName: primaryEscort?.escortName || undefined,
          escortAssignments,
          displayOrder: firstAssignment.group.display_order || 0
        })
      }
    })

    // Sort assignments by display_order (descending) to match draggable area
    assignments.sort((a, b) => b.displayOrder - a.displayOrder)

    return NextResponse.json({
      data: {
        date: dateStr,
        assignments
      }
    })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/assignments/[date]:', error)
    const schedulingError = SchedulingErrorHandler.createError(
      SchedulingErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred while fetching assignments'
    )
    SchedulingErrorHandler.logError(schedulingError, { 
      endpoint: 'GET /assignments/[date]',
      originalError: error 
    })
    return NextResponse.json(schedulingError, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
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

    const { id: projectId, date: dateStr } = await params

    // Enhanced date validation
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.INVALID_DATE_FORMAT,
        'Invalid date format. Expected YYYY-MM-DD format.'
      )
      return NextResponse.json(error, { status: 400 })
    }

    // Check project access first
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.PROJECT_NOT_FOUND,
        'Project not found or access denied'
      )
      return NextResponse.json(error, { status: 404 })
    }

    // Create project schedule for validation
    let projectSchedule
    try {
      projectSchedule = createProjectScheduleFromStrings(project.start_date, project.end_date)
    } catch (err) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.INVALID_DATE_FORMAT,
        'Project has invalid date configuration'
      )
      return NextResponse.json(error, { status: 400 })
    }

    // Parse and validate request body with enhanced validation
    let body
    try {
      body = await request.json()
    } catch (err) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body'
      )
      return NextResponse.json(error, { status: 400 })
    }
    
    // Use enhanced assignment validation schema
    const assignmentSchema = createAssignmentValidationSchema(projectSchedule)
    const assignmentData = {
      date: dateStr,
      talents: body.talents || [],
      groups: body.groups || []
    }
    
    const validationResult = assignmentSchema.safeParse(assignmentData)
    if (!validationResult.success) {
      const error = SchedulingErrorHandler.createError(
        SchedulingErrorCode.VALIDATION_ERROR,
        'Assignment validation failed',
        undefined,
        { validationErrors: validationResult.error.flatten().fieldErrors }
      )
      return NextResponse.json(error, { status: 400 })
    }

    const { talents, groups } = validationResult.data

    // Validate that all talents exist and are assigned to this project
    if (talents.length > 0) {
      const talentIds = talents.map(t => t.talentId)
      const { data: talentAssignments, error: talentValidationError } = await supabase
        .from('talent_project_assignments')
        .select('talent_id')
        .eq('project_id', projectId)
        .in('talent_id', talentIds)

      if (talentValidationError) {
        return NextResponse.json(
          { error: 'Failed to validate talent assignments', code: 'DATABASE_ERROR' },
          { status: 500 }
        )
      }

      const validTalentIds = new Set(talentAssignments?.map(ta => ta.talent_id) || [])
      const invalidTalentIds = talentIds.filter(id => !validTalentIds.has(id))
      
      if (invalidTalentIds.length > 0) {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.TALENT_NOT_SCHEDULED,
          'Some talents are not assigned to this project',
          'talents',
          { invalidTalentIds }
        )
        return NextResponse.json(error, { status: 400 })
      }
    }

    // Validate that all groups exist and belong to this project
    if (groups.length > 0) {
      const groupIds = groups.map(g => g.groupId)
      const { data: talentGroups, error: groupValidationError } = await supabase
        .from('talent_groups')
        .select('id')
        .eq('project_id', projectId)
        .in('id', groupIds)

      if (groupValidationError) {
        return NextResponse.json(
          { error: 'Failed to validate talent groups', code: 'DATABASE_ERROR' },
          { status: 500 }
        )
      }

      const validGroupIds = new Set(talentGroups?.map(tg => tg.id) || [])
      const invalidGroupIds = groupIds.filter(id => !validGroupIds.has(id))
      
      if (invalidGroupIds.length > 0) {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.VALIDATION_ERROR,
          'Some groups do not belong to this project',
          'groups',
          { invalidGroupIds }
        )
        return NextResponse.json(error, { status: 400 })
      }
    }

    // Collect all escort IDs for availability validation
    const allEscortIds = new Set<string>()
    talents.forEach(t => t.escortIds.forEach(id => allEscortIds.add(id)))
    groups.forEach(g => g.escortIds.forEach(id => allEscortIds.add(id)))

    // Validate escort availability (check if escorts are assigned to this project)
    if (allEscortIds.size > 0) {
      const escortIdsArray = Array.from(allEscortIds)
      const { data: teamAssignments, error: escortValidationError } = await supabase
        .from('team_assignments')
        .select('user_id')
        .eq('project_id', projectId)
        .in('user_id', escortIdsArray)

      if (escortValidationError) {
        return NextResponse.json(
          { error: 'Failed to validate escort assignments', code: 'DATABASE_ERROR' },
          { status: 500 }
        )
      }

      const validEscortIds = new Set(teamAssignments?.map(ta => ta.user_id) || [])
      const invalidEscortIds = escortIdsArray.filter(id => !validEscortIds.has(id))
      
      if (invalidEscortIds.length > 0) {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.ESCORT_NOT_AVAILABLE,
          'Some escorts are not assigned to this project',
          'escorts',
          { invalidEscortIds }
        )
        return NextResponse.json(error, { status: 400 })
      }
    }

    // Perform operations with error handling and rollback capability
    let operationsCompleted = {
      talentCleared: false,
      groupCleared: false,
      talentInserted: false,
      groupInserted: false
    }

    try {
      // For the unified system, we update existing records or insert new ones
      // This preserves scheduling entries while updating escort assignments

      // Handle talent assignments
      if (talents.length > 0) {
        for (const talent of talents) {
          // First, clear existing assignments for this talent on this date
          const { error: clearError } = await supabase
            .from('talent_daily_assignments')
            .delete()
            .eq('project_id', projectId)
            .eq('assignment_date', dateStr)
            .eq('talent_id', talent.talentId)

          if (clearError) {
            throw new Error(`Failed to clear existing talent assignments: ${clearError.message}`)
          }

          // Insert new assignments (or empty entry if no escorts)
          if (talent.escortIds.length > 0) {
            const talentAssignmentRecords = talent.escortIds.map(escortId => ({
              talent_id: talent.talentId,
              project_id: projectId,
              assignment_date: dateStr,
              escort_id: escortId
            }))

            const { error: insertError } = await supabase
              .from('talent_daily_assignments')
              .insert(talentAssignmentRecords)

            if (insertError) {
              throw new Error(`Failed to insert talent assignments: ${insertError.message}`)
            }
          } else {
            // Insert empty entry to maintain scheduling
            const { error: insertError } = await supabase
              .from('talent_daily_assignments')
              .insert({
                talent_id: talent.talentId,
                project_id: projectId,
                assignment_date: dateStr,
                escort_id: null
              })

            if (insertError) {
              throw new Error(`Failed to insert talent scheduling entry: ${insertError.message}`)
            }
          }
        }
        operationsCompleted.talentInserted = true
      }

      // Handle group assignments
      if (groups.length > 0) {
        for (const group of groups) {
          // First, clear existing assignments for this group on this date
          const { error: clearError } = await supabase
            .from('group_daily_assignments')
            .delete()
            .eq('project_id', projectId)
            .eq('assignment_date', dateStr)
            .eq('group_id', group.groupId)

          if (clearError) {
            throw new Error(`Failed to clear existing group assignments: ${clearError.message}`)
          }

          // Insert new assignments (or empty entry if no escorts)
          if (group.escortIds.length > 0) {
            const groupAssignmentRecords = group.escortIds.map(escortId => ({
              group_id: group.groupId,
              project_id: projectId,
              assignment_date: dateStr,
              escort_id: escortId
            }))

            const { error: insertError } = await supabase
              .from('group_daily_assignments')
              .insert(groupAssignmentRecords)

            if (insertError) {
              throw new Error(`Failed to insert group assignments: ${insertError.message}`)
            }
          } else {
            // Insert empty entry to maintain scheduling
            const { error: insertError } = await supabase
              .from('group_daily_assignments')
              .insert({
                group_id: group.groupId,
                project_id: projectId,
                assignment_date: dateStr,
                escort_id: null
              })

            if (insertError) {
              throw new Error(`Failed to insert group scheduling entry: ${insertError.message}`)
            }
          }
        }
        operationsCompleted.groupInserted = true
      }

      // Return success response with assignment counts
      const talentAssignmentCount = talents.reduce((sum, t) => sum + t.escortIds.length, 0)
      const groupAssignmentCount = groups.reduce((sum, g) => sum + g.escortIds.length, 0)

      return NextResponse.json({
        success: true,
        data: {
          date: dateStr,
          assignmentsCreated: {
            talents: talentAssignmentCount,
            groups: groupAssignmentCount,
            total: talentAssignmentCount + groupAssignmentCount
          }
        }
      })

    } catch (error) {
      // Attempt to rollback operations in reverse order
      console.error('Assignment operation failed, attempting rollback:', error)
      
      // Note: In a production system, you would want to implement proper transaction support
      // For now, we rely on the database triggers to maintain scheduled_dates consistency
      // The UI should handle partial failures gracefully and allow retry
      
      throw error
    }

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/assignments/[date]:', error)
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