import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { hasAdminAccess } from '@/lib/role-utils'

// POST /api/projects/[id]/activate - Activate project (change status from prep to active)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get authenticated user (more secure than getSession)
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

    // Check if user has permission to activate projects (Admin or In-House only)
    if (!hasAdminAccess(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to activate projects', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Validate project ID format
    const projectId = params.id
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      )
    }

    // Get current project status and setup checklist
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id, 
        name, 
        status,
        project_setup_checklist (
          roles_and_pay_completed,
          talent_roster_completed,
          team_assignments_completed,
          locations_completed,
          completed_at
        )
      `)
      .eq('id', projectId)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
          { status: 404 }
        )
      }
      console.error('Error fetching project:', projectError)
      return NextResponse.json(
        { error: 'Failed to fetch project', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Check if project is in prep status
    if (project.status !== 'prep') {
      return NextResponse.json(
        { 
          error: `Project cannot be activated. Current status: ${project.status}`,
          code: 'INVALID_STATUS_TRANSITION',
          current_status: project.status
        },
        { status: 400 }
      )
    }

    // Check if setup checklist is complete
    const checklist = project.project_setup_checklist
    if (!checklist) {
      return NextResponse.json(
        { 
          error: 'Project setup checklist not found. Please complete project setup first.',
          code: 'CHECKLIST_NOT_FOUND'
        },
        { status: 400 }
      )
    }

    const isChecklistComplete = checklist.roles_and_pay_completed &&
                               checklist.talent_roster_completed &&
                               checklist.team_assignments_completed &&
                               checklist.locations_completed

    if (!isChecklistComplete) {
      const incompleteItems = []
      if (!checklist.roles_and_pay_completed) incompleteItems.push('Project Roles & Pay Rates')
      if (!checklist.talent_roster_completed) incompleteItems.push('Talent Roster')
      if (!checklist.team_assignments_completed) incompleteItems.push('Team Assignments')
      if (!checklist.locations_completed) incompleteItems.push('Talent Locations')

      return NextResponse.json(
        { 
          error: 'Project cannot be activated. Please complete all setup checklist items.',
          code: 'CHECKLIST_INCOMPLETE',
          incomplete_items: incompleteItems
        },
        { status: 400 }
      )
    }

    // Activate the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        id,
        name,
        description,
        production_company,
        hiring_contact,
        project_location: location,
        start_date,
        end_date,
        status,
        created_at,
        updated_at,
        created_by
      `)
      .single()

    if (updateError) {
      console.error('Error activating project:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to activate project',
          code: 'ACTIVATION_ERROR',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    // TODO: Send notifications to team members about project activation
    // This will be implemented when the notification system is integrated

    return NextResponse.json({
      data: updatedProject,
      message: `Project "${project.name}" has been activated successfully`
    })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/activate:', error)
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

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to activate projects.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to activate projects.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to activate projects.' },
    { status: 405 }
  )
}