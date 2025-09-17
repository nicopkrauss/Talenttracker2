import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ProjectPhase } from '@/lib/types/project-phase'
import { PhaseActionItemsService } from '@/lib/services/phase-action-items-service'

/**
 * GET /api/projects/[id]/phase/action-items
 * Get phase-specific action items for a project using integrated readiness system
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
export async function GET(
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

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Await params and get project ID
    const { id } = await params
    const projectId = id

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const phase = url.searchParams.get('phase') as ProjectPhase | null
    const category = url.searchParams.get('category')
    const priority = url.searchParams.get('priority') as 'high' | 'medium' | 'low' | null
    const requiredOnly = url.searchParams.get('required') === 'true'
    const includeReadiness = url.searchParams.get('includeReadiness') !== 'false'

    // Use the integrated phase action items service
    const actionItemsService = new PhaseActionItemsService()
    
    // Get comprehensive action items
    const targetPhase = phase || (project.status as ProjectPhase)
    const result = await actionItemsService.getActionItems(projectId, {
      phase: targetPhase,
      category: category || undefined,
      priority: priority || undefined,
      requiredOnly,
      includeReadinessItems: includeReadiness
    })

    return NextResponse.json({
      data: {
        projectId,
        projectName: project.name,
        currentPhase: project.status,
        requestedPhase: targetPhase,
        actionItems: result.combinedItems,
        phaseItems: result.phaseItems,
        readinessItems: result.readinessItems,
        summary: result.summary,
        filters: {
          category,
          priority,
          requiredOnly,
          includeReadiness
        },
        metadata: {
          phaseItemCount: result.phaseItems.length,
          readinessItemCount: result.readinessItems.length,
          totalItemCount: result.combinedItems.length,
          integrationEnabled: true
        }
      }
    })
  } catch (error) {
    console.error('Error getting phase action items:', error)
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

/**
 * POST /api/projects/[id]/phase/action-items
 * Mark an action item as completed
 */
export async function POST(
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

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Await params and get project ID
    const { id } = await params
    const projectId = id

    // Parse request body
    const body = await request.json()
    const { itemId, action } = body

    if (!itemId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Use the integrated phase action items service
    const actionItemsService = new PhaseActionItemsService()

    if (action === 'complete') {
      await actionItemsService.markItemCompleted(projectId, itemId)
    }

    return NextResponse.json({
      data: {
        projectId,
        itemId,
        action,
        success: true
      }
    })
  } catch (error) {
    console.error('Error updating action item:', error)
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