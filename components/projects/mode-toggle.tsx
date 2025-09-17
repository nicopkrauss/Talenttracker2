"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Settings, Activity, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReadiness } from '@/lib/contexts/readiness-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type ProjectMode = 'configuration' | 'operations'

interface ModeToggleProps {
  currentMode: ProjectMode
  onModeChange: (mode: ProjectMode) => void
  className?: string
}

export function ModeToggle({ currentMode, onModeChange, className }: ModeToggleProps) {
  // Try to get readiness data, but handle gracefully if not in ReadinessProvider context
  let readinessData = { isActive: false, isSetupComplete: false, blockingIssues: [] as string[] }
  try {
    const { readiness, getBlockingIssues } = useReadiness()
    if (readiness) {
      readinessData = {
        isActive: readiness.status === 'active',
        isSetupComplete: readiness.status === 'ready_for_activation' || readiness.status === 'active',
        blockingIssues: getBlockingIssues()
      }
    }
  } catch (error) {
    // Not in ReadinessProvider context, use defaults
    readinessData = { isActive: false, isSetupComplete: false, blockingIssues: [] }
  }
  
  const { isActive, isSetupComplete, blockingIssues } = readinessData
  const handleKeyDown = (event: React.KeyboardEvent, mode: ProjectMode) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onModeChange(mode)
    }
  }

  // Determine if operations mode should be suggested based on readiness
  const shouldSuggestOperations = isActive || isSetupComplete
  const hasBlockingIssues = blockingIssues.length > 0

  // Get tooltip content for operations mode
  const getOperationsTooltip = () => {
    if (isActive) {
      return "Switch to live operations view"
    }
    if (isSetupComplete) {
      return "Project setup complete - operations mode available"
    }
    if (hasBlockingIssues) {
      return `Complete setup first: ${blockingIssues.slice(0, 2).join(', ')}${blockingIssues.length > 2 ? '...' : ''}`
    }
    return "Operations mode available after project setup"
  }

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "inline-flex rounded-lg border border-border p-1 bg-muted",
          className
        )}
        role="tablist"
        aria-label="Project mode selection"
      >
        <Button
          variant={currentMode === 'configuration' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('configuration')}
          onKeyDown={(e) => handleKeyDown(e, 'configuration')}
          className={cn(
            "gap-2 transition-all duration-200",
            currentMode === 'configuration' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
          role="tab"
          aria-selected={currentMode === 'configuration'}
          aria-controls="configuration-panel"
          tabIndex={currentMode === 'configuration' ? 0 : -1}
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configuration</span>
          <span className="sm:hidden">Config</span>
        </Button>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentMode === 'operations' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('operations')}
              onKeyDown={(e) => handleKeyDown(e, 'operations')}
              className={cn(
                "gap-2 transition-all duration-200 relative",
                currentMode === 'operations' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                // Visual indicator for readiness state
                shouldSuggestOperations && currentMode !== 'operations' && "ring-1 ring-green-500/20",
                hasBlockingIssues && currentMode !== 'operations' && "opacity-75"
              )}
              role="tab"
              aria-selected={currentMode === 'operations'}
              aria-controls="operations-panel"
              tabIndex={currentMode === 'operations' ? 0 : -1}
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Operations</span>
              <span className="sm:hidden">Ops</span>
              {/* Readiness indicator */}
              {shouldSuggestOperations && currentMode !== 'operations' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
              {hasBlockingIssues && currentMode !== 'operations' && (
                <AlertCircle className="h-3 w-3 text-amber-500 absolute -top-1 -right-1" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getOperationsTooltip()}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}