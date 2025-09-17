"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Settings, BarChart3 } from 'lucide-react'

interface SimpleModeToggleProps {
  currentMode: 'configuration' | 'operations'
  onModeChange: (mode: 'configuration' | 'operations') => void
  className?: string
}

/**
 * Simplified mode toggle with just Setup and Operations buttons
 */
export function SimpleModeToggle({
  currentMode,
  onModeChange,
  className
}: SimpleModeToggleProps) {
  return (
    <div className={`flex gap-1 ${className}`}>
      <Button
        variant={currentMode === 'configuration' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('configuration')}
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        Setup
      </Button>

      <Button
        variant={currentMode === 'operations' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('operations')}
        className="gap-2"
      >
        <BarChart3 className="h-4 w-4" />
        Operations
      </Button>
    </div>
  )
}