import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FeatureAvailabilityGuard, TimeTrackingGuard, AssignmentGuard } from '../feature-availability-guard'
import { useSpecificFeatureAvailability } from '@/hooks/use-feature-availability'

// Mock the feature availability hook
vi.mock('@/hooks/use-feature-availability', () => ({
  useSpecificFeatureAvailability: vi.fn()
}))

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

const mockUseSpecificFeatureAvailability = useSpecificFeatureAvailability as vi.MockedFunction<typeof useSpecificFeatureAvailability>

describe('Feature Availability Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('FeatureAvailabilityGuard', () => {
    it('should render children when feature is available', async () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: true,
        requirement: 'Feature is available',
        loading: false,
        error: null
      })

      render(
        <FeatureAvailabilityGuard projectId="test-project" feature="timeTracking">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureAvailabilityGuard>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render guidance when feature is not available', async () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'At least one staff member assigned',
        guidance: 'Assign team members to enable time tracking features',
        actionRoute: '/roles-team',
        blockedReason: 'No staff members assigned to project',
        loading: false,
        error: null
      })

      render(
        <FeatureAvailabilityGuard projectId="test-project" feature="timeTracking">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureAvailabilityGuard>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByText('Time Tracking Unavailable')).toBeInTheDocument()
      expect(screen.getAllByText('At least one staff member assigned')).toHaveLength(2) // Alert and card
      expect(screen.getAllByText('Assign team members to enable time tracking features')).toHaveLength(2)
      expect(screen.getByRole('button', { name: /complete setup/i })).toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'Loading...',
        loading: true,
        error: null
      })

      const { container } = render(
        <FeatureAvailabilityGuard projectId="test-project" feature="timeTracking">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureAvailabilityGuard>
      )

      // Check for loading animation elements
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should show error state', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'Error occurred',
        loading: false,
        error: 'Failed to check feature availability'
      })

      render(
        <FeatureAvailabilityGuard projectId="test-project" feature="timeTracking">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureAvailabilityGuard>
      )

      expect(screen.getByText('Failed to check feature availability: Failed to check feature availability')).toBeInTheDocument()
    })

    it('should render custom fallback when provided', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'Feature not available',
        loading: false,
        error: null
      })

      render(
        <FeatureAvailabilityGuard 
          projectId="test-project" 
          feature="timeTracking"
          fallback={<div data-testid="custom-fallback">Custom Fallback</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </FeatureAvailabilityGuard>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    })
  })

  describe('TimeTrackingGuard', () => {
    it('should render children when time tracking is available', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: true,
        requirement: 'Staff assigned',
        loading: false,
        error: null
      })

      render(
        <TimeTrackingGuard projectId="test-project">
          <div data-testid="time-tracking-content">Time Tracking Content</div>
        </TimeTrackingGuard>
      )

      expect(screen.getByTestId('time-tracking-content')).toBeInTheDocument()
    })

    it('should show guidance when time tracking is not available', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'At least one staff member assigned',
        guidance: 'Assign team members to enable time tracking features',
        actionRoute: '/roles-team',
        loading: false,
        error: null
      })

      render(
        <TimeTrackingGuard projectId="test-project">
          <div data-testid="time-tracking-content">Time Tracking Content</div>
        </TimeTrackingGuard>
      )

      expect(screen.queryByTestId('time-tracking-content')).not.toBeInTheDocument()
      expect(screen.getByText('Time Tracking Unavailable')).toBeInTheDocument()
    })
  })

  describe('AssignmentGuard', () => {
    it('should render children when assignments are available', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: true,
        requirement: 'Talent and escorts assigned',
        loading: false,
        error: null
      })

      render(
        <AssignmentGuard projectId="test-project">
          <div data-testid="assignment-content">Assignment Content</div>
        </AssignmentGuard>
      )

      expect(screen.getByTestId('assignment-content')).toBeInTheDocument()
    })

    it('should show guidance when assignments are not available', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'Both talent and escorts assigned',
        guidance: 'Add talent to enable assignment features',
        actionRoute: '/talent-roster',
        loading: false,
        error: null
      })

      render(
        <AssignmentGuard projectId="test-project">
          <div data-testid="assignment-content">Assignment Content</div>
        </AssignmentGuard>
      )

      expect(screen.queryByTestId('assignment-content')).not.toBeInTheDocument()
      expect(screen.getByText('Assignments Unavailable')).toBeInTheDocument()
    })
  })

  describe('Feature Availability Scenarios', () => {
    it('should handle project with no staff assigned', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'At least one staff member assigned',
        guidance: 'Assign team members to enable time tracking features',
        actionRoute: '/roles-team',
        blockedReason: 'No staff members assigned to project',
        loading: false,
        error: null
      })

      render(
        <TimeTrackingGuard projectId="test-project">
          <div data-testid="time-tracking">Time Tracking</div>
        </TimeTrackingGuard>
      )

      expect(screen.getAllByText('At least one staff member assigned')).toHaveLength(2)
      expect(screen.getAllByText('Assign team members to enable time tracking features')).toHaveLength(2)
    })

    it('should handle project with no talent assigned', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'Both talent and escorts assigned',
        guidance: 'Add talent to enable assignment features',
        actionRoute: '/talent-roster',
        blockedReason: 'No talent assigned to project',
        loading: false,
        error: null
      })

      render(
        <AssignmentGuard projectId="test-project">
          <div data-testid="assignments">Assignments</div>
        </AssignmentGuard>
      )

      expect(screen.getAllByText('Both talent and escorts assigned')).toHaveLength(2)
      expect(screen.getAllByText('Add talent to enable assignment features')).toHaveLength(2)
    })

    it('should handle project with talent but no escorts', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: false,
        requirement: 'Both talent and escorts assigned',
        guidance: 'Assign escorts to enable assignment features',
        actionRoute: '/roles-team',
        blockedReason: 'No escorts assigned to project',
        loading: false,
        error: null
      })

      render(
        <AssignmentGuard projectId="test-project">
          <div data-testid="assignments">Assignments</div>
        </AssignmentGuard>
      )

      expect(screen.getAllByText('Both talent and escorts assigned')).toHaveLength(2)
      expect(screen.getAllByText('Assign escorts to enable assignment features')).toHaveLength(2)
    })

    it('should handle fully configured project', () => {
      mockUseSpecificFeatureAvailability.mockReturnValue({
        available: true,
        requirement: 'All requirements met',
        loading: false,
        error: null
      })

      render(
        <div>
          <TimeTrackingGuard projectId="test-project">
            <div data-testid="time-tracking">Time Tracking Available</div>
          </TimeTrackingGuard>
          <AssignmentGuard projectId="test-project">
            <div data-testid="assignments">Assignments Available</div>
          </AssignmentGuard>
        </div>
      )

      expect(screen.getByTestId('time-tracking')).toBeInTheDocument()
      expect(screen.getByTestId('assignments')).toBeInTheDocument()
    })
  })
})