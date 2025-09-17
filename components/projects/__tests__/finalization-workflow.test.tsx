import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FinalizationButton } from '../finalization-button'

// Mock the useReadiness hook
const mockUseReadiness = vi.fn()
vi.mock('../../../lib/contexts/readiness-context', () => ({
  useReadiness: () => mockUseReadiness()
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}))

// Mock confirmation dialog
const mockConfirm = vi.fn()
global.confirm = mockConfirm

describe('FinalizationWorkflow', () => {
  const mockFinalize = vi.fn()
  const mockRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
    mockUseReadiness.mockReturnValue({
      readiness: {
        features: { talent_tracking: false },
        blocking_issues: ['missing_locations'],
        roles_finalized: false,
        team_finalized: false,
        talent_finalized: false
      },
      loading: false,
      error: null,
      finalize: mockFinalize,
      refresh: mockRefresh
    })
  })

  describe('FinalizationButton Component', () => {
    it('should render finalize button when not finalized', () => {
      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      expect(screen.getByText('Finalize Locations')).toBeInTheDocument()
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    it('should show finalized state when area is finalized', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          features: { talent_tracking: true },
          blocking_issues: [],
          status: 'active'
        },
        isLoading: false,
        error: null,
        invalidateReadiness: vi.fn()
      })

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      expect(screen.getByText('✅ Finalized')).toBeInTheDocument()
      expect(screen.getByText('January 15, 2024')).toBeInTheDocument()
    })

    it('should call finalize function when button is clicked', async () => {
      mockFinalize.mockResolvedValue({ success: true })

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByText('Finalize Locations')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith(
          'Are you sure you want to finalize locations? This will mark this area as complete.'
        )
        expect(mockFinalize).toHaveBeenCalledWith('locations')
      })
    })

    it('should not finalize if user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false)

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByText('Finalize Locations')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled()
        expect(mockFinalize).not.toHaveBeenCalled()
      })
    })

    it('should show loading state during finalization', async () => {
      mockFinalize.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByText('Finalize Locations')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Finalizing...')).toBeInTheDocument()
        expect(button).toBeDisabled()
      })
    })

    it('should show success toast on successful finalization', async () => {
      mockFinalize.mockResolvedValue({ success: true })

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByText('Finalize Locations')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Area Finalized',
          description: 'Locations have been marked as complete.',
          variant: 'default'
        })
      })
    })

    it('should show error toast on failed finalization', async () => {
      mockFinalize.mockRejectedValue(new Error('Finalization failed'))

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByText('Finalize Locations')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Finalization Failed',
          description: 'Failed to finalize locations. Please try again.',
          variant: 'destructive'
        })
      })
    })

    it('should be disabled when loading', () => {
      mockUseReadiness.mockReturnValue({
        readiness: null,
        isLoading: true,
        error: null,
        invalidateReadiness: vi.fn()
      })

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should handle different area types', () => {
      const areas = ['locations', 'roles', 'team', 'talent'] as const
      
      areas.forEach(area => {
        const { unmount } = render(
          <FinalizationButton 
            projectId="test-project" 
            area={area} 
            label={`Finalize ${area}`}
          />
        )
        
        expect(screen.getByText(`Finalize ${area}`)).toBeInTheDocument()
        unmount()
      })
    })

    it('should show appropriate confirmation message for each area', async () => {
      const testCases = [
        { area: 'locations' as const, expectedMessage: 'finalize locations' },
        { area: 'roles' as const, expectedMessage: 'finalize roles' },
        { area: 'team' as const, expectedMessage: 'finalize team' },
        { area: 'talent' as const, expectedMessage: 'finalize talent' }
      ]

      for (const { area, expectedMessage } of testCases) {
        const { unmount } = render(
          <FinalizationButton 
            projectId="test-project" 
            area={area} 
            label={`Finalize ${area}`}
          />
        )
        
        const button = screen.getByText(`Finalize ${area}`)
        fireEvent.click(button)
        
        await waitFor(() => {
          expect(mockConfirm).toHaveBeenCalledWith(
            expect.stringContaining(expectedMessage)
          )
        })
        
        unmount()
        vi.clearAllMocks()
      }
    })

    it('should refresh data after successful finalization', async () => {
      mockFinalize.mockResolvedValue({ success: true })

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByText('Finalize Locations')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('should handle keyboard navigation', async () => {
      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByRole('button')
      button.focus()
      
      expect(button).toHaveFocus()
      
      fireEvent.keyDown(button, { key: 'Enter' })
      
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled()
      })
    })

    it('should handle space key activation', async () => {
      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByRole('button')
      button.focus()
      
      fireEvent.keyDown(button, { key: ' ' })
      
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled()
      })
    })

    it('should have proper ARIA attributes', () => {
      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByRole('button')
      
      expect(button).toHaveAttribute('aria-label', 'Finalize locations area')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should show finalized by user information when available', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          features: { talent_tracking: true },
          blocking_issues: [],
          status: 'active'
        },
        isLoading: false,
        error: null,
        invalidateReadiness: vi.fn()
      })

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      expect(screen.getByText('Finalized by John Doe')).toBeInTheDocument()
    })

    it('should handle missing finalization metadata gracefully', () => {
      mockUseReadiness.mockReturnValue({
        readiness: {
          features: { talent_tracking: true },
          blocking_issues: [],
          status: 'active'
        },
        isLoading: false,
        error: null,
        invalidateReadiness: vi.fn()
      })

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      expect(screen.getByText('✅ Finalized')).toBeInTheDocument()
      expect(screen.queryByText('January')).not.toBeInTheDocument()
    })

    it('should prevent double-clicking during finalization', async () => {
      let resolveFinalize: (value: any) => void
      mockFinalize.mockImplementation(() => new Promise(resolve => {
        resolveFinalize = resolve
      }))

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByText('Finalize Locations')
      
      // First click
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(button).toBeDisabled()
      })
      
      // Second click should be ignored
      fireEvent.click(button)
      
      expect(mockFinalize).toHaveBeenCalledTimes(1)
      
      // Resolve the promise
      resolveFinalize!({ success: true })
    })
  })

  describe('Integration with Info Tab', () => {
    it('should integrate finalization buttons in section headers', () => {
      render(
        <div>
          <div className="section-header">
            <h3>Project Locations</h3>
            <FinalizationButton 
              projectId="test-project" 
              area="locations" 
              label="Finalize"
              size="sm"
            />
          </div>
        </div>
      )
      
      expect(screen.getByText('Project Locations')).toBeInTheDocument()
      expect(screen.getByText('Finalize')).toBeInTheDocument()
    })

    it('should update dashboard when finalization completes', async () => {
      mockFinalize.mockResolvedValue({ success: true })

      render(
        <FinalizationButton 
          projectId="test-project" 
          area="locations" 
          label="Finalize Locations"
        />
      )
      
      const button = screen.getByText('Finalize Locations')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })
})