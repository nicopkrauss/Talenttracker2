import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const clearDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: projectId } = await params
    const body = await request.json()

    // Validate request body
    const validationResult = clearDaySchema.safeParse(body)
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

    const { date } = validationResult.data

    // Check project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Validate date is within project range
    const clearDate = new Date(date + 'T00:00:00')
    const projectStart = new Date(project.start_date + 'T00:00:00')
    const projectEnd = new Date(project.end_date + 'T00:00:00')
    
    if (clearDate < projectStart || clearDate > projectEnd) {
      return NextResponse.json(
        { error: 'Date is outside project range', code: 'DATE_OUT_OF_RANGE' },
        { status: 400 }
      )
    }

    // Clear escort assignments but keep scheduling entries (set escort_id to NULL)
    const { error: talentUpdateError } = await supabase
      .from('talent_daily_assignments')
      .update({ escort_id: null })
      .eq('project_id', projectId)
      .eq('assignment_date', date)
      .not('escort_id', 'is', null) // Only update records that have escorts assigned

    if (talentUpdateError) {
      console.error('Error clearing talent escort assignments:', talentUpdateError)
      return NextResponse.json(
        { error: 'Failed to clear talent assignments', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    // Clear group escort assignments but keep scheduling entries (set escort_id to NULL)
    const { error: groupUpdateError } = await supabase
      .from('group_daily_assignments')
      .update({ escort_id: null })
      .eq('project_id', projectId)
      .eq('assignment_date', date)
      .not('escort_id', 'is', null) // Only update records that have escorts assigned

    if (groupUpdateError) {
      console.error('Error clearing group escort assignments:', groupUpdateError)
      return NextResponse.json(
        { error: 'Failed to clear group assignments', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        message: `All escort assignments cleared for ${date}`,
        date,
        projectId
      }
    })

  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]/assignments/clear-day:', error)
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