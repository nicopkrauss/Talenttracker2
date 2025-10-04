import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
) {
  try {
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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id: projectId, date: dateStr } = await params

    // Validate date format
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format', code: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    // Create a new floater entry in talent_daily_assignments with talent_id = NULL
    const { data: newFloater, error } = await supabase
      .from('talent_daily_assignments')
      .insert({
        talent_id: null, // This makes it a floater
        project_id: projectId,
        assignment_date: dateStr,
        escort_id: null // Unassigned floater slot
      })
      .select(`
        id,
        talent_id,
        project_id,
        assignment_date,
        escort_id,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error creating floater assignment:', error)
      return NextResponse.json(
        { error: 'Failed to create floater assignment', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Transform the data to match our interface
    const transformedFloater = {
      id: newFloater.id,
      projectId: newFloater.project_id,
      assignmentDate: newFloater.assignment_date,
      escortId: newFloater.escort_id,
      escortName: undefined,
      createdAt: newFloater.created_at,
      updatedAt: newFloater.updated_at
    }

    return NextResponse.json({
      floaterAssignment: transformedFloater
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
) {
  try {
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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id: projectId, date: dateStr } = await params
    const body = await request.json()
    const { floaterId, escortId } = body

    if (!floaterId) {
      return NextResponse.json(
        { error: 'Floater ID is required', code: 'MISSING_FLOATER_ID' },
        { status: 400 }
      )
    }

    // Update the floater assignment (entry with talent_id = NULL)
    const { data: updatedFloater, error } = await supabase
      .from('talent_daily_assignments')
      .update({
        escort_id: escortId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', floaterId)
      .eq('project_id', projectId) // Ensure user can only update assignments for this project
      .eq('assignment_date', dateStr) // Ensure date matches
      .is('talent_id', null) // Ensure this is actually a floater (talent_id = NULL)
      .select(`
        id,
        talent_id,
        project_id,
        assignment_date,
        escort_id,
        created_at,
        updated_at,
        escort:escort_id (
          id,
          full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating floater assignment:', error)
      return NextResponse.json(
        { error: 'Failed to update floater assignment', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Transform the data to match our interface
    const transformedFloater = {
      id: updatedFloater.id,
      projectId: updatedFloater.project_id,
      assignmentDate: updatedFloater.assignment_date,
      escortId: updatedFloater.escort_id,
      escortName: (updatedFloater.escort as any)?.full_name,
      createdAt: updatedFloater.created_at,
      updatedAt: updatedFloater.updated_at
    }

    return NextResponse.json({
      floaterAssignment: transformedFloater
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
) {
  try {
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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id: projectId, date: dateStr } = await params
    const { searchParams } = new URL(request.url)
    const floaterId = searchParams.get('floaterId')

    if (!floaterId) {
      return NextResponse.json(
        { error: 'Floater ID is required', code: 'MISSING_FLOATER_ID' },
        { status: 400 }
      )
    }

    // Delete the floater assignment (entry with talent_id = NULL)
    const { error } = await supabase
      .from('talent_daily_assignments')
      .delete()
      .eq('id', floaterId)
      .eq('project_id', projectId) // Ensure user can only delete assignments for this project
      .eq('assignment_date', dateStr) // Ensure date matches
      .is('talent_id', null) // Ensure this is actually a floater (talent_id = NULL)

    if (error) {
      console.error('Error deleting floater assignment:', error)
      return NextResponse.json(
        { error: 'Failed to delete floater assignment', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}