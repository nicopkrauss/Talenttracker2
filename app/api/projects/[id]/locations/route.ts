import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project locations
    let { data: locations, error: locationsError } = await supabase
      .from('project_locations')
      .select('*')
      .eq('project_id', id)
      .order('sort_order', { ascending: true })

    if (locationsError) {
      console.error('Error fetching project locations:', locationsError)
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }

    // If no locations exist, create default ones
    if (!locations || locations.length === 0) {
      const defaultLocations = [
        { name: 'House', abbreviation: 'HOU', color: '#10b981', sort_order: 1 },
        { name: 'Holding', abbreviation: 'HLD', color: '#f59e0b', sort_order: 2 },
        { name: 'Stage', abbreviation: 'STG', color: '#ef4444', sort_order: 3 }
      ]

      const { error: insertError } = await supabase
        .from('project_locations')
        .insert(defaultLocations.map(loc => ({
          project_id: id,
          name: loc.name,
          abbreviation: loc.abbreviation,
          color: loc.color,
          is_default: true,
          sort_order: loc.sort_order
        })))

      if (insertError) {
        console.error('Error creating default locations:', insertError)
        return NextResponse.json({ error: 'Failed to create default locations' }, { status: 500 })
      }

      // Fetch the newly created locations
      const { data: newLocations, error: newLocationsError } = await supabase
        .from('project_locations')
        .select('*')
        .eq('project_id', id)
        .order('sort_order', { ascending: true })

      if (newLocationsError) {
        console.error('Error fetching new locations:', newLocationsError)
        return NextResponse.json({ error: 'Failed to fetch new locations' }, { status: 500 })
      }

      locations = newLocations
    }

    return NextResponse.json({ data: locations })
  } catch (error) {
    console.error('Error fetching project locations:', error)
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
    const body = await request.json()

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
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    // Check if location name already exists for this project
    const { data: existingLocation, error: existingError } = await supabase
      .from('project_locations')
      .select('id')
      .eq('project_id', id)
      .eq('name', body.name)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing location:', existingError)
      return NextResponse.json({ error: 'Failed to check existing location' }, { status: 500 })
    }

    if (existingLocation) {
      return NextResponse.json(
        { error: 'Location name already exists for this project' },
        { status: 400 }
      )
    }

    // Get the next sort order
    const { data: maxSortData, error: maxSortError } = await supabase
      .from('project_locations')
      .select('sort_order')
      .eq('project_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    let nextSortOrder = 1
    if (maxSortData && !maxSortError) {
      nextSortOrder = (maxSortData.sort_order || 0) + 1
    }

    // Generate abbreviation if not provided
    const abbreviation = body.abbreviation || body.name.substring(0, 2).toUpperCase()

    // Create the location
    const { data: location, error: createError } = await supabase
      .from('project_locations')
      .insert({
        project_id: id,
        name: body.name,
        abbreviation: abbreviation,
        color: body.color || '#3b82f6',
        is_default: body.is_default || false,
        sort_order: nextSortOrder
      })
      .select('*')
      .single()

    if (createError) {
      console.error('Error creating location:', createError)
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }

    return NextResponse.json({ data: location }, { status: 201 })
  } catch (error) {
    console.error('Error creating project location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

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
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!body.locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Update the location
    const { data: location, error: updateError } = await supabase
      .from('project_locations')
      .update({
        name: body.name,
        abbreviation: body.abbreviation,
        color: body.color,
        sort_order: body.sort_order
      })
      .eq('id', body.locationId)
      .eq('project_id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating location:', updateError)
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    return NextResponse.json({ data: location })
  } catch (error) {
    console.error('Error updating project location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

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
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }

    // Check if location is default (cannot delete default locations)
    const { data: location, error: locationError } = await supabase
      .from('project_locations')
      .select('*')
      .eq('id', locationId)
      .eq('project_id', id)
      .single()

    if (locationError) {
      if (locationError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching location:', locationError)
      return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
    }

    if (location.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default locations' },
        { status: 400 }
      )
    }

    // Delete the location
    const { error: deleteError } = await supabase
      .from('project_locations')
      .delete()
      .eq('id', locationId)
      .eq('project_id', id)

    if (deleteError) {
      console.error('Error deleting location:', deleteError)
      return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}