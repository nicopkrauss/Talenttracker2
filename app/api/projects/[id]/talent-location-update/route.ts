import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const projectId = params.id
    const body = await request.json()
    const { talent_id, location_name } = body

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!talent_id || !location_name) {
      return NextResponse.json({ 
        error: 'Talent ID and location name are required' 
      }, { status: 400 })
    }

    // Get the location ID for the given location name
    const { data: location, error: locationError } = await supabase
      .from('project_locations')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', location_name)
      .single()

    if (locationError || !location) {
      return NextResponse.json({ 
        error: `Location '${location_name}' not found in project` 
      }, { status: 404 })
    }

    // Update talent status
    const now = new Date().toISOString()
    const { data: updatedStatus, error: updateError } = await supabase
      .from('talent_status')
      .upsert({
        talent_id,
        project_id: projectId,
        current_location_id: location.id,
        status: location_name === 'House' ? 'on_location' : 'on_location',
        last_updated: now,
        updated_by: user.id,
        updated_at: now
      }, {
        onConflict: 'talent_id,project_id'
      })
      .select()

    if (updateError) {
      throw new Error(`Failed to update talent status: ${updateError.message}`)
    }

    // Create a notification for the talent's escort if they have one
    const { data: assignment } = await supabase
      .from('talent_project_assignments')
      .select(`
        escort_id,
        talent!inner(first_name, last_name)
      `)
      .eq('talent_id', talent_id)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single()

    if (assignment?.escort_id) {
      await supabase
        .from('notifications')
        .insert([{
          user_id: assignment.escort_id,
          title: 'Talent Location Update',
          message: `${assignment.talent.first_name} ${assignment.talent.last_name} moved to ${location_name}`,
          type: 'talent_location_update',
          project_id: projectId
        }])
    }

    return NextResponse.json({ 
      message: 'Talent location updated successfully',
      data: updatedStatus
    })

  } catch (error) {
    console.error('Error updating talent location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}