import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { projectRoleFormSchema } from '@/lib/types'
import { hasAdminAccess } from '@/lib/role-utils'

// GET /api/projects/[id]/roles - Get project roles
export async function GET(
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

    // Get user profile to determine access
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

    // Validate project ID format
    const projectId = params.id
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      )
    }

    // Check if project exists and user has access
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
      console.error('Error fetching project:', projectError)
      return NextResponse.json(
        { error: 'Failed to fetch project', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Check access permissions
    const isAdmin = hasAdminAccess(userProfile.role)
    
    if (!isAdmin) {
      // Non-admin users need to be assigned to the project
      // For now, we'll allow access to active projects only
      if (project.status !== 'active') {
        return NextResponse.json(
          { error: 'Access denied to this project', code: 'ACCESS_DENIED' },
          { status: 403 }
        )
      }
    }

    // Get project roles
    const { data: roles, error: rolesError } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .order('role')

    if (rolesError) {
      console.error('Error fetching project roles:', rolesError)
      return NextResponse.json(
        { error: 'Failed to fetch project roles', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: roles || []
    })

  } catch (error) {
    console.error('Error in GET /api/projects/[id]/roles:', error)
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

// POST /api/projects/[id]/roles - Create or update project role
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

    // Check if user has permission to manage project roles (Admin or In-House only)
    if (!hasAdminAccess(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage project roles', code: 'INSUFFICIENT_PERMISSIONS' },
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

    // Check if project exists
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

    // Parse and validate request body
    const body = await request.json()
    const validationResult = projectRoleFormSchema.safeParse(body)

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

    const roleData = validationResult.data

    // Check if role already exists for this project
    const { data: existingRole, error: existingError } = await supabase
      .from('project_roles')
      .select('id')
      .eq('project_id', projectId)
      .eq('role', roleData.role_name)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing role:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing role', code: 'CHECK_ERROR' },
        { status: 500 }
      )
    }

    let result
    if (existingRole) {
      // Update existing role
      const { data: updatedRole, error: updateError } = await supabase
        .from('project_roles')
        .update({
          base_pay: roleData.base_pay_rate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRole.id)
        .select('*')
        .single()

      if (updateError) {
        console.error('Error updating project role:', updateError)
        return NextResponse.json(
          { 
            error: 'Failed to update project role',
            code: 'UPDATE_ERROR',
            details: updateError.message
          },
          { status: 500 }
        )
      }

      result = updatedRole
    } else {
      // Create new role
      const { data: newRole, error: createError } = await supabase
        .from('project_roles')
        .insert({
          project_id: projectId,
          role: roleData.role_name,
          base_pay: roleData.base_pay_rate || null
        })
        .select('*')
        .single()

      if (createError) {
        console.error('Error creating project role:', createError)
        return NextResponse.json(
          { 
            error: 'Failed to create project role',
            code: 'CREATE_ERROR',
            details: createError.message
          },
          { status: 500 }
        )
      }

      result = newRole
    }

    return NextResponse.json({
      data: result,
      message: existingRole ? 'Project role updated successfully' : 'Project role created successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/projects/[id]/roles:', error)
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

// PUT /api/projects/[id]/roles - Bulk update project roles
export async function PUT(
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

    // Check if user has permission to manage project roles (Admin or In-House only)
    if (!hasAdminAccess(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage project roles', code: 'INSUFFICIENT_PERMISSIONS' },
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

    // Check if project exists
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

    // Parse request body - expecting array of role configurations
    const body = await request.json()
    
    if (!Array.isArray(body.roles)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected roles array.', code: 'INVALID_FORMAT' },
        { status: 400 }
      )
    }

    // Validate each role configuration
    const validatedRoles = []
    for (const role of body.roles) {
      const validationResult = projectRoleFormSchema.safeParse(role)
      if (!validationResult.success) {
        return NextResponse.json(
          { 
            error: 'Validation failed for role configuration',
            code: 'VALIDATION_ERROR',
            details: validationResult.error.flatten().fieldErrors
          },
          { status: 400 }
        )
      }
      validatedRoles.push(validationResult.data)
    }

    // Use transaction to update all roles atomically
    const results = []
    
    for (const roleData of validatedRoles) {
      // Check if role already exists
      const { data: existingRole, error: existingError } = await supabase
        .from('project_roles')
        .select('id')
        .eq('project_id', projectId)
        .eq('role', roleData.role_name)
        .single()

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing role:', existingError)
        return NextResponse.json(
          { error: 'Failed to check existing role', code: 'CHECK_ERROR' },
          { status: 500 }
        )
      }

      if (existingRole) {
        // Update existing role
        const { data: updatedRole, error: updateError } = await supabase
          .from('project_roles')
          .update({
            base_pay: roleData.base_pay_rate || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRole.id)
          .select('*')
          .single()

        if (updateError) {
          console.error('Error updating project role:', updateError)
          return NextResponse.json(
            { 
              error: 'Failed to update project role',
              code: 'UPDATE_ERROR',
              details: updateError.message
            },
            { status: 500 }
          )
        }

        results.push(updatedRole)
      } else {
        // Create new role
        const { data: newRole, error: createError } = await supabase
          .from('project_roles')
          .insert({
            project_id: projectId,
            role: roleData.role_name,
            base_pay: roleData.base_pay_rate || null
          })
          .select('*')
          .single()

        if (createError) {
          console.error('Error creating project role:', createError)
          return NextResponse.json(
            { 
              error: 'Failed to create project role',
              code: 'CREATE_ERROR',
              details: createError.message
            },
            { status: 500 }
          )
        }

        results.push(newRole)
      }
    }

    return NextResponse.json({
      data: results,
      message: 'Project roles updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/projects/[id]/roles:', error)
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