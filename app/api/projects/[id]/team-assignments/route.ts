import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    // Get team assignments for the project
    const { data: assignments, error } = await supabase
      .from('team_assignments')
      .select(`
        id,
        user_id,
        role,
        pay_rate,
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
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching team assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch team assignments' }, { status: 500 })
    }

    return NextResponse.json({ assignments: assignments || [] })
  } catch (error) {
    console.error('Team assignments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: projectId } = await params
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

    const { user_id, role, pay_rate, schedule_notes } = body

    // Validate required fields
    if (!user_id || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['supervisor', 'coordinator', 'talent_escort']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Validate pay rate if provided
    if (pay_rate !== undefined && (pay_rate < 0 || pay_rate > 10000)) {
      return NextResponse.json({ error: 'Pay rate must be between 0 and 10000' }, { status: 400 })
    }

    // Create team assignment
    const { data: assignment, error } = await supabase
      .from('team_assignments')
      .insert({
        project_id: projectId,
        user_id,
        role,
        pay_rate: pay_rate || null,
        schedule_notes: schedule_notes || null
      })
      .select(`
        id,
        user_id,
        role,
        pay_rate,
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
      console.error('Error creating team assignment:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'User is already assigned to this project' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create team assignment' }, { status: 500 })
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Team assignments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}