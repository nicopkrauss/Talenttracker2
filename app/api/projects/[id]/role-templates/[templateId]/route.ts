import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ProjectRoleTemplateFormData } from '@/lib/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
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
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage this project
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'in_house'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: Partial<ProjectRoleTemplateFormData> = await request.json()

    const { id: projectId, templateId } = await params

    // Get the current template to check its role
    const { data: currentTemplate } = await supabase
      .from('project_role_templates')
      .select('role')
      .eq('id', templateId)
      .eq('project_id', projectId)
      .single()

    if (!currentTemplate) {
      return NextResponse.json({ error: 'Role template not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults for this role
    if (body.is_default) {
      await supabase
        .from('project_role_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)
        .eq('role', currentTemplate.role)
        .eq('is_default', true)
        .neq('id', templateId)
    }

    // Update role template
    const { data: roleTemplate, error } = await supabase
      .from('project_role_templates')
      .update({
        display_name: body.display_name,
        base_pay_rate: body.base_pay_rate,
        time_type: body.time_type,
        description: body.description,
        is_active: body.is_active,
        is_default: body.is_default,
        sort_order: body.sort_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating role template:', error)
      return NextResponse.json({ error: 'Failed to update role template' }, { status: 500 })
    }

    if (!roleTemplate) {
      return NextResponse.json({ error: 'Role template not found' }, { status: 404 })
    }

    return NextResponse.json({ roleTemplate })
  } catch (error) {
    console.error('Error in role template PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
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
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage this project
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'in_house'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: projectId, templateId } = await params

    // Check if role template has any assignments
    const { data: assignments } = await supabase
      .from('team_assignments')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)

    // Get the role template to check its role
    const { data: template } = await supabase
      .from('project_role_templates')
      .select('role')
      .eq('id', templateId)
      .single()

    if (template && assignments) {
      const { data: roleAssignments } = await supabase
        .from('team_assignments')
        .select('id')
        .eq('project_id', projectId)
        .eq('role', template.role)
        .limit(1)

      if (roleAssignments && roleAssignments.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete role template with existing assignments' 
        }, { status: 409 })
      }
    }

    // Soft delete by setting is_active to false
    const { data: roleTemplate, error } = await supabase
      .from('project_role_templates')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      console.error('Error deleting role template:', error)
      return NextResponse.json({ error: 'Failed to delete role template' }, { status: 500 })
    }

    if (!roleTemplate) {
      return NextResponse.json({ error: 'Role template not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Role template deleted successfully' })
  } catch (error) {
    console.error('Error in role template DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}