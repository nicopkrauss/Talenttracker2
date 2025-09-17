import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PhaseFeatureAvailabilityGuard } from '../phase-feature-availability-guard'
import { PhaseSpecificDashboard } from '../phase-specific-dashboard'
import { PhaseAwareEmptyState } from '../phase-aware-empty-state'
import { ProjectPhase } from '@/lib/types/project-phase'

// Mock the hooks
vi.mock('@/hooks/use-phase-feature-availability', () => ({
  usePhaseFeatureAvailability: vi.fn(),
  useSpecificPhaseFeatureAvailability: vi.fn()
}))

vi.mock('../phase-indicator', () => ({
  PhaseIndicator: ({ currentPhase }: { currentPhase: string }) => (
    <div data-testid="phase-indicator">{currentPhase}</div>
  ),
  PhaseIndicatorCompact: ({ currentPhase }: { currentPhase: string }) => (
    <div data-testid="phase-indicator-compact">{currentPhase}</div>
  )
}))

vi.mock('../phase-action-items', () => ({
  PhaseActionItems: ({ projectId }: { projectId: string }) => (
    <div data-testid="phase-action-items">Action items for {projectId}</div>
  )
}))

const mockProject = {
  id: 'test-project-1',
  name: 'Test Project',
  status: 'prep' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  statistics: {
    talentExpected: 10,
    talentAssigned: 5,
    staffNeeded: 8,
    staffAssigned: 6,
    staffCheckedIn: 0,
    talentPresent: 0,
    activeEscorts: 0,
    staffOvertime: {
      over8Hours: 0,
      over12Hours: 0
    }
  }
}

describe('Phase-Specific Feature Availability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PhaseFeatureAvailabilityGuard', () => {
    it('shows children when feature is available', async () => {
      const { useSpecificPhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(useSpecificPhaseFeatureAvailability).mockReturnValue({
        available: true,
        requirement: 'Available',
        currentPhase: ProjectPhase.ACTIVE,
        loading: false,
        error: null
      })

      render(
        <PhaseFeatureAvailabilityGuard projectId="test-project" feature="timeTracking">
          <div data-testid="protected-content">Time tracking content</div>
        </PhaseFeatureAvailabilityGuard>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('shows unavailable state when feature is not available', async () => {
      const { useSpecificPhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(useSpecificPhaseFeatureAvailability).mockReturnValue({
        available: false,
        requirement: 'Project must be in active phase',
        guidance: 'Time tracking is available during active operations',
        currentPhase: ProjectPhase.PREP,
        loading: false,
        error: null
      })

      render(
        <PhaseFeatureAvailabilityGuard projectId="test-project" feature="timeTracking">
          <div data-testid="protected-content">Time tracking content</div>
        </PhaseFeatureAvailabilityGuard>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByText('Time Tracking Unavailable')).toBeInTheDocument()
      expect(screen.getAllByText('Project must be in active phase')).toHaveLength(2) // Appears in both alert and card
    })

    it('shows loading state', async () => {
      const { useSpecificPhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(useSpecificPhaseFeatureAvailability).mockReturnValue({
        available: false,
        requirement: 'Loading...',
        currentPhase: null,
        loading: true,
        error: null
      })

      render(
        <PhaseFeatureAvailabilityGuard projectId="test-project" feature="timeTracking">
          <div data-testid="protected-content">Time tracking content</div>
        </PhaseFeatureAvailabilityGuard>
      )

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })

    it('shows error state', async () => {
      const { useSpecificPhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(useSpecificPhaseFeatureAvailability).mockReturnValue({
        available: false,
        requirement: 'Error',
        currentPhase: null,
        loading: false,
        error: 'Failed to load phase data'
      })

      render(
        <PhaseFeatureAvailabilityGuard projectId="test-project" feature="timeTracking">
          <div data-testid="protected-content">Time tracking content</div>
        </PhaseFeatureAvailabilityGuard>
      )

      expect(screen.getByText('Failed to check feature availability: Failed to load phase data')).toBeInTheDocument()
    })
  })

  describe('PhaseSpecificDashboard', () => {
    it('renders prep phase dashboard correctly', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: ProjectPhase.PREP,
        loading: false,
        error: null
      })

      render(
        <PhaseSpecificDashboard
          projectId="test-project"
          project={mockProject}
        />
      )

      expect(screen.getByText('Project Preparation')).toBeInTheDocument()
      expect(screen.getByText('Configure Roles & Pay Rates')).toBeInTheDocument()
      expect(screen.getByText('Set Up Locations')).toBeInTheDocument()
    })

    it('renders active phase dashboard correctly', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: ProjectPhase.ACTIVE,
        loading: false,
        error: null
      })

      render(
        <PhaseSpecificDashboard
          projectId="test-project"
          project={mockProject}
        />
      )

      expect(screen.getByText('Active Operations')).toBeInTheDocument()
      expect(screen.getByText('Operations Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Live Operations Active')).toBeInTheDocument()
    })

    it('renders archived phase dashboard correctly', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: ProjectPhase.ARCHIVED,
        loading: false,
        error: null
      })

      render(
        <PhaseSpecificDashboard
          projectId="test-project"
          project={mockProject}
        />
      )

      expect(screen.getAllByText('Archived Project')).toHaveLength(2) // Appears in title and alert
      expect(screen.getByText('View Historical Data')).toBeInTheDocument()
    })
  })

  describe('PhaseAwareEmptyState', () => {
    it('renders prep phase talent empty state correctly', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: ProjectPhase.PREP,
        loading: false,
        error: null
      })

      render(
        <PhaseAwareEmptyState
          projectId="test-project"
          area="talent"
        />
      )

      expect(screen.getByText('Talent Roster Setup')).toBeInTheDocument()
      expect(screen.getByText('Complete Project Setup')).toBeInTheDocument()
      expect(screen.getByText('Configure Roles First')).toBeInTheDocument()
    })

    it('renders staffing phase team empty state correctly', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: ProjectPhase.STAFFING,
        loading: false,
        error: null
      })

      render(
        <PhaseAwareEmptyState
          projectId="test-project"
          area="team"
        />
      )

      expect(screen.getByText('Build Your Team')).toBeInTheDocument()
      expect(screen.getByText('Assign Team Members')).toBeInTheDocument()
      expect(screen.getByText('View Available Staff')).toBeInTheDocument()
    })

    it('renders active phase operations empty state correctly', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: ProjectPhase.ACTIVE,
        loading: false,
        error: null
      })

      render(
        <PhaseAwareEmptyState
          projectId="test-project"
          area="operations"
        />
      )

      expect(screen.getByText('Live Operations')).toBeInTheDocument()
      expect(screen.getByText('Operations Dashboard')).toBeInTheDocument()
    })

    it('renders filtered variant correctly', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: ProjectPhase.ACTIVE,
        loading: false,
        error: null
      })

      render(
        <PhaseAwareEmptyState
          projectId="test-project"
          area="talent"
          variant="filtered"
        />
      )

      expect(screen.getByText('No Matching Results')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search or filters to find talent')).toBeInTheDocument()
    })

    it('handles loading state', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: null,
        loading: true,
        error: null
      })

      render(
        <PhaseAwareEmptyState
          projectId="test-project"
          area="talent"
        />
      )

      // Should show loading skeleton
      expect(screen.getByTestId('loading-skeleton')).toHaveClass('animate-pulse')
    })

    it('handles error state', async () => {
      const { usePhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(usePhaseFeatureAvailability).mockReturnValue({
        features: {} as any,
        currentPhase: null,
        loading: false,
        error: 'Failed to load phase data'
      })

      render(
        <PhaseAwareEmptyState
          projectId="test-project"
          area="talent"
        />
      )

      expect(screen.getByText('Unable to Load Phase Data')).toBeInTheDocument()
      expect(screen.getByText('Failed to load phase data')).toBeInTheDocument()
    })
  })

  describe('Phase-specific feature guards', () => {
    it('time tracking guard works correctly for active phase', async () => {
      const { useSpecificPhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(useSpecificPhaseFeatureAvailability).mockReturnValue({
        available: true,
        requirement: 'Available',
        currentPhase: ProjectPhase.ACTIVE,
        loading: false,
        error: null
      })

      const { PhaseTimeTrackingGuard } = await import('../phase-feature-availability-guard')
      
      render(
        <PhaseTimeTrackingGuard projectId="test-project">
          <div data-testid="time-tracking-content">Time tracking features</div>
        </PhaseTimeTrackingGuard>
      )

      expect(screen.getByTestId('time-tracking-content')).toBeInTheDocument()
    })

    it('assignment guard blocks access in prep phase', async () => {
      const { useSpecificPhaseFeatureAvailability } = await import('@/hooks/use-phase-feature-availability')
      vi.mocked(useSpecificPhaseFeatureAvailability).mockReturnValue({
        available: false,
        requirement: 'Available during staffing, pre-show, and active phases',
        currentPhase: ProjectPhase.PREP,
        loading: false,
        error: null
      })

      const { PhaseAssignmentGuard } = await import('../phase-feature-availability-guard')
      
      render(
        <PhaseAssignmentGuard projectId="test-project">
          <div data-testid="assignment-content">Assignment features</div>
        </PhaseAssignmentGuard>
      )

      expect(screen.queryByTestId('assignment-content')).not.toBeInTheDocument()
      expect(screen.getByText('Assignments Unavailable')).toBeInTheDocument()
    })
  })
})