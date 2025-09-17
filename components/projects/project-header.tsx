"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { EnhancedProject } from '@/lib/types'
import { ProjectPhase } from '@/lib/types/project-phase'
import { PhaseIndicatorCompact } from './phase-indicator'
import { SimpleModeToggle } from './simple-mode-toggle'

interface ProjectHeaderProps {
  project: EnhancedProject
  onBack: () => void
  currentMode?: 'configuration' | 'operations'
  onModeChange?: (mode: 'configuration' | 'operations') => void
}

export function ProjectHeader({ 
  project, 
  onBack, 
  currentMode = 'configuration',
  onModeChange 
}: ProjectHeaderProps) {
  const [currentPhase, setCurrentPhase] = useState<ProjectPhase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCurrentPhase()
  }, [project.id])

  const fetchCurrentPhase = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/phase`)
      if (response.ok) {
        const result = await response.json()
        setCurrentPhase(result.data.currentPhase)
      }
    } catch (error) {
      console.error('Error fetching current phase:', error)
      // Fallback to mapping old status to phase
      setCurrentPhase(mapStatusToPhase(project.status))
    } finally {
      setLoading(false)
    }
  }

  // Fallback mapping for backward compatibility
  const mapStatusToPhase = (status: string): ProjectPhase => {
    switch (status) {
      case 'prep':
        return ProjectPhase.PREP
      case 'active':
        return ProjectPhase.ACTIVE
      case 'archived':
        return ProjectPhase.ARCHIVED
      default:
        return ProjectPhase.PREP
    }
  }

  return (
    <div className="fixed top-0 md:top-[69px] left-0 right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBack}
              className="gap-2 hover:bg-muted transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {project.name}
            </h1>
          </div>
          
          {/* Simplified Mode Toggle */}
          {onModeChange && (
            <SimpleModeToggle
              currentMode={currentMode}
              onModeChange={onModeChange}
              className="flex-shrink-0"
            />
          )}
          
          {/* Phase Indicator - replaces old status badge */}
          {!loading && currentPhase && (
            <PhaseIndicatorCompact 
              currentPhase={currentPhase}
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>
    </div>
  )
}