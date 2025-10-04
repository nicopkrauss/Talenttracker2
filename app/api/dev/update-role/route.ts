import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SystemRole } from '@/lib/types'

// Dev mode configuration - only allow for specific email
const DEV_EMAIL = 'nicopkrauss@gmail.com'

export async function POST(request: NextRequest) {
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

    // Only allow dev email to use this endpoint
    if (user.email !== DEV_EMAIL) {
      return NextResponse.json(
        { error: 'Forbidden - Dev mode only', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Parse request body
    const { userId, systemRole } = await request.json()

    // Validate input
    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { error: 'Invalid user ID', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // Validate system role
    const validRoles: (SystemRole | null)[] = ['admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort', null]
    if (systemRole !== null && !validRoles.includes(systemRole)) {
      return NextResponse.json(
        { error: 'Invalid system role', code: 'INVALID_ROLE' },
        { status: 400 }
      )
    }

    // Update user profile with new system role
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: systemRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update user role:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update role', 
          code: 'UPDATE_FAILED',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      data: {
        userId: data.id,
        systemRole: data.role,
        updatedAt: data.updated_at
      }
    })

  } catch (error) {
    console.error('Dev role update error:', error)
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