import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    // Validate request body
    if (!body.locations || !Array.isArray(body.locations)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected locations array.' },
        { status: 400 }
      )
    }

    // Update each location's sort order
    const updatePromises = body.locations.map(async (locationUpdate: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from('project_locations')
        .update({ 
          sort_order: locationUpdate.sort_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', locationUpdate.id)
        .eq('project_id', id) // Ensure location belongs to this project

      if (error) {
        throw error
      }
    })

    await Promise.all(updatePromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering project locations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}