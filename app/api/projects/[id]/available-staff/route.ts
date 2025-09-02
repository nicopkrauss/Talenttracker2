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

    // Get all active staff members
    const { data: availableStaff, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        nearest_major_city,
        willing_to_fly,
        role,
        status,
        created_at
      `)
      .eq('status', 'active')
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Error fetching available staff:', error)
      return NextResponse.json({ error: 'Failed to fetch available staff' }, { status: 500 })
    }

    // Get existing team assignments for this project
    const { data: existingAssignments } = await supabase
      .from('team_assignments')
      .select('user_id')
      .eq('project_id', projectId)

    // Filter out staff who are already assigned
    const assignedUserIds = new Set(existingAssignments?.map(a => a.user_id) || [])
    const filteredStaff = (availableStaff || []).filter(staff => 
      !assignedUserIds.has(staff.id)
    )

    // Filter staff to only include those who can be assigned to projects
    // (exclude pending users and include all system roles and users without system roles)
    const eligibleStaff = filteredStaff.filter(staff => 
      staff.status === 'active' && 
      (staff.role === null || ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'].includes(staff.role))
    )

    return NextResponse.json({ staff: eligibleStaff })
  } catch (error) {
    console.error('Available staff API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}