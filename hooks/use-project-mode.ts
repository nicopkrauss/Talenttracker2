"use client"

import { useState, useEffect, useCallback } from 'react'
import { measureModeSwitch } from '@/lib/performance/readiness-performance'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ProjectMode } from '@/components/projects/mode-toggle'
import { useReadiness } from '@/lib/contexts/readiness-context'

interface UseProjectModeOptions {
  projectId: string
  defaultMode?: ProjectMode
}

export function useProjectMode({ 
  projectId, 
  defaultMode = 'configuration' 
}: UseProjectModeOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Try to get readiness data, but handle gracefully if not in ReadinessProvider context
  let readinessData = { isActive: false, isSetupComplete: false }
  try {
    const { readiness } = useReadiness()
    if (readiness) {
      readinessData = {
        isActive: readiness.status === 'active',
        isSetupComplete: readiness.status === 'ready_for_activation' || readiness.status === 'active'
      }
    }
  } catch (error) {
    // Not in ReadinessProvider context, use defaults
    readinessData = { isActive: false, isSetupComplete: false }
  }
  
  const { isActive, isSetupComplete } = readinessData
  
  // Determine intelligent default mode based on readiness state
  const getIntelligentDefaultMode = (): ProjectMode => {
    // If project is active, suggest operations mode
    if (isActive) return 'operations'
    // If setup is complete but not active, suggest configuration for final review
    if (isSetupComplete) return 'configuration'
    // Otherwise, default to configuration for setup
    return defaultMode
  }
  
  // Initialize mode from URL params, localStorage, or intelligent default
  const [currentMode, setCurrentMode] = useState<ProjectMode>(() => {
    // First check URL params
    const urlMode = searchParams.get('mode') as ProjectMode
    if (urlMode === 'configuration' || urlMode === 'operations') {
      return urlMode
    }
    
    // Then check localStorage (only on client side)
    if (typeof window !== 'undefined') {
      const storageKey = `project-mode-${projectId}`
      const storedMode = localStorage.getItem(storageKey) as ProjectMode
      if (storedMode === 'configuration' || storedMode === 'operations') {
        return storedMode
      }
    }
    
    // Fall back to intelligent default based on readiness
    return getIntelligentDefaultMode()
  })

  // Update URL and localStorage when mode changes
  const setMode = useCallback(measureModeSwitch((newMode: ProjectMode) => {
    setCurrentMode(newMode)
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      const storageKey = `project-mode-${projectId}`
      localStorage.setItem(storageKey, newMode)
    }
    
    // Update URL params
    const params = new URLSearchParams(searchParams.toString())
    params.set('mode', newMode)
    
    // Use replace to avoid adding to browser history
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }), [projectId, pathname, searchParams, router])

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlMode = searchParams.get('mode') as ProjectMode
    if (urlMode && (urlMode === 'configuration' || urlMode === 'operations')) {
      if (urlMode !== currentMode) {
        setCurrentMode(urlMode)
        
        // Also update localStorage to stay in sync
        if (typeof window !== 'undefined') {
          const storageKey = `project-mode-${projectId}`
          localStorage.setItem(storageKey, urlMode)
        }
      }
    }
  }, [searchParams, currentMode, projectId])

  // Keyboard shortcuts for mode switching
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + C for Configuration mode
      if (event.altKey && event.key === 'c') {
        event.preventDefault()
        setMode('configuration')
      }
      // Alt + O for Operations mode
      else if (event.altKey && event.key === 'o') {
        event.preventDefault()
        setMode('operations')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setMode])

  return {
    currentMode,
    setMode,
    isConfiguration: currentMode === 'configuration',
    isOperations: currentMode === 'operations',
    // Additional readiness-aware properties
    suggestedMode: getIntelligentDefaultMode(),
    canAccessOperations: true, // Operations mode is always accessible, but may show guidance
    readinessState: {
      isActive,
      isSetupComplete
    }
  }
}