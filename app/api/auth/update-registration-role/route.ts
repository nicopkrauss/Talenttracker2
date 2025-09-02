import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const updateRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'])
})

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body
    const { userId, role } = updateRoleSchema.parse(body)
    
    // Update the user's role
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .eq('status', 'pending') // Only allow updates for pending users

    if (error) {
      console.error('Failed to update registration role:', error)
      return NextResponse.json(
        { error: 'Failed to update registration role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Role updated successfully',
      userId,
      role
    })

  } catch (error) {
    console.error('Update registration role error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}