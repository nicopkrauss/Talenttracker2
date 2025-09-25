"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { hasAdminAccess } from "@/lib/role-utils"

interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
  status?: string
}

interface ProjectTimecardWrapperProps {
  projectId: string
  children: (project: Project, isLoading: boolean, error: string | null) => React.ReactNode
  requireProjectAccess?: boolean
}

/**
 * Reusable wrapper component that handles project loading, access validation,
 * and provides project context to child components
 */
export function ProjectTimecardWrapper({ 
  projectId, 
  children, 
  requireProjectAccess = true 
}: ProjectTimecardWrapperProps) {
  const { user, userProfile, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const isAdmin = hasAdminAccess(userProfile?.role || null)

  // Fetch project details
  const fetchProject = async () => {
    if (!projectId) return
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, production_company, status')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error("Error fetching project:", error)
        setError("Project not found or access denied")
        return
      }

      setProject(data)
    } catch (error) {
      console.error("Error fetching project:", error)
      setError("Failed to load project details")
    } finally {
      setLoading(false)
    }
  }

  // Validate project access
  const validateProjectAccess = async () => {
    if (!user || !projectId || !requireProjectAccess) return true
    
    try {
      // Admin users can access all projects
      if (isAdmin) return true
      
      // Regular users can only access projects where they have timecards
      const { data: timecards } = await supabase
        .from('timecard_headers')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .limit(1)
      
      return timecards && timecards.length > 0
    } catch (error) {
      console.error("Error validating project access:", error)
      return false
    }
  }

  useEffect(() => {
    if (user && projectId) {
      validateProjectAccess().then(hasAccess => {
        if (!hasAccess) {
          setError("Access denied: You don't have permission to view timecards for this project")
          setLoading(false)
          return
        }
        fetchProject()
      })
    }
  }, [user?.id, projectId, isAdmin])

  // Handle navigation back to project selection
  const handleBackToProjects = () => {
    router.push('/timecards')
  }

  // Show loading state while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4" data-testid="loading-skeleton">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user || !userProfile) {
    router.push('/login')
    return null
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Access Error</h3>
                <p className="text-muted-foreground mt-2">{error}</p>
              </div>
              <Button onClick={handleBackToProjects} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show project not found
  if (!project) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Project Not Found</h3>
                <p className="text-muted-foreground mt-2">
                  The requested project could not be found or you don't have access to it.
                </p>
              </div>
              <Button onClick={handleBackToProjects} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render children with project context
  return <>{children(project, false, null)}</>
}