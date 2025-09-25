"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
  status?: string
}

interface ProjectTimecardBreadcrumbProps {
  project: Project
  onBackToProjects: () => void
}

export function ProjectTimecardBreadcrumb({ project, onBackToProjects }: ProjectTimecardBreadcrumbProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default' as const
      case 'prep':
        return 'secondary' as const
      case 'archived':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'prep':
        return 'bg-muted text-muted-foreground border-border'
      case 'archived':
        return 'bg-muted/50 text-muted-foreground border-border'
      default:
        return ''
    }
  }

  return (
    <div className="fixed top-0 md:top-[69px] left-0 right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBackToProjects}
              className="gap-1 sm:gap-2 hover:bg-muted transition-colors min-h-[44px] px-2 sm:px-3 flex-shrink-0"
              aria-label="Back to project selection"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
              <span className="hidden sm:inline">{project.name} - Timecards</span>
              <span className="sm:hidden">{project.name}</span>
            </h1>
          </div>
          
          {project.status && (
            <Badge 
              variant={getStatusBadgeVariant(project.status)}
              className={`${getStatusBadgeColor(project.status)} text-xs sm:text-sm flex-shrink-0`}
              aria-label={`Project status: ${project.status}`}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}