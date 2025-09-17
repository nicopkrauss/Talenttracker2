"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ProjectPhase } from '@/lib/types/project-phase'

interface ProjectPhaseContextValue {
  currentPhase: ProjectPhase | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ProjectPhaseContext = createContext<ProjectPhaseContextValue | undefined>(undefined)

interface ProjectPhaseProviderProps {
  projectId: string
  children: ReactNode
}

export function ProjectPhaseProvider({ projectId, children }: ProjectPhaseProviderProps) {
  const [currentPhase, setCurrentPhase] = useState<ProjectPhase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPhase = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects/${projectId}/phase`)
      if (!response.ok) {
        throw new Error('Failed to fetch project phase')
      }
      
      const result = await response.json()
      setCurrentPhase(result.data.currentPhase)
    } catch (err: any) {
      console.error('Error fetching project phase:', err)
      setError(err.message || 'Failed to load project phase')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchPhase()
    }
  }, [projectId])

  const value: ProjectPhaseContextValue = {
    currentPhase,
    loading,
    error,
    refetch: fetchPhase
  }

  return (
    <ProjectPhaseContext.Provider value={value}>
      {children}
    </ProjectPhaseContext.Provider>
  )
}

export function useProjectPhase(): ProjectPhaseContextValue {
  const context = useContext(ProjectPhaseContext)
  if (context === undefined) {
    throw new Error('useProjectPhase must be used within a ProjectPhaseProvider')
  }
  return context
}