import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { hasAdminAccess } from '@/lib/role-utils'

// POST /api/projects/[id]/roles/complete - Mark roles and pay as complete
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

    // Check if user has permission to manage project setup (Admin or In-House only)
    if (!hasAdminAccess(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage project setup', code: 'INSUFFICIENT_PERMISSIONS' },
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

    // Check if project exists and is in prep status
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', projectId)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
          { status: 404 }
        )
      }
      console.error('Error checking project existence:', projectError)
      return NextResponse.json(
        { error: 'Failed to verify project', code: 'VERIFICATION_ERROR' },
        { status: 500 }
      )
    }

    // Verify that roles are actually configured
    const { data: roles, error: rolesError } = await supabase
      .from('project_roles')
      .select('id, base_pay')
      .eq('project_id', projectId)
      .not('base_pay', 'is', null)

    if (rolesError) {
      console.error('Error checking project roles:', rolesError)
      return NextResponse.json(
        { error: 'Failed to verify project roles', code: 'VERIFICATION_ERROR' },
        { status: 500 }
      )
    }

    if (!roles || roles.length === 0) {
      return NextResponse.json(
        { error: 'No roles with pay rates configured. Please configure at least one role before marking as complete.', code: 'NO_ROLES_CONFIGURED' },
        { status: 400 }
      )
    }

    // Update the checklist to mark roles and pay as complete
    const { data: updatedChecklist, error: updateError } = await supabase
      .from('project_setup_checklist')
      .update({
        roles_and_pay_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating project setup checklist:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update project setup checklist',
          code: 'UPDATE_ERROR',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedChecklist,
      message: 'Project roles and pay rates marked as complete'
    })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/roles/complete:', error)
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

// DELETE /api/projects/[id]/roles/complete - Mark roles and pay as incomplete
export async function DELETE(
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

    // Check if user has permission to manage project setup (Admin or In-House only)
    if (!hasAdminAccess(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage project setup', code: 'INSUFFICIENT_PERMISSIONS' },
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

    // Update the checklist to mark roles and pay as incomplete
    const { data: updatedChecklist, error: updateError } = await supabase
      .from('project_setup_checklist')
      .update({
        roles_and_pay_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating project setup checklist:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update project setup checklist',
          code: 'UPDATE_ERROR',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedChecklist,
      message: 'Project roles and pay rates marked as incomplete'
    })

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/roles/complete:', error)
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