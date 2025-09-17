import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createShiftTrackingService } from '@/lib/shift-tracking-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const projectId = id

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

    // Get shift alerts
    const shiftTrackingService = createShiftTrackingService(supabase)
    const alerts = await shiftTrackingService.getShiftAlerts(projectId)
    
    return NextResponse.json({ data: alerts })

  } catch (error) {
    console.error('Error fetching shift alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const projectId = id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has supervisor or admin role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'in_house'].includes(userProfile.role)) {
      // Check if user is a supervisor on this project
      const { data: teamAssignment } = await supabase
        .from('team_assignments')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!teamAssignment || teamAssignment.role !== 'supervisor') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Send shift alert notifications
    const shiftTrackingService = createShiftTrackingService(supabase)
    await shiftTrackingService.sendShiftAlertNotifications(projectId)
    
    return NextResponse.json({ 
      message: 'Shift alert notifications sent successfully' 
    })

  } catch (error) {
    console.error('Error sending shift alert notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}