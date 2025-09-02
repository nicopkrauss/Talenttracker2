import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { registrationSchema } from '@/lib/types'
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body
    const validatedData = registrationSchema.parse(body)
    
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        full_name: `${validatedData.firstName} ${validatedData.lastName}`,
        registration_role: validatedData.role
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      
      // Handle specific error cases
      if (authError.message.includes('already registered') || 
          authError.message.includes('already exists') || 
          authError.message.includes('already been registered') ||
          authError.code === 'email_exists') {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please use a different email or try logging in.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Update the auto-created user profile with registration data
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: `${validatedData.firstName} ${validatedData.lastName}`,
        email: validatedData.email,
        phone: validatedData.phone,
        role: validatedData.role, // Use the existing role field
        nearest_major_city: validatedData.nearestMajorCity,
        willing_to_fly: validatedData.willingToFly || false,
        status: 'pending', // Requires admin approval
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      
      // Clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: 'Failed to create user profile. Please try again.' },
        { status: 500 }
      )
    }

    // Send notification email to admins about new registration
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'new_registration',
          userId: authData.user.id,
          email: validatedData.email,
          fullName: `${validatedData.firstName} ${validatedData.lastName}`,
          role: validatedData.role,
          metadata: {
            nearestMajorCity: validatedData.nearestMajorCity,
            willingToFly: validatedData.willingToFly,
            phone: validatedData.phone
          }
        })
      })
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError)
      // Don't fail the registration if email fails
    }

    return NextResponse.json({
      message: 'Registration successful. Your account is pending approval.',
      userId: authData.user.id,
      status: 'pending'
    })

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid registration data',
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