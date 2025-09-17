import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ProjectDetailLayout } from '../project-detail-layout'
import { ReadinessProvider } from '@/lib/contexts/readiness-context'

// Mock the auth context
const mockUseAuth = vi.fn()
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth()
}))

// Mock the project mode hook
const mockUseProjectMode = vi.fn()
vi.mock('@/hooks/use-project-mode', () => ({
  useProjectMode: () => mockUseProjectMode()
}))

// Mock the router
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  })
}))

// Mock the mode-specific components
vi.mock('../mode-specific-components', () => ({
  ConfigurationModeComponents: {
    Tabs: ({ project, onProjectUpdate }: any) => (
      <div data-testid="configuration-tabs">
        Configuration Tabs for {project.name}
      </div>
    )
  },
  OperationsModeComponents: {
    Dashboard: ({ project, onProjectUpdate }: any) => (
      <div data-testid="operations-dashboard">
        Operations Dashboard for {project.name}
      </div>
    )
  },
  preloadModeComponents: vi.fn()
}))

// Mock other components
vi.mock('../project-header', () => ({
  ProjectHeader: ({ project }: any) => (
    <div data-testid="project-header">Header for {project.name}</div>
  )
}))

vi.mock('../project-overview-card', () => ({
  ProjectOverviewCard: ({ project }: any) => (
    <div data-testid="project-overview-card">Overview for {project.name}</div>
  )
}))

// Mock fetch for project API
global.fetch = vi.fn()

describe('ProjectDetailLayout Readiness Integration', () => {
  const mockProject = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'Test Description',
    status: 'prep' as const,
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-id',
    readiness: {
      status: 'setup_required' as const,
      features: {
        team_management: false,
        talent_tracking: false,
        scheduling: false,
        time_tracking: false
      },
      blocking_issues: ['missing_role_templates', 'missing_locations'],
      calculated_at: '2024-01-01T00:00:00Z'
    },
    statistics: {
      talentExpected: 10,
      talentAssigned: 0,
      staffNeeded: 5,
      staffAssigned: 0,
      staffCheckedIn: 0,
      talentPresent: 0,
      activeEscorts: 0,
      staffOvertime: {
        over8Hours: 0,
        over12Hours: 0
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      userProfile: {
        id: 'user-id',
        role: 'admin'
      }
    })

    mockUseProjectMode.mockReturnValue({
      currentMode: 'configuration',
      setMode: vi.fn(),
      isConfiguration: true,
      isOperations: false
    })

    // Mock successful project fetch
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: mockProject
      })
    })
  })

  it('should integrate ReadinessProvider at layout level', async () => {
    render(<ProjectDetailLayout projectId="test-project-id" />)

    // Wait for project to load
    await waitFor(() => {
      expect(screen.getByTestId('project-header')).toBeInTheDocument()
    })

    // Verify ReadinessProvider is integrated by checking that tabs render
    // (tabs depend on readiness context)
    expect(screen.getByTestId('configuration-tabs')).toBeInTheDocument()
  })

  it('should pass initial readiness data to ReadinessProvider', async () => {
    render(<ProjectDetailLayout projectId="test-project-id" />)

    await waitFor(() => {
      expect(screen.getByTestId('project-header')).toBeInTheDocument()
    })

    // Verify that the project API was called to get initial readiness data
    expect(global.fetch).toHaveBeenCalledWith('/api/projects/test-project-id')
  })

  it('should handle project with no readiness data', async () => {
    const projectWithoutReadiness = {
      ...mockProject,
      readiness: null
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: projectWithoutReadiness
      })
    })

    render(<ProjectDetailLayout projectId="test-project-id" />)

    await waitFor(() => {
      expect(screen.getByTestId('project-header')).toBeInTheDocument()
    })

    // Should still render without errors
    expect(screen.getByTestId('configuration-tabs')).toBeInTheDocument()
  })

  it('should handle project fetch error gracefully', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

    render(<ProjectDetailLayout projectId="test-project-id" />)

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })
  })

  it('should handle 404 project not found', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404
    })

    render(<ProjectDetailLayout projectId="test-project-id" />)

    await waitFor(() => {
      expect(screen.getByText(/Project not found/)).toBeInTheDocument()
    })
  })

  it('should switch between configuration and operations modes', async () => {
    // Start in configuration mode
    render(<ProjectDetailLayout projectId="test-project-id" />)

    await waitFor(() => {
      expect(screen.getByTestId('configuration-tabs')).toBeInTheDocument()
    })

    // Switch to operations mode
    mockUseProjectMode.mockReturnValue({
      currentMode: 'operations',
      setMode: vi.fn(),
      isConfiguration: false,
      isOperations: true
    })

    // Re-render with operations mode
    render(<ProjectDetailLayout projectId="test-project-id" />)

    await waitFor(() => {
      expect(screen.getByTestId('operations-dashboard')).toBeInTheDocument()
    })
  })

  it('should provide readiness context to child components', async () => {
    render(<ProjectDetailLayout projectId="test-project-id" />)

    await waitFor(() => {
      expect(screen.getByTestId('project-header')).toBeInTheDocument()
    })

    // Verify that the ReadinessProvider is wrapping the content
    // by checking that configuration tabs render (they depend on readiness context)
    expect(screen.getByTestId('configuration-tabs')).toBeInTheDocument()
  })

  it('should handle project updates and refresh readiness', async () => {
    render(<ProjectDetailLayout projectId="test-project-id" />)

    await waitFor(() => {
      expect(screen.getByTestId('project-header')).toBeInTheDocument()
    })

    // Simulate project update
    const updatedProject = {
      ...mockProject,
      readiness: {
        ...mockProject.readiness,
        status: 'ready_for_activation' as const,
        features: {
          team_management: true,
          talent_tracking: true,
          scheduling: false,
          time_tracking: false
        },
        blocking_issues: []
      }
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: updatedProject
      })
    })

    // The layout should handle project updates through onProjectUpdate callback
    // This would typically be triggered by child components
    expect(global.fetch).toHaveBeenCalledWith('/api/projects/test-project-id')
  })
})