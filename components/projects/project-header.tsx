"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit } from 'lucide-react'
import { EnhancedProject } from '@/lib/types'

interface ProjectHeaderProps {
  project: EnhancedProject
  onEdit: () => void
  canEdit: boolean
}

export function ProjectHeader({ project, onEdit, canEdit }: ProjectHeaderProps) {
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
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {canEdit && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onEdit}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
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