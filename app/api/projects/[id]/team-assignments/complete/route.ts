import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: projectId } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'in_house'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update the team assignments checklist item
    const { data: checklist, error } = await supabase
      .from('project_setup_checklist')
      .update({ team_assignments_completed: true })
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating team assignments checklist:', error)
      return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      checklist: {
        team_assignments_completed: true
      }
    })
  } catch (error) {
    console.error('Team assignments complete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}