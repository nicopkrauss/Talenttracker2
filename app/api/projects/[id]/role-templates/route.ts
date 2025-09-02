import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ProjectRoleTemplateFormData } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: projectId } = await params

    // Get role templates for the project
    const { data: roleTemplates, error } = await supabase
      .from('project_role_templates')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching role templates:', error)
      return NextResponse.json({ error: 'Failed to fetch role templates' }, { status: 500 })
    }

    return NextResponse.json({ roleTemplates })
  } catch (error) {
    console.error('Error in role templates GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const body: ProjectRoleTemplateFormData = await request.json()

    // Validate required fields
    if (!body.role || !body.display_name || !body.base_pay_rate || !body.time_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { id: projectId } = await params

    // Check if a template with this display name already exists for this role in this project
    const { data: existing } = await supabase
      .from('project_role_templates')
      .select('id')
      .eq('project_id', projectId)
      .eq('role', body.role)
      .eq('display_name', body.display_name)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A template with this display name already exists for this role' }, { status: 409 })
    }

    // Get next sort order
    const { data: maxSort } = await supabase
      .from('project_role_templates')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextSortOrder = (maxSort?.sort_order || 0) + 1

    // If setting as default, unset other defaults for this role
    if (body.is_default) {
      await supabase
        .from('project_role_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)
        .eq('role', body.role)
        .eq('is_default', true)
    }

    // Create role template
    const { data: roleTemplate, error } = await supabase
      .from('project_role_templates')
      .insert({
        project_id: projectId,
        role: body.role,
        display_name: body.display_name,
        base_pay_rate: body.base_pay_rate,
        time_type: body.time_type,
        description: body.description,
        is_active: body.is_active ?? true,
        is_default: body.is_default ?? false,
        sort_order: body.sort_order ?? nextSortOrder
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating role template:', error)
      return NextResponse.json({ error: 'Failed to create role template' }, { status: 500 })
    }

    return NextResponse.json({ roleTemplate }, { status: 201 })
  } catch (error) {
    console.error('Error in role templates POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}