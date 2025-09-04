import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema for audit log parameters
const auditParamsSchema = z.object({
  talent_id: z.string().uuid().optional(),
  event_type: z.enum(['talent_created', 'talent_updated', 'talent_deleted', 'talent_assigned', 'talent_unassigned', 'talent_bulk_assignment']).optional(),
  user_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
})

// Validation schema for creating audit log entries
const createAuditLogSchema = z.object({
  event_type: z.string().min(1, "Event type is required"),
  talent_id: z.string().uuid().optional(),
  details: z.string().min(1, "Details are required"),
  metadata: z.record(z.any()).optional()
})

// GET /api/talent/audit - Get audit logs for talent operations
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

    // Check if user has permission to view audit logs (Admin and In-House only)
    if (!userProfile.role || !['admin', 'in_house'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit logs', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validationResult = auditParamsSchema.safeParse(params)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const {
      talent_id,
      event_type,
      user_id,
      start_date,
      end_date,
      limit,
      offset
    } = validationResult.data

    // Build the audit log query
    let auditQuery = supabase
      .from('auth_logs')
      .select(`
        id,
        event_type,
        user_id,
        email,
        ip_address,
        details,
        created_at,
        users(
          profiles(full_name, email)
        )
      `)
      .or('event_type.like.talent_%,event_type.eq.talent_bulk_assignment')
      .order('created_at', { ascending: false })

    // Apply filters
    if (event_type) {
      auditQuery = auditQuery.eq('event_type', event_type)
    }

    if (user_id) {
      auditQuery = auditQuery.eq('user_id', user_id)
    }

    if (start_date) {
      auditQuery = auditQuery.gte('created_at', start_date)
    }

    if (end_date) {
      auditQuery = auditQuery.lte('created_at', end_date)
    }

    // If talent_id is specified, filter by details containing the talent ID
    if (talent_id) {
      auditQuery = auditQuery.like('details', `%${talent_id}%`)
    }

    // Apply pagination
    auditQuery = auditQuery.range(offset, offset + limit - 1)

    const { data: auditLogs, error: auditError } = await auditQuery

    if (auditError) {
      console.error('Error fetching audit logs:', auditError)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs', code: 'FETCH_ERROR', details: auditError.message },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('auth_logs')
      .select('id', { count: 'exact', head: true })
      .or('event_type.like.talent_%,event_type.eq.talent_bulk_assignment')

    if (event_type) {
      countQuery = countQuery.eq('event_type', event_type)
    }
    if (user_id) {
      countQuery = countQuery.eq('user_id', user_id)
    }
    if (start_date) {
      countQuery = countQuery.gte('created_at', start_date)
    }
    if (end_date) {
      countQuery = countQuery.lte('created_at', end_date)
    }
    if (talent_id) {
      countQuery = countQuery.like('details', `%${talent_id}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting audit log count:', countError)
    }

    // Process audit logs to extract talent information from details
    const processedLogs = auditLogs?.map(log => {
      let extractedTalentInfo = null
      
      // Try to extract talent information from details
      if (log.details) {
        const talentNameMatch = log.details.match(/talent: (.+?)(?:\s|$)/)
        if (talentNameMatch) {
          extractedTalentInfo = talentNameMatch[1]
        }
      }

      return {
        ...log,
        extracted_talent_info: extractedTalentInfo,
        user_name: log.users?.profiles?.full_name || 'Unknown User',
        user_email: log.users?.profiles?.email || log.email
      }
    })

    return NextResponse.json({
      data: processedLogs || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
        page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil((count || 0) / limit)
      },
      filters: {
        talent_id,
        event_type,
        user_id,
        start_date,
        end_date
      },
      summary: {
        total_logs: count || 0,
        results_returned: processedLogs?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/talent/audit:', error)
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

// POST /api/talent/audit - Create audit log entry
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

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status, email')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createAuditLogSchema.safeParse(body)

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

    const { event_type, talent_id, details, metadata } = validationResult.data

    // Create the audit log entry
    const auditDetails = talent_id 
      ? `${details} (Talent ID: ${talent_id})`
      : details

    const { data: auditLog, error: createError } = await supabase
      .from('auth_logs')
      .insert({
        event_type,
        user_id: user.id,
        email: userProfile.email,
        details: auditDetails,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
      })
      .select(`
        id,
        event_type,
        user_id,
        email,
        details,
        created_at
      `)
      .single()

    if (createError) {
      console.error('Error creating audit log:', createError)
      return NextResponse.json(
        { 
          error: 'Failed to create audit log',
          code: 'CREATE_ERROR',
          details: createError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: auditLog,
      message: 'Audit log entry created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/talent/audit:', error)
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