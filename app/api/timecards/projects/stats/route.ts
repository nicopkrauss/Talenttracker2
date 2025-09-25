import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Project Statistics API for Timecard Navigation
 * 
 * This API aggregates timecard statistics by project for the project selection interface.
 * It provides role-based filtering so admins see all projects and regular users see only their projects.
 */

interface ProjectTimecardStats {
  projectId: string
  projectName: string
  projectDescription?: string
  productionCompany?: string
  startDate?: string
  endDate?: string
  location?: string
  totalTimecards: number
  statusBreakdown: {
    draft: number
    submitted: number
    approved: number
    rejected: number
  }
  totalHours: number
  totalApprovedPay: number
  totalPotentialPay: number
  lastActivity: string | null
  pendingApprovals?: number // Admin only
  overdueSubmissions?: number // Admin only
}

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

    // Get user profile for role-based filtering
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 403 }
      )
    }

    if (userProfile.status !== 'active') {
      return NextResponse.json(
        { error: 'Account not active', code: 'ACCOUNT_NOT_ACTIVE' },
        { status: 403 }
      )
    }

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'in_house'

    // Build query for projects with timecards based on user role
    let projectsData
    let projectsError

    if (isAdmin) {
      // Admin users see all projects with any timecards
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          production_company,
          start_date,
          end_date,
          location,
          timecard_headers!timecard_headers_project_id_fkey(
            id,
            user_id,
            status,
            total_hours,
            total_pay,
            submitted_at,
            approved_at,
            created_at,
            updated_at
          )
        `)
      
      projectsData = data
      projectsError = error
    } else {
      // Regular users only see projects where they have timecards
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          production_company,
          start_date,
          end_date,
          location,
          timecard_headers!timecard_headers_project_id_fkey(
            id,
            user_id,
            status,
            total_hours,
            total_pay,
            submitted_at,
            approved_at,
            created_at,
            updated_at
          )
        `)
        .eq('timecard_headers.user_id', user.id)
      
      projectsData = data
      projectsError = error
    }

    if (projectsError) {
      console.error('Error fetching projects with timecards:', projectsError)
      return NextResponse.json(
        { error: 'Failed to fetch project statistics', code: 'FETCH_ERROR', details: projectsError.message },
        { status: 500 }
      )
    }

    // Process and aggregate statistics for each project
    const projectStats: ProjectTimecardStats[] = []

    for (const project of projectsData || []) {
      const timecards = project.timecard_headers || []
      
      // Skip projects with no timecards
      if (timecards.length === 0) {
        continue
      }

      // Calculate status breakdown
      const statusBreakdown = {
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0
      }

      let totalHours = 0
      let totalApprovedPay = 0
      let totalPotentialPay = 0
      let lastActivity: string | null = null
      let pendingApprovals = 0
      let overdueSubmissions = 0

      // Process each timecard for this project
      for (const timecard of timecards) {
        // Count by status
        if (timecard.status in statusBreakdown) {
          statusBreakdown[timecard.status as keyof typeof statusBreakdown]++
        }

        // Sum total hours
        totalHours += timecard.total_hours || 0

        // Sum approved pay only
        if (timecard.status === 'approved') {
          totalApprovedPay += timecard.total_pay || 0
        }

        // Sum potential pay (all timecards regardless of status)
        totalPotentialPay += timecard.total_pay || 0

        // Track last activity (most recent update)
        const activityDate = timecard.updated_at || timecard.created_at
        if (activityDate && (!lastActivity || new Date(activityDate) > new Date(lastActivity))) {
          lastActivity = activityDate
        }

        // Admin-specific calculations
        if (isAdmin) {
          // Count pending approvals (submitted timecards)
          if (timecard.status === 'submitted') {
            pendingApprovals++
          }

          // Count overdue submissions (submitted more than 7 days ago)
          if (timecard.status === 'submitted' && timecard.submitted_at) {
            const submittedDate = new Date(timecard.submitted_at)
            const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
            if (daysSinceSubmission > 7) {
              overdueSubmissions++
            }
          }
        }
      }

      // Create project statistics object
      const projectStat: ProjectTimecardStats = {
        projectId: project.id,
        projectName: project.name,
        projectDescription: project.description || undefined,
        productionCompany: project.production_company || undefined,
        startDate: project.start_date || undefined,
        endDate: project.end_date || undefined,
        location: project.location || undefined,
        totalTimecards: timecards.length,
        statusBreakdown,
        totalHours,
        totalApprovedPay,
        totalPotentialPay,
        lastActivity
      }

      // Add admin-specific fields
      if (isAdmin) {
        projectStat.pendingApprovals = pendingApprovals
        projectStat.overdueSubmissions = overdueSubmissions
      }

      projectStats.push(projectStat)
    }

    // Sort by last activity (most recent first), then by project name
    projectStats.sort((a, b) => {
      if (a.lastActivity && b.lastActivity) {
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      }
      if (a.lastActivity && !b.lastActivity) return -1
      if (!a.lastActivity && b.lastActivity) return 1
      return a.projectName.localeCompare(b.projectName)
    })

    return NextResponse.json({ 
      data: projectStats,
      count: projectStats.length,
      userRole: userProfile.role
    })

  } catch (error) {
    console.error('API Error:', error)
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