import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, beforeEach } from 'vitest'
import { 
  EmptyStateGuidance, 
  TalentEmptyState, 
  TeamEmptyState, 
  AssignmentsEmptyState,
  SettingsEmptyState 
} from '../empty-state-guidance'

// Mock the readiness hooks
vi.mock('@/hooks/use-cached-feature-availability', () => ({
  useCachedFeatureAvailability: vi.fn(),
  useCachedFeatureGuidance: vi.fn()
}))

import { useCachedFeatureAvailability, useCachedFeatureGuidance } from '@/hooks/use-cached-feature-availability'

describe('EmptyStateGuidance', () => {
  const mockOnNavigate = vi.fn()
  const mockUseCachedFeatureAvailability = useCachedFeatureAvailability as any
  const mockUseCachedFeatureGuidance = useCachedFeatureGuidance as any

  beforeEach(() => {
    mockOnNavigate.mockClear()
    
    // Default mock implementations
    mockUseCachedFeatureAvailability.mockReturnValue({
      canManageTeam: true,
      canTrackTalent: true,
      canSchedule: true,
      canTrackTime: true,
      isSetupComplete: true,
      isReadyForActivation: false,
      isActive: false,
      blockingIssues: [],
      nextSteps: []
    })
    
    mockUseCachedFeatureGuidance.mockReturnValue({
      blockingIssues: [],
      nextSteps: [],
      hasBlockingIssues: false,
      loading: false,
      error: null
    })
  })

  describe('TalentEmptyState', () => {
    it('renders empty state with guidance', () => {
      render(<TalentEmptyState variant="empty" onNavigate={mockOnNavigate} />)
      
      expect(screen.getByText('No Talent Assigned')).toBeInTheDocument()
      expect(screen.getByText('Get started by adding talent to your project roster')).toBeInTheDocument()
      expect(screen.getByText('Add New Talent')).toBeInTheDocument()
    })

    it('renders filtered state', () => {
      render(<TalentEmptyState variant="filtered" onNavigate={mockOnNavigate} />)
      
      expect(screen.getByText('No Matching Talent')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search or filters to find talent')).toBeInTheDocument()
    })

    it('shows feature unavailable state when feature is not available', () => {
      // Mock feature as unavailable
      mockUseCachedFeatureAvailability.mockReturnValue({
        canManageTeam: false,
        canTrackTalent: false,
        canSchedule: false,
        canTrackTime: false,
        isSetupComplete: false,
        isReadyForActivation: false,
        isActive: false,
        blockingIssues: ['missing_role_templates'],
        nextSteps: ['Set up project roles and pay rates']
      })
      
      mockUseCachedFeatureGuidance.mockReturnValue({
        blockingIssues: ['missing_role_templates'],
        nextSteps: ['Set up project roles and pay rates'],
        hasBlockingIssues: true,
        loading: false,
        error: null
      })

      render(
        <TalentEmptyState 
          variant="empty" 
          onNavigate={mockOnNavigate}
        />
      )
      
      expect(screen.getByText('Feature Not Available')).toBeInTheDocument()
      expect(screen.getByText('missing_role_templates')).toBeInTheDocument()
      expect(screen.getByText('Set up project roles and pay rates')).toBeInTheDocument()
    })

    it('calls onNavigate when action button is clicked', () => {
      render(<TalentEmptyState variant="empty" onNavigate={mockOnNavigate} />)
      
      fireEvent.click(screen.getByText('Add New Talent'))
      expect(mockOnNavigate).toHaveBeenCalledWith('/talent/new')
    })
  })

  describe('TeamEmptyState', () => {
    it('renders empty state with guidance', () => {
      render(<TeamEmptyState variant="empty" onNavigate={mockOnNavigate} />)
      
      expect(screen.getByText('No Team Members Assigned')).toBeInTheDocument()
      expect(screen.getByText('Assign staff members to roles to get your project team ready')).toBeInTheDocument()
      expect(screen.getByText('Assign Staff Members')).toBeInTheDocument()
    })

    it('shows helpful tips for team setup', () => {
      render(<TeamEmptyState variant="empty" onNavigate={mockOnNavigate} />)
      
      expect(screen.getByText('Team Setup Tips')).toBeInTheDocument()
      expect(screen.getByText('• Configure role templates with pay rates first')).toBeInTheDocument()
      expect(screen.getByText('• Assign supervisors for team oversight')).toBeInTheDocument()
    })
  })

  describe('AssignmentsEmptyState', () => {
    it('renders empty state with guidance', () => {
      render(<AssignmentsEmptyState variant="empty" onNavigate={mockOnNavigate} />)
      
      expect(screen.getByText('No Assignments Created')).toBeInTheDocument()
      expect(screen.getByText('Create escort assignments to manage talent logistics')).toBeInTheDocument()
      expect(screen.getByText('Add or Schedule Talent')).toBeInTheDocument()
    })

    it('shows assignment prerequisites', () => {
      render(<AssignmentsEmptyState variant="empty" onNavigate={mockOnNavigate} />)
      
      expect(screen.getByText('Assignment Prerequisites')).toBeInTheDocument()
      expect(screen.getByText('• Add talent to your roster first')).toBeInTheDocument()
      expect(screen.getByText('• Assign escorts to your team')).toBeInTheDocument()
    })
  })

  describe('SettingsEmptyState', () => {
    it('renders settings guidance', () => {
      render(<SettingsEmptyState variant="empty" onNavigate={mockOnNavigate} />)
      
      expect(screen.getByText('Configure Project Settings')).toBeInTheDocument()
      expect(screen.getByText('Set up project preferences and operational parameters')).toBeInTheDocument()
    })
  })

  describe('Custom messages and actions', () => {
    it('renders custom message and actions', () => {
      const customActions = [
        { label: 'Custom Action 1', route: '/custom1' },
        { label: 'Custom Action 2', route: '/custom2', variant: 'outline' as const }
      ]

      render(
        <EmptyStateGuidance
          area="talent"
          variant="empty"
          onNavigate={mockOnNavigate}
          customMessage="This is a custom message"
          customActions={customActions}
        />
      )
      
      expect(screen.getByText('This is a custom message')).toBeInTheDocument()
      expect(screen.getByText('Custom Action 1')).toBeInTheDocument()
      expect(screen.getByText('Custom Action 2')).toBeInTheDocument()
    })

    it('calls onNavigate with custom action routes', () => {
      const customActions = [
        { label: 'Custom Action', route: '/custom-route' }
      ]

      render(
        <EmptyStateGuidance
          area="talent"
          variant="empty"
          onNavigate={mockOnNavigate}
          customMessage="Custom message"
          customActions={customActions}
        />
      )
      
      fireEvent.click(screen.getByText('Custom Action'))
      expect(mockOnNavigate).toHaveBeenCalledWith('/custom-route')
    })
  })

  describe('Feature availability states', () => {
    it('shows setup required when feature is unavailable', () => {
      // Mock feature as unavailable
      mockUseCachedFeatureAvailability.mockReturnValue({
        canManageTeam: false,
        canTrackTalent: false,
        canSchedule: false,
        canTrackTime: false,
        isSetupComplete: false,
        isReadyForActivation: false,
        isActive: false,
        blockingIssues: ['missing_team_assignments'],
        nextSteps: ['Assign team members to the project']
      })
      
      mockUseCachedFeatureGuidance.mockReturnValue({
        blockingIssues: ['missing_team_assignments'],
        nextSteps: ['Assign team members to the project'],
        hasBlockingIssues: true,
        loading: false,
        error: null
      })

      render(
        <EmptyStateGuidance
          area="team"
          variant="empty"
          onNavigate={mockOnNavigate}
        />
      )
      
      expect(screen.getByText('Setup Required')).toBeInTheDocument()
      expect(screen.getByText('missing_team_assignments')).toBeInTheDocument()
      expect(screen.getByText('Assign team members to the project')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('Complete Setup'))
      expect(mockOnNavigate).toHaveBeenCalledWith('/roles-team')
    })

    it('shows normal empty state when feature is available', () => {
      // Mock feature as available (default mock)
      render(
        <EmptyStateGuidance
          area="talent"
          variant="empty"
          onNavigate={mockOnNavigate}
        />
      )
      
      expect(screen.getByText('No Talent Assigned')).toBeInTheDocument()
      expect(screen.queryByText('Setup Required')).not.toBeInTheDocument()
    })

    it('shows loading state when readiness data is loading', () => {
      mockUseCachedFeatureGuidance.mockReturnValue({
        blockingIssues: [],
        nextSteps: [],
        hasBlockingIssues: false,
        loading: true,
        error: null
      })

      render(
        <EmptyStateGuidance
          area="talent"
          variant="empty"
          onNavigate={mockOnNavigate}
        />
      )
      
      expect(screen.getByText('Feature Not Available')).toBeInTheDocument()
      expect(screen.getByText('Loading project status...')).toBeInTheDocument()
    })

    it('shows error state when readiness data fails to load', () => {
      mockUseCachedFeatureGuidance.mockReturnValue({
        blockingIssues: [],
        nextSteps: [],
        hasBlockingIssues: false,
        loading: false,
        error: 'Network error'
      })

      render(
        <EmptyStateGuidance
          area="talent"
          variant="empty"
          onNavigate={mockOnNavigate}
        />
      )
      
      expect(screen.getByText('Feature Not Available')).toBeInTheDocument()
      expect(screen.getByText('Error loading project status')).toBeInTheDocument()
    })
  })

  describe('Area-specific configurations', () => {
    it('shows correct titles for each area', () => {
      const { rerender } = render(
        <EmptyStateGuidance area="talent" variant="empty" onNavigate={mockOnNavigate} />
      )
      expect(screen.getByText('No Talent Assigned')).toBeInTheDocument()

      rerender(<EmptyStateGuidance area="team" variant="empty" onNavigate={mockOnNavigate} />)
      expect(screen.getByText('No Team Members Assigned')).toBeInTheDocument()

      rerender(<EmptyStateGuidance area="assignments" variant="empty" onNavigate={mockOnNavigate} />)
      expect(screen.getByText('No Assignments Created')).toBeInTheDocument()

      rerender(<EmptyStateGuidance area="settings" variant="empty" onNavigate={mockOnNavigate} />)
      expect(screen.getByText('Configure Project Settings')).toBeInTheDocument()
    })
  })
})