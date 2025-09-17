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

    // Get staff check-in status
    const shiftTrackingService = createShiftTrackingService(supabase)
    const staffStatus = await shiftTrackingService.getStaffCheckInStatus(projectId)
    
    // Get active shifts with duration
    const activeShifts = await shiftTrackingService.getActiveShiftsWithDuration(projectId)
    
    // Get project KPIs
    const kpis = await shiftTrackingService.calculateProjectKPIs(projectId)

    return NextResponse.json({ 
      data: {
        staffStatus,
        activeShifts,
        kpis
      }
    })

  } catch (error) {
    console.error('Error fetching staff status:', error)
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
    const body = await request.json()
    const { user_ids, action } = body

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

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 })
    }

    if (!['checkout', 'start_break', 'end_break'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Update shifts based on action
    let updateData: any = { updated_at: now }
    
    switch (action) {
      case 'checkout':
        updateData.check_out_time = now
        updateData.status = 'checked_out'
        break
      case 'start_break':
        updateData.status = 'on_break'
        break
      case 'end_break':
        updateData.status = 'checked_in'
        break
    }

    const { data: updatedShifts, error: updateError } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('project_id', projectId)
      .eq('shift_date', today)
      .in('user_id', user_ids)
      .select('id, user_id, status')

    if (updateError) {
      throw new Error(`Failed to update shifts: ${updateError.message}`)
    }

    // If starting/ending breaks, also update break records
    if (action === 'start_break' || action === 'end_break') {
      for (const userId of user_ids) {
        const { data: shift } = await supabase
          .from('shifts')
          .select('id')
          .eq('project_id', projectId)
          .eq('shift_date', today)
          .eq('user_id', userId)
          .single()

        if (shift) {
          if (action === 'start_break') {
            await supabase
              .from('breaks')
              .insert([{
                shift_id: shift.id,
                start_time: now
              }])
          } else if (action === 'end_break') {
            // Find the most recent break without an end time
            const { data: activeBreak } = await supabase
              .from('breaks')
              .select('id')
              .eq('shift_id', shift.id)
              .is('end_time', null)
              .order('start_time', { ascending: false })
              .limit(1)
              .single()

            if (activeBreak) {
              await supabase
                .from('breaks')
                .update({ end_time: now })
                .eq('id', activeBreak.id)
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      message: `Successfully ${action.replace('_', ' ')}ed ${updatedShifts?.length || 0} staff members`,
      data: updatedShifts
    })

  } catch (error) {
    console.error('Error updating staff status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}