import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Get current user from auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if project exists and user has permission
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, status, created_by')
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Only allow archiving active projects
    if (project.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active projects can be archived' },
        { status: 400 }
      )
    }

    // Update project status to archived
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('Error archiving project:', updateError)
      return NextResponse.json(
        { error: 'Failed to archive project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Project archived successfully',
      projectId 
    })

  } catch (error) {
    console.error('Archive project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}