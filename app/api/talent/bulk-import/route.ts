import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { talentProfileSchema, TalentProfileInput } from '@/lib/types'
import { z } from 'zod'

// Validation schema for bulk import request
const bulkImportSchema = z.object({
  talent: z.array(talentProfileSchema).min(1, 'At least one talent record is required')
})

// POST /api/talent/bulk-import - Bulk import talent from CSV
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

    // Check if user has permission to create talent (Admin, In-House, Supervisor, Coordinator)
    const allowedRoles = ['admin', 'in_house', 'supervisor', 'coordinator']
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to import talent', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = bulkImportSchema.safeParse(body)

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

    const { talent: talentRecords } = validationResult.data

    // Check for duplicate emails within the import batch
    const emails = talentRecords.map(t => t.rep_email.toLowerCase())
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
    
    if (duplicateEmails.length > 0) {
      return NextResponse.json(
        { 
          error: 'Duplicate emails found in import data',
          code: 'DUPLICATE_EMAILS',
          details: { duplicates: [...new Set(duplicateEmails)] }
        },
        { status: 400 }
      )
    }

    // Check for existing talent with same representative emails
    const { data: existingTalent, error: checkError } = await supabase
      .from('talent')
      .select('rep_email')
      .in('rep_email', emails)

    if (checkError) {
      console.error('Error checking existing talent:', checkError)
      return NextResponse.json(
        { 
          error: 'Failed to check for existing talent',
          code: 'CHECK_ERROR',
          details: checkError.message
        },
        { status: 500 }
      )
    }

    const existingEmails = existingTalent?.map(t => t.rep_email.toLowerCase()) || []
    const conflictingEmails = emails.filter(email => existingEmails.includes(email))

    if (conflictingEmails.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some representative emails already exist in the system',
          code: 'EXISTING_EMAILS',
          details: { existing: conflictingEmails }
        },
        { status: 409 }
      )
    }

    // Prepare talent records for insertion
    const talentInserts = talentRecords.map(talent => ({
      first_name: talent.first_name,
      last_name: talent.last_name,
      rep_name: talent.rep_name,
      rep_email: talent.rep_email,
      rep_phone: talent.rep_phone,
      notes: talent.notes || null,
      contact_info: {} // Initialize as empty object
    }))

    // Perform bulk insert
    const { data: insertedTalent, error: insertError } = await supabase
      .from('talent')
      .insert(talentInserts)
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

    if (insertError) {
      console.error('Error inserting talent:', insertError)
      return NextResponse.json(
        { 
          error: 'Failed to import talent records',
          code: 'INSERT_ERROR',
          details: insertError.message
        },
        { status: 500 }
      )
    }

    const successfulCount = insertedTalent?.length || 0

    // Log the bulk import for audit purposes
    await supabase
      .from('auth_logs')
      .insert({
        event_type: 'talent_bulk_import',
        user_id: user.id,
        details: `Bulk imported ${successfulCount} talent records`
      })

    // Prepare response with detailed results
    const response = {
      successful: successfulCount,
      failed: 0,
      errors: [] as string[],
      data: insertedTalent,
      message: `Successfully imported ${successfulCount} talent records`
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/talent/bulk-import:', error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { 
            error: 'Duplicate talent records detected',
            code: 'DUPLICATE_ERROR',
            details: 'One or more talent records already exist in the system'
          },
          { status: 409 }
        )
      }
      
      if (error.message.includes('foreign key')) {
        return NextResponse.json(
          { 
            error: 'Invalid reference data',
            code: 'FOREIGN_KEY_ERROR',
            details: 'One or more records reference invalid data'
          },
          { status: 400 }
        )
      }
    }

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

// GET /api/talent/bulk-import - Get import template or validation info
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'template') {
      // Return CSV template structure
      const template = {
        headers: [
          'first_name',
          'last_name', 
          'rep_name',
          'rep_email',
          'rep_phone',
          'notes'
        ],
        example: {
          first_name: 'John',
          last_name: 'Doe',
          rep_name: 'Jane Smith',
          rep_email: 'jane.smith@agency.com',
          rep_phone: '(555) 123-4567',
          notes: 'Optional notes about the talent'
        },
        validation: {
          first_name: 'Required, 1-50 characters',
          last_name: 'Required, 1-50 characters',
          rep_name: 'Required, 1-100 characters',
          rep_email: 'Required, valid email format',
          rep_phone: 'Required, valid US phone number format',
          notes: 'Optional, max 1000 characters'
        }
      }

      return NextResponse.json({ template })
    }

    if (action === 'validate') {
      // Return validation schema information
      const validationInfo = {
        required_fields: ['first_name', 'last_name', 'rep_name', 'rep_email', 'rep_phone'],
        optional_fields: ['notes'],
        field_constraints: {
          first_name: { min_length: 1, max_length: 50, pattern: 'text' },
          last_name: { min_length: 1, max_length: 50, pattern: 'text' },
          rep_name: { min_length: 1, max_length: 100, pattern: 'text' },
          rep_email: { format: 'email' },
          rep_phone: { format: 'US phone number (e.g., (555) 123-4567)' },
          notes: { max_length: 1000, pattern: 'text' }
        },
        supported_formats: ['CSV'],
        max_records_per_import: 1000
      }

      return NextResponse.json({ validation: validationInfo })
    }

    return NextResponse.json(
      { error: 'Invalid action parameter', code: 'INVALID_ACTION' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in GET /api/talent/bulk-import:', error)
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