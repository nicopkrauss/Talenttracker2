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
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'prep':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 'archived':
        return 'bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400 border-gray-300'
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