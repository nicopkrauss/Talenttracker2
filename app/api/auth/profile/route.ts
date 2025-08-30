import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // For profile fetching during authentication, we allow access without session validation
    // The middleware handles the overall security, and this endpoint is specifically for auth flows
    
    // Get user profile from database
    const profile = await prisma.profiles.findUnique({
      where: { id: userId }
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: profile
    })

  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, profileData } = body

    if (!userId || !profileData) {
      return NextResponse.json(
        { error: 'User ID and profile data are required' },
        { status: 400 }
      )
    }

    // Create user profile in database
    const profile = await prisma.profiles.create({
      data: {
        id: userId,
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone || null,
        city: profileData.city || null,
        state: profileData.state || null,
        status: 'pending',
        role: null,
      }
    })

    return NextResponse.json({
      success: true,
      data: profile
    })

  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}