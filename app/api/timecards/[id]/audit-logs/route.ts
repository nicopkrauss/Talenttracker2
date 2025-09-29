import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { AuditLogService } from '@/lib/audit-log-service';

// Query parameter validation schema
const auditLogQuerySchema = z.object({
  action_type: z.string()
    .optional()
    .refine(val => {
      if (!val) return true;
      const validTypes = ['user_edit', 'admin_edit', 'rejection_edit', 'status_change'];
      const types = val.split(',');
      return types.every(type => validTypes.includes(type.trim()));
    }, 'Invalid action_type. Must be one of: user_edit, admin_edit, rejection_edit, status_change'),
  field_name: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  grouped: z.union([z.boolean(), z.string()]).optional().transform(val => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
  }).default(false)
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Initialize Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get user profile for role-based authorization
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 403 }
      );
    }

    // Validate timecard exists and user has access
    const resolvedParams = await params;
    const timecardId = resolvedParams.id;
    const { data: timecard, error: timecardError } = await supabase
      .from('timecard_headers')
      .select('id, user_id')
      .eq('id', timecardId)
      .single();

    if (timecardError || !timecard) {
      return NextResponse.json(
        { error: 'Timecard not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Authorization check: admins can see all, users can only see their own
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'in_house';
    const canAccess = isAdmin || timecard.user_id === user.id;

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = auditLogQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const {
      action_type,
      field_name,
      date_from,
      date_to,
      limit,
      offset,
      grouped
    } = validationResult.data;

    // Build filter object
    const filter: any = {};
    
    if (action_type) {
      filter.action_type = action_type.split(',');
    }
    
    if (field_name) {
      filter.field_name = field_name.split(',');
    }
    
    if (date_from) {
      filter.date_from = new Date(date_from);
    }
    
    if (date_to) {
      filter.date_to = new Date(date_to);
    }

    filter.limit = limit;
    filter.offset = offset;

    // Initialize audit log service
    const auditLogService = new AuditLogService(supabase);

    // Fetch audit logs (includes status changes and field changes in chronological order)
    let auditLogs;
    let total = 0;

    if (grouped) {
      auditLogs = await auditLogService.getGroupedAuditLogs(timecardId, filter);
      // For grouped results, count unique change_ids
      const { data: countData } = await supabase
        .from('timecard_audit_log')
        .select('change_id', { count: 'exact' })
        .eq('timecard_id', timecardId);
      
      if (countData) {
        const uniqueChangeIds = new Set(countData.map(item => item.change_id));
        total = uniqueChangeIds.size;
      }
    } else {
      auditLogs = await auditLogService.getAuditLogs(timecardId, filter);
      // Get total count for pagination
      const { count } = await supabase
        .from('timecard_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('timecard_id', timecardId);
      
      total = count || 0;
    }



    // Calculate pagination info
    const hasMore = offset + limit < total;

    return NextResponse.json({
      auditLogs: auditLogs,
      pagination: {
        total,
        limit,
        offset,
        has_more: hasMore
      }
    });

  } catch (error) {
    console.error('Audit log API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}