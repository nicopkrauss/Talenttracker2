"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ProjectPhase } from '@/lib/types/project-phase'

interface UseProjectPhaseModeOptions {
  projectId: string
  defaultMode?: 'configuration' | 'operations'
}

export function useProjectPhaseMode({ 
  projectId, 
  defaultMode = 'configuration' 
}: UseProjectPhaseModeOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [currentPhase, setCurrentPhase] = useState<ProjectPhase | null>(null)
  const [phaseLoading, setPhaseLoading] = useState(true)
  
  // Determine intelligent default mode based on phase
  const getIntelligentDefaultMode = (phase: ProjectPhase | null): 'configuration' | 'operations' => {
    if (!phase) return defaultMode
    
    // Recommend configuration mode for setup phases
    if (phase === ProjectPhase.PREP || phase === ProjectPhase.STAFFING) {
      return 'configuration'
    }
    // Recommend operations mode for active phases
    if (phase === ProjectPhase.ACTIVE || phase === ProjectPhase.PRE_SHOW || phase === ProjectPhase.POST_SHOW) {
      return 'operations'
    }
    // Default to configuration for other phases
    return defaultMode
  }
  
  // Initialize mode from URL params, localStorage, or intelligent default
  const [currentMode, setCurrentMode] = useState<'configuration' | 'operations'>(() => {
    // First check URL params
    const urlMode = searchParams.get('mode') as 'configuration' | 'operations'
    if (urlMode === 'configuration' || urlMode === 'operations') {
      return urlMode
    }
    
    // Then check localStorage (only on client side)
    if (typeof window !== 'undefined') {
      const storageKey = `project-mode-${projectId}`
      const storedMode = localStorage.getItem(storageKey) as 'configuration' | 'operations'
      if (storedMode === 'configuration' || storedMode === 'operations') {
        return storedMode
      }
    }
    
    // Fall back to default
    return defaultMode
  })

  // Fetch current phase
  useEffect(() => {
    const fetchPhase = async () => {
      try {
        setPhaseLoading(true)
        const response = await fetch(`/api/projects/${projectId}/phase`)
        if (response.ok) {
          const result = await response.json()
          setCurrentPhase(result.data.currentPhase)
          
          // Update mode based on phase if not explicitly set
          const urlMode = searchParams.get('mode')
          const storageKey = `project-mode-${projectId}`
          const storedMode = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
          
          if (!urlMode && !storedMode) {
            const intelligentMode = getIntelligentDefaultMode(result.data.currentPhase)
            setCurrentMode(intelligentMode)
          }
        }
      } catch (error) {
        console.error('Error fetching project phase:', error)
      } finally {
        setPhaseLoading(false)
      }
    }

    fetchPhase()
  }, [projectId, searchParams])

  // Update URL and localStorage when mode changes
  const setMode = useCallback((newMode: 'configuration' | 'operations') => {
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
  }, [projectId, pathname, searchParams, router])

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlMode = searchParams.get('mode') as 'configuration' | 'operations'
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
    // Phase-aware properties
    currentPhase,
    phaseLoading,
    suggestedMode: getIntelligentDefaultMode(currentPhase),
    canAccessOperations: true, // Operations mode is always accessible, but may show guidance
    phaseState: {
      isPrep: currentPhase === ProjectPhase.PREP,
      isStaffing: currentPhase === ProjectPhase.STAFFING,
      isPreShow: currentPhase === ProjectPhase.PRE_SHOW,
      isActive: currentPhase === ProjectPhase.ACTIVE,
      isPostShow: currentPhase === ProjectPhase.POST_SHOW,
      isComplete: currentPhase === ProjectPhase.COMPLETE,
      isArchived: currentPhase === ProjectPhase.ARCHIVED
    }
  }
}