import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // Get all team assignments across all projects (for badge functionality)
    const { data: assignments, error } = await supabase
      .from('team_assignments')
      .select(`
        id,
        user_id,
        project_id,
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
        ),
        projects!inner(
          id,
          name,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all team assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch team assignments' }, { status: 500 })
    }

    return NextResponse.json({ assignments: assignments || [] })
  } catch (error) {
    console.error('Global team assignments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}