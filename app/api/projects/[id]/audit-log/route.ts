import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get pagination parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Fetch audit log entries
    const { data: auditLog, error: auditError } = await supabase
      .from('project_audit_log')
      .select(`
        id,
        action,
        details,
        created_at,
        user:profiles!project_audit_log_user_id_fkey(
          id,
          full_name
        )
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (auditError) {
      console.error('Error fetching audit log:', auditError)
      return NextResponse.json(
        { error: 'Failed to fetch audit log', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('project_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id)

    if (countError) {
      console.error('Error fetching audit log count:', countError)
      return NextResponse.json(
        { error: 'Failed to fetch audit log count', code: 'COUNT_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: auditLog || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }
    })
  } catch (error) {
    console.error('Audit Log API Error:', error)
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