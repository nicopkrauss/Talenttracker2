import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { InfoTabDashboardOptimized } from '../info-tab-dashboard-optimized'
import { useReadiness } from '@/lib/contexts/readiness-context'
import { useCachedFeatureAvailability } from '@/hooks/use-cached-feature-availability'

// Mock the readiness context
const mockUseReadiness = vi.fn()
vi.mock('@/lib/contexts/readiness-context', () => ({
  useReadiness: () => mockUseReadiness()
}))

// Mock the cached feature availability hook
const mockUseCachedFeatureAvailability = vi.fn()
vi.mock('@/hooks/use-cached-feature-availability', () => ({
  useCachedFeatureAvailability: () => mockUseCachedFeatureAvailability()
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}))

// Mock router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('Readiness System Integration', () => {
  const mockProject = {
    id: 'test-project-123',
    name: 'Test Project',
    status: 'prep' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('InfoTabDashboardOptimized', () => {
    it('should display loading state when readiness is loading', () => {
      mockUseReadiness.mockReturnValue({
        readiness: null,
        isLoading: true,
        error: null
      })

      mockUseCachedFeatureAvailability.mockReturnValue({
        canManageTeam: false,
        canTrackTalent: false,
        canSchedule: false,
        canTrackTime: false,
        isSetupComplete: false,
        isReadyForActivation: false,
        isActive: false,
        blockingIssues: [],
        nextSteps: ['Loading...']
      })

      render(<InfoTabDashboardOptimized project={mockProject} />)

      expect(screen.getByText('Loading project status...')).toBeInTheDocument()
    })

    it('should display error state when readiness fails to load', () => {
      const mockError = new Error('Failed to load readiness')
      mockUseReadiness.mockReturnValue({
        readiness: null,
        isLoading: false,
        error: mockError
      })

      mockUseCachedFeatureAvailability.mockReturnValue({
        canManageTeam: false,
        canTrackTalent: false,
        canSchedule: false,
        canTrackTime: false,
        isSetupComplete: false,
        isReadyForActivation: false,
        isActive: false,
        blockingIssues: [],
        nextSteps: ['Error loading project status']
      })

      render(<InfoTabDashboardOptimized project={mockProject} />)

      expect(screen.getByText('Error Loading Status')).toBeInTheDocument()
      expect(screen.getByText('Failed to load readiness')).toBeInTheDocument()
    })

    it('should display setup required status with critical todos', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          project_id: 'test-project-123',
          status: 'setup_required',
          features: {
            team_management: false,
            talent_tracking: false,
            scheduling: false,
            time_tracking: false
          },
          blocking_issues: ['missing_role_templates', 'missing_team_assignments'],
          calculated_at: '2024-01-01T00:00:00Z'
        },
        isLoading: false,
        error: null
      })

      mockUseCachedFeatureAvailability.mockReturnValue({
        canManageTeam: false,
        canTrackTalent: false,
        canSchedule: false,
        canTrackTime: false,
        isSetupComplete: false,
        isReadyForActivation: false,
        isActive: false,
        blockingIssues: ['missing_role_templates', 'missing_team_assignments'],
        nextSteps: ['Set up project roles and pay rates', 'Assign team members to the project']
      })

      render(<InfoTabDashboardOptimized project={mockProject} />)

      expect(screen.getByText('Getting Started')).toBeInTheDocument()
      expect(screen.getByText('Complete the setup checklist to make your project operational')).toBeInTheDocument()
      expect(screen.getByText('Action Items (2)')).toBeInTheDocument()
      expect(screen.getByText('Set up role templates')).toBeInTheDocument()
      expect(screen.getByText('Assign team members')).toBeInTheDocument()
    })

    it('should display ready for activation status', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          project_id: 'test-project-123',
          status: 'ready_for_activation',
          features: {
            team_management: true,
            talent_tracking: true,
            scheduling: true,
            time_tracking: false
          },
          blocking_issues: [],
          calculated_at: '2024-01-01T00:00:00Z'
        },
        isLoading: false,
        error: null
      })

      mockUseCachedFeatureAvailability.mockReturnValue({
        canManageTeam: true,
        canTrackTalent: true,
        canSchedule: true,
        canTrackTime: false,
        isSetupComplete: true,
        isReadyForActivation: true,
        isActive: false,
        blockingIssues: [],
        nextSteps: ['Project is ready for activation']
      })

      render(<InfoTabDashboardOptimized project={mockProject} />)

      expect(screen.getByText('Ready for Activation')).toBeInTheDocument()
      expect(screen.getByText('All setup is complete. You can now activate your project')).toBeInTheDocument()
      expect(screen.getByText('Team Management')).toBeInTheDocument()
      expect(screen.getByText('Talent Tracking')).toBeInTheDocument()
      expect(screen.getByText('Scheduling')).toBeInTheDocument()
      expect(screen.getByText('None')).toBeInTheDocument() // No blocking issues
    })

    it('should display active status with all features enabled', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          project_id: 'test-project-123',
          status: 'active',
          features: {
            team_management: true,
            talent_tracking: true,
            scheduling: true,
            time_tracking: true
          },
          blocking_issues: [],
          calculated_at: '2024-01-01T00:00:00Z'
        },
        isLoading: false,
        error: null
      })

      mockUseCachedFeatureAvailability.mockReturnValue({
        canManageTeam: true,
        canTrackTalent: true,
        canSchedule: true,
        canTrackTime: true,
        isSetupComplete: true,
        isReadyForActivation: false,
        isActive: true,
        blockingIssues: [],
        nextSteps: ['Project is active and fully operational']
      })

      render(<InfoTabDashboardOptimized project={mockProject} />)

      expect(screen.getByText('Active & Operational')).toBeInTheDocument()
      expect(screen.getByText('Your project is fully operational and ready for production use')).toBeInTheDocument()
      expect(screen.getByText('Team Management')).toBeInTheDocument()
      expect(screen.getByText('Talent Tracking')).toBeInTheDocument()
      expect(screen.getByText('Scheduling')).toBeInTheDocument()
      expect(screen.getByText('Time Tracking')).toBeInTheDocument()
    })

    it('should handle navigation when action buttons are clicked', async () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          project_id: 'test-project-123',
          status: 'setup_required',
          features: {
            team_management: false,
            talent_tracking: false,
            scheduling: false,
            time_tracking: false
          },
          blocking_issues: ['missing_role_templates'],
          calculated_at: '2024-01-01T00:00:00Z'
        },
        isLoading: false,
        error: null
      })

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

      render(<InfoTabDashboardOptimized project={mockProject} />)

      const configureRolesButton = screen.getByText('Configure Roles')
      fireEvent.click(configureRolesButton)

      expect(mockPush).toHaveBeenCalledWith('/roles-team')
    })

    it('should display completed items when features are enabled', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          project_id: 'test-project-123',
          status: 'active',
          features: {
            team_management: true,
            talent_tracking: true,
            scheduling: true,
            time_tracking: true
          },
          blocking_issues: [],
          calculated_at: '2024-01-01T00:00:00Z'
        },
        isLoading: false,
        error: null
      })

      mockUseCachedFeatureAvailability.mockReturnValue({
        canManageTeam: true,
        canTrackTalent: true,
        canSchedule: true,
        canTrackTime: true,
        isSetupComplete: true,
        isReadyForActivation: false,
        isActive: true,
        blockingIssues: [],
        nextSteps: []
      })

      render(<InfoTabDashboardOptimized project={mockProject} />)

      expect(screen.getByText('Completed Setup (4)')).toBeInTheDocument()
      
      // Expand completed items
      fireEvent.click(screen.getByText('Completed Tasks'))
      
      expect(screen.getByText('Team management enabled')).toBeInTheDocument()
      expect(screen.getByText('Talent tracking enabled')).toBeInTheDocument()
      expect(screen.getByText('Scheduling enabled')).toBeInTheDocument()
      expect(screen.getByText('Time tracking enabled')).toBeInTheDocument()
    })

    it('should use custom onNavigate prop when provided', () => {
      const mockOnNavigate = vi.fn()

      mockUseReadiness.mockReturnValue({
        readiness: {
          project_id: 'test-project-123',
          status: 'setup_required',
          features: {
            team_management: false,
            talent_tracking: false,
            scheduling: false,
            time_tracking: false
          },
          blocking_issues: ['missing_role_templates'],
          calculated_at: '2024-01-01T00:00:00Z'
        },
        isLoading: false,
        error: null
      })

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

      render(<InfoTabDashboardOptimized project={mockProject} onNavigate={mockOnNavigate} />)

      const configureRolesButton = screen.getByText('Configure Roles')
      fireEvent.click(configureRolesButton)

      expect(mockOnNavigate).toHaveBeenCalledWith('/roles-team')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})