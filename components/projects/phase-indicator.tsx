"use client"

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, CheckCircle, Archive, Settings, Users, Play, Calendar, FileCheck } from 'lucide-react'
import { ProjectPhase } from '@/lib/types/project-phase'
import { cn } from '@/lib/utils'

interface PhaseIndicatorProps {
  currentPhase: ProjectPhase
  className?: string
  showIcon?: boolean
  showDescription?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const phaseConfig = {
  [ProjectPhase.PREP]: {
    label: 'Preparation',
    description: 'Setting up project basics and configuration',
    icon: Settings,
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  [ProjectPhase.STAFFING]: {
    label: 'Staffing',
    description: 'Hiring team members and assigning talent',
    icon: Users,
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  [ProjectPhase.PRE_SHOW]: {
    label: 'Pre-Show',
    description: 'Final preparations before rehearsals begin',
    icon: Calendar,
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  [ProjectPhase.ACTIVE]: {
    label: 'Active',
    description: 'Live operations and real-time management',
    icon: Play,
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  [ProjectPhase.POST_SHOW]: {
    label: 'Post-Show',
    description: 'Timecard processing and wrap-up',
    icon: FileCheck,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  [ProjectPhase.COMPLETE]: {
    label: 'Complete',
    description: 'Project finished, ready for archival',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  [ProjectPhase.ARCHIVED]: {
    label: 'Archived',
    description: 'Historical project data, read-only access',
    icon: Archive,
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400'
  }
}

export function PhaseIndicator({ 
  currentPhase, 
  className, 
  showIcon = true, 
  showDescription = false,
  size = 'md'
}: PhaseIndicatorProps) {
  const config = phaseConfig[currentPhase]
  const IconComponent = config.icon

  const sizeClasses = {
    sm: {
      badge: 'text-xs px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs'
    },
    md: {
      badge: 'text-sm px-3 py-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm'
    },
    lg: {
      badge: 'text-base px-4 py-2',
      icon: 'h-5 w-5',
      text: 'text-base'
    }
  }

  if (showDescription) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {showIcon && (
              <div className={cn(
                "rounded-full p-2 flex-shrink-0",
                config.color.replace('text-', 'bg-').replace('border-', '').split(' ')[0]
              )}>
                <IconComponent className={cn(sizeClasses[size].icon, config.iconColor)} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant="outline" 
                  className={cn(
                    config.color,
                    sizeClasses[size].badge,
                    "font-medium"
                  )}
                >
                  {config.label}
                </Badge>
              </div>
              <p className={cn(
                "text-muted-foreground leading-relaxed",
                sizeClasses[size].text
              )}>
                {config.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.color,
        sizeClasses[size].badge,
        "font-medium inline-flex items-center gap-1.5",
        className
      )}
    >
      {showIcon && <IconComponent className={sizeClasses[size].icon} />}
      {config.label}
    </Badge>
  )
}

// Compact version for use in headers or tight spaces
export function PhaseIndicatorCompact({ 
  currentPhase, 
  className 
}: { 
  currentPhase: ProjectPhase
  className?: string 
}) {
  return (
    <PhaseIndicator 
      currentPhase={currentPhase}
      size="sm"
      showIcon={true}
      showDescription={false}
      className={className}
    />
  )
}

// Full version for dashboard display
export function PhaseIndicatorFull({ 
  currentPhase, 
  className 
}: { 
  currentPhase: ProjectPhase
  className?: string 
}) {
  return (
    <PhaseIndicator 
      currentPhase={currentPhase}
      size="lg"
      showIcon={true}
      showDescription={true}
      className={className}
    />
  )
}