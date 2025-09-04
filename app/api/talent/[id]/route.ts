import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { talentProfileSchema } from '@/lib/types'

// GET /api/talent/[id] - Get specific talent by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get user profile to determine access
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user is approved/active
    if (userProfile.status !== 'approved' && userProfile.status !== 'active') {
      return NextResponse.json(
        { error: 'Account not approved', code: 'ACCOUNT_NOT_APPROVED' },
        { status: 403 }
      )
    }

    // Fetch talent with all related data
    const { data: talent, error: talentError } = await supabase
      .from('talent')
      .select(`
        id,
        first_name,
        last_name,
        rep_name,
        rep_email,
        rep_phone,
        notes,
        contact_info,
        created_at,
        updated_at,
        talent_project_assignments(
          id,
          project_id,
          status,
          assigned_at,
          assigned_by,
          escort_id,
          projects(id, name, status),
          assigned_escort:profiles!talent_project_assignments_escort_idToprofiles(id, full_name),
          assigned_by_profile:profiles!talent_project_assignments_assigned_byToprofiles(id, full_name)
        ),
        talent_status(
          id,
          project_id,
          current_location_id,
          status,
          last_updated,
          updated_by,
          projects(name),
          current_location:project_locations(name, color),
          updated_by_profile:profiles(full_name)
        )
      `)
      .eq('id', params.id)
      .single()

    if (talentError) {
      if (talentError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Talent not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      console.error('Error fetching talent:', talentError)
      return NextResponse.json(
        { error: 'Failed to fetch talent', code: 'FETCH_ERROR', details: talentError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: talent
    })

  } catch (error) {
    console.error('Error in GET /api/talent/[id]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/talent/[id] - Update talent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user has permission to update talent
    const allowedRoles = ['admin', 'in_house', 'supervisor', 'coordinator']
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update talent', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = talentProfileSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const talentData = validationResult.data

    // Check if talent exists
    const { data: existingTalent, error: checkError } = await supabase
      .from('talent')
      .select('id, first_name, last_name')
      .eq('id', params.id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Talent not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to check talent existence', code: 'CHECK_ERROR' },
        { status: 500 }
      )
    }

    // Update the talent record
    const { data: updatedTalent, error: updateError } = await supabase
      .from('talent')
      .update({
        first_name: talentData.first_name,
        last_name: talentData.last_name,
        rep_name: talentData.rep_name,
        rep_email: talentData.rep_email,
        rep_phone: talentData.rep_phone,
        notes: talentData.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        id,
        first_name,
        last_name,
        rep_name,
        rep_email,
        rep_phone,
        notes,
        contact_info,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating talent:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update talent',
          code: 'UPDATE_ERROR',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    // Log the update for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_updated',
        user_id: user.id,
        details: `Updated talent: ${existingTalent.first_name} ${existingTalent.last_name} -> ${talentData.first_name} ${talentData.last_name}`
      })

    return NextResponse.json({
      data: updatedTalent,
      message: 'Talent updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/talent/[id]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/talent/[id] - Delete talent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if user has permission to delete talent (Admin and In-House only)
    if (!userProfile.role || !['admin', 'in_house'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete talent', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Check if talent exists and get info for audit log
    const { data: existingTalent, error: checkError } = await supabase
      .from('talent')
      .select('id, first_name, last_name')
      .eq('id', params.id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Talent not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to check talent existence', code: 'CHECK_ERROR' },
        { status: 500 }
      )
    }

    // Check if talent has active assignments
    const { data: activeAssignments, error: assignmentError } = await supabase
      .from('talent_project_assignments')
      .select('id, projects(name)')
      .eq('talent_id', params.id)
      .eq('status', 'active')

    if (assignmentError) {
      console.error('Error checking assignments:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to check talent assignments', code: 'CHECK_ASSIGNMENTS_ERROR' },
        { status: 500 }
      )
    }

    if (activeAssignments && activeAssignments.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete talent with active project assignments',
          code: 'HAS_ACTIVE_ASSIGNMENTS',
          details: {
            active_assignments: activeAssignments.length,
            projects: activeAssignments.map(a => a.projects?.name).filter(Boolean)
          }
        },
        { status: 409 }
      )
    }

    // Delete the talent (this will cascade delete assignments due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('talent')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting talent:', deleteError)
      return NextResponse.json(
        { 
          error: 'Failed to delete talent',
          code: 'DELETE_ERROR',
          details: deleteError.message
        },
        { status: 500 }
      )
    }

    // Log the deletion for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_deleted',
        user_id: user.id,
        details: `Deleted talent: ${existingTalent.first_name} ${existingTalent.last_name}`
      })

    return NextResponse.json({
      message: 'Talent deleted successfully',
      deleted_talent: {
        id: existingTalent.id,
        name: `${existingTalent.first_name} ${existingTalent.last_name}`
      }
    })

  } catch (error) {
    console.error('Error in DELETE /api/talent/[id]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}