import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get current user from Supabase Auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project locations
    const locations = await prisma.project_locations.findMany({
      where: {
        project_id: id
      },
      orderBy: {
        sort_order: 'asc'
      }
    })

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

    // Get current user from Supabase Auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

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
    const existingLocation = await prisma.project_locations.findFirst({
      where: {
        project_id: id,
        name: body.name
      }
    })

    if (existingLocation) {
      return NextResponse.json(
        { error: 'Location name already exists for this project' },
        { status: 400 }
      )
    }

    // Get the next sort order
    const maxSortOrder = await prisma.project_locations.aggregate({
      where: {
        project_id: id
      },
      _max: {
        sort_order: true
      }
    })

    const nextSortOrder = (maxSortOrder._max.sort_order || 0) + 1

    // Create the location
    const location = await prisma.project_locations.create({
      data: {
        project_id: id,
        name: body.name,
        is_default: body.is_default || false,
        sort_order: nextSortOrder
      }
    })

    return NextResponse.json({ data: location }, { status: 201 })
  } catch (error) {
    console.error('Error creating project location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}