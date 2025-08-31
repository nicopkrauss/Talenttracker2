"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { EnhancedProject } from '@/lib/types'

interface ProjectHeaderProps {
  project: EnhancedProject
  onBack: () => void
}

export function ProjectHeader({ project, onBack }: ProjectHeaderProps) {
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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBack}
              className="gap-2 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {project.name}
            </h1>
          </div>
          
          <Badge 
            variant={getStatusBadgeVariant(project.status)}
            className={getStatusBadgeColor(project.status)}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Badge>
        </div>
      </div>
    </div>
  )
}