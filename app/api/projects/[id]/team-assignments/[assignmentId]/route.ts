import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: projectId, assignmentId } = await params
    const body = await request.json()

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

    const { role, pay_rate, schedule_notes, available_dates } = body

    // Validate role if provided
    if (role) {
      const validRoles = ['supervisor', 'coordinator', 'talent_escort']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
    }

    // Validate pay rate if provided
    if (pay_rate !== undefined && (pay_rate < 0 || pay_rate > 10000)) {
      return NextResponse.json({ error: 'Pay rate must be between 0 and 10000' }, { status: 400 })
    }

    // Validate available_dates if provided
    if (available_dates !== undefined) {
      if (available_dates !== null && !Array.isArray(available_dates)) {
        return NextResponse.json({ error: 'Available dates must be an array or null' }, { status: 400 })
      }
      
      // Validate each date string (only if not null)
      if (available_dates !== null) {
        for (const dateStr of available_dates) {
          if (typeof dateStr !== 'string' || isNaN(Date.parse(dateStr))) {
            return NextResponse.json({ error: 'Invalid date format in available_dates' }, { status: 400 })
          }
        }
      }
    }

    // Prepare update object
    const updateData: any = {}
    if (role) updateData.role = role
    if (pay_rate !== undefined) updateData.pay_rate = pay_rate
    if (schedule_notes !== undefined) updateData.schedule_notes = schedule_notes
    
    // Handle availability confirmation/unconfirmation
    if (available_dates !== undefined) {
      updateData.available_dates = available_dates
      if (available_dates === null) {
        // Unconfirming - clear both available_dates and confirmed_at
        updateData.confirmed_at = null
      } else {
        // Confirming - set confirmed_at timestamp
        updateData.confirmed_at = new Date().toISOString()
      }
    }
    
    // Handle explicit confirmed_at updates (for unconfirm operation)
    if (body.confirmed_at !== undefined) {
      updateData.confirmed_at = body.confirmed_at
    }

    // Update team assignment
    const { data: assignment, error } = await supabase
      .from('team_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .eq('project_id', projectId)
      .select(`
        id,
        user_id,
        role,
        pay_rate,
        time_type,
        schedule_notes,
        available_dates,
        confirmed_at,
        created_at,
        profiles!inner(
          id,
          full_name,
          email,
          phone,
          nearest_major_city,
          willing_to_fly
        )
      `)
      .single()

    if (error) {
      console.error('Error updating team assignment:', error)
      return NextResponse.json({ error: 'Failed to update team assignment' }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Team assignment not found' }, { status: 404 })
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Team assignment update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: projectId, assignmentId } = await params

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

    // Delete team assignment
    const { error } = await supabase
      .from('team_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('project_id', projectId)

    if (error) {
      console.error('Error deleting team assignment:', error)
      return NextResponse.json({ error: 'Failed to delete team assignment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Team assignment delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}