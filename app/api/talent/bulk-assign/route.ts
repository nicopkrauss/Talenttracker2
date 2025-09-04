import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema for bulk assignment
const bulkAssignmentSchema = z.object({
  talent_ids: z.array(z.string().uuid("Invalid talent ID")).min(1, "At least one talent ID is required"),
  project_ids: z.array(z.string().uuid("Invalid project ID")).min(1, "At least one project ID is required"),
  operation: z.enum(['assign', 'unassign'], {
    required_error: "Operation must be 'assign' or 'unassign'"
  }),
  escort_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'completed']).default('active')
})

// POST /api/talent/bulk-assign - Bulk assign/unassign talent to/from projects
export async function POST(request: NextRequest) {
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

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user has permission for bulk operations
    const allowedRoles = ['admin', 'in_house', 'supervisor', 'coordinator']
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for bulk operations', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = bulkAssignmentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const { talent_ids, project_ids, operation, escort_id, status } = validationResult.data

    // Verify all talent exist
    const { data: existingTalent, error: talentCheckError } = await supabase
      .from('talent')
      .select('id, first_name, last_name')
      .in('id', talent_ids)

    if (talentCheckError) {
      return NextResponse.json(
        { error: 'Failed to verify talent', code: 'TALENT_CHECK_ERROR' },
        { status: 500 }
      )
    }

    if (!existingTalent || existingTalent.length !== talent_ids.length) {
      const foundIds = existingTalent?.map(t => t.id) || []
      const missingIds = talent_ids.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { 
          error: 'Some talent not found',
          code: 'TALENT_NOT_FOUND',
          details: { missing_talent_ids: missingIds }
        },
        { status: 404 }
      )
    }

    // Verify all projects exist
    const { data: existingProjects, error: projectCheckError } = await supabase
      .from('projects')
      .select('id, name, status')
      .in('id', project_ids)

    if (projectCheckError) {
      return NextResponse.json(
        { error: 'Failed to verify projects', code: 'PROJECT_CHECK_ERROR' },
        { status: 500 }
      )
    }

    if (!existingProjects || existingProjects.length !== project_ids.length) {
      const foundIds = existingProjects?.map(p => p.id) || []
      const missingIds = project_ids.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { 
          error: 'Some projects not found',
          code: 'PROJECT_NOT_FOUND',
          details: { missing_project_ids: missingIds }
        },
        { status: 404 }
      )
    }

    // Verify escort exists if provided
    if (escort_id) {
      const { data: escort, error: escortError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', escort_id)
        .single()

      if (escortError || !escort) {
        return NextResponse.json(
          { error: 'Escort not found', code: 'ESCORT_NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    const results = {
      successful: [] as Array<{ talent_id: string, project_id: string, action: string }>,
      failed: [] as Array<{ talent_id: string, project_id: string, error: string }>,
      skipped: [] as Array<{ talent_id: string, project_id: string, reason: string }>
    }

    if (operation === 'assign') {
      // Bulk assign talent to projects
      for (const talentId of talent_ids) {
        for (const projectId of project_ids) {
          try {
            // Check if assignment already exists
            const { data: existingAssignment } = await supabase
              .from('talent_project_assignments')
              .select('id, status')
              .eq('talent_id', talentId)
              .eq('project_id', projectId)
              .single()

            if (existingAssignment) {
              if (existingAssignment.status === 'active') {
                results.skipped.push({
                  talent_id: talentId,
                  project_id: projectId,
                  reason: 'Already assigned and active'
                })
                continue
              } else {
                // Update existing inactive assignment to active
                const { error: updateError } = await supabase
                  .from('talent_project_assignments')
                  .update({
                    status: status,
                    assigned_by: user.id,
                    escort_id: escort_id || null,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingAssignment.id)

                if (updateError) {
                  results.failed.push({
                    talent_id: talentId,
                    project_id: projectId,
                    error: updateError.message
                  })
                } else {
                  results.successful.push({
                    talent_id: talentId,
                    project_id: projectId,
                    action: 'reactivated'
                  })
                }
              }
            } else {
              // Create new assignment
              const { error: insertError } = await supabase
                .from('talent_project_assignments')
                .insert({
                  talent_id: talentId,
                  project_id: projectId,
                  assigned_by: user.id,
                  escort_id: escort_id || null,
                  status: status
                })

              if (insertError) {
                results.failed.push({
                  talent_id: talentId,
                  project_id: projectId,
                  error: insertError.message
                })
              } else {
                results.successful.push({
                  talent_id: talentId,
                  project_id: projectId,
                  action: 'assigned'
                })
              }
            }
          } catch (error) {
            results.failed.push({
              talent_id: talentId,
              project_id: projectId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }
    } else {
      // Bulk unassign talent from projects
      for (const talentId of talent_ids) {
        for (const projectId of project_ids) {
          try {
            // Check if assignment exists and is active
            const { data: existingAssignment } = await supabase
              .from('talent_project_assignments')
              .select('id, status')
              .eq('talent_id', talentId)
              .eq('project_id', projectId)
              .eq('status', 'active')
              .single()

            if (!existingAssignment) {
              results.skipped.push({
                talent_id: talentId,
                project_id: projectId,
                reason: 'No active assignment found'
              })
              continue
            }

            // Update assignment to inactive
            const { error: updateError } = await supabase
              .from('talent_project_assignments')
              .update({
                status: 'inactive',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingAssignment.id)

            if (updateError) {
              results.failed.push({
                talent_id: talentId,
                project_id: projectId,
                error: updateError.message
              })
            } else {
              results.successful.push({
                talent_id: talentId,
                project_id: projectId,
                action: 'unassigned'
              })
            }
          } catch (error) {
            results.failed.push({
              talent_id: talentId,
              project_id: projectId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }
    }

    // Log the bulk operation for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_bulk_assignment',
        user_id: user.id,
        details: `Bulk ${operation}: ${results.successful.length} successful, ${results.failed.length} failed, ${results.skipped.length} skipped`
      })

    return NextResponse.json({
      message: `Bulk ${operation} operation completed`,
      results: {
        total_operations: talent_ids.length * project_ids.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        details: results
      }
    })

  } catch (error) {
    console.error('Error in POST /api/talent/bulk-assign:', error)
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