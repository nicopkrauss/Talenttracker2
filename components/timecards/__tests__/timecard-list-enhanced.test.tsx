import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimecardList } from '../timecard-list'
import type { Timecard } from '@/lib/types'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => mockSupabase)
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('Enhanced TimecardList Component', () => {
  const mockOnUpdate = vi.fn()

  const mockDraftTimecard: Timecard = {
    id: '1',
    user_id: 'user1',
    project_id: 'project1',
    date: '2024-01-15',
    check_in_time: '2024-01-15T09:00:00Z',
    check_out_time: '2024-01-15T17:00:00Z',
    break_start_time: '2024-01-15T12:00:00Z',
    break_end_time: '2024-01-15T12:30:00Z',
    total_hours: 8,
    break_duration: 30,
    pay_rate: 25,
    total_pay: 200,
    status: 'draft',
    manually_edited: false,
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z'
  }

  const mockSubmittedTimecard: Timecard = {
    ...mockDraftTimecard,
    id: '2',
    status: 'submitted',
    submitted_at: '2024-01-15T18:00:00Z'
  }

  const mockApprovedTimecard: Timecard = {
    ...mockDraftTimecard,
    id: '3',
    status: 'approved',
    submitted_at: '2024-01-15T18:00:00Z',
    approved_at: '2024-01-16T09:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Post-Submission View Restrictions (Requirement 4.8)', () => {
    it('should show edit and submit buttons for draft timecards', () => {
      render(
        <TimecardList 
          timecards={[mockDraftTimecard]} 
          onUpdate={mockOnUpdate} 
        />
      )

      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Submit')).toBeInTheDocument()
    })

    it('should hide edit and submit buttons for submitted timecards', () => {
      render(
        <TimecardList 
          timecards={[mockSubmittedTimecard]} 
          onUpdate={mockOnUpdate} 
        />
      )

      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      expect(screen.queryByText('Submit')).not.toBeInTheDocument()
      expect(screen.getByText('View Details')).toBeInTheDocument()
    })

    it('should show restriction message for submitted timecards', () => {
      render(
        <TimecardList 
          timecards={[mockSubmittedTimecard]} 
          onUpdate={mockOnUpdate} 
        />
      )

      expect(screen.getByText(/submitted and cannot be edited/)).toBeInTheDocument()
      expect(screen.getByText(/Contact your supervisor/)).toBeInTheDocument()
    })

    it('should show restriction message for approved timecards', () => {
      render(
        <TimecardList 
          timecards={[mockApprovedTimecard]} 
          onUpdate={mockOnUpdate} 
        />
      )

      expect(screen.getByText(/approved and cannot be edited/)).toBeInTheDocument()
    })

    it('should not show restriction message for draft timecards', () => {
      render(
        <TimecardList 
          timecards={[mockDraftTimecard]} 
          onUpdate={mockOnUpdate} 
        />
      )

      expect(screen.queryByText(/cannot be edited/)).not.toBeInTheDocument()
    })
  })

  describe('Show Day Submission Timing (Requirement 7.5)', () => {
    it('should allow submission when show day has begun', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const projectStartDate = yesterday.toISOString().split('T')[0]

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })

      render(
        <TimecardList 
          timecards={[mockDraftTimecard]} 
          onUpdate={mockOnUpdate}
          projectStartDate={projectStartDate}
        />
      )

      const submitButton = screen.getByText('Submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('timecards')
      })
    })

    it('should block submission when show day has not begun', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const projectStartDate = tomorrow.toISOString().split('T')[0]

      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <TimecardList 
          timecards={[mockDraftTimecard]} 
          onUpdate={mockOnUpdate}
          projectStartDate={projectStartDate}
        />
      )

      const submitButton = screen.getByText('Submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('not available until show day begins')
        )
      })

      alertSpy.mockRestore()
    })

    it('should show error message for bulk submission when show day has not begun', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const projectStartDate = tomorrow.toISOString().split('T')[0]

      render(
        <TimecardList 
          timecards={[mockDraftTimecard]} 
          onUpdate={mockOnUpdate}
          enableBulkSubmit={true}
          projectStartDate={projectStartDate}
        />
      )

      expect(screen.getByText(/not available until show day begins/)).toBeInTheDocument()
      
      const bulkSubmitButton = screen.getByRole('button', { name: /Submit All \(1\)/ })
      expect(bulkSubmitButton).toBeDisabled()
    })

    it('should enable bulk submission when show day has begun', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const projectStartDate = yesterday.toISOString().split('T')[0]

      render(
        <TimecardList 
          timecards={[mockDraftTimecard]} 
          onUpdate={mockOnUpdate}
          enableBulkSubmit={true}
          projectStartDate={projectStartDate}
        />
      )

      const bulkSubmitButton = screen.getByRole('button', { name: /Submit All \(1\)/ })
      expect(bulkSubmitButton).not.toBeDisabled()
    })
  })

  describe('Missing Break Resolution Integration', () => {
    const longShiftTimecard: Timecard = {
      ...mockDraftTimecard,
      total_hours: 8,
      break_start_time: undefined,
      break_end_time: undefined,
      break_duration: 0
    }

    it('should show missing break modal for long shifts without breaks', async () => {
      render(
        <TimecardList 
          timecards={[longShiftTimecard]} 
          onUpdate={mockOnUpdate} 
        />
      )

      const submitButton = screen.getByText('Submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Missing Break Information/)).toBeInTheDocument()
      })
    })

    it('should handle break resolution and proceed with submission', async () => {
      // Mock the resolve-breaks API
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })

      render(
        <TimecardList 
          timecards={[longShiftTimecard]} 
          onUpdate={mockOnUpdate} 
        />
      )

      const submitButton = screen.getByText('Submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Missing Break Information/)).toBeInTheDocument()
      })

      // Simulate resolving the break
      const addBreakButton = screen.getByText('Add Break')
      fireEvent.click(addBreakButton)

      const resolveButton = screen.getByText('Continue with Submission')
      fireEvent.click(resolveButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/timecards/resolve-breaks', expect.any(Object))
      })
    })
  })

  describe('Mixed Timecard Statuses', () => {
    it('should handle timecards with different statuses correctly', () => {
      const mixedTimecards = [mockDraftTimecard, mockSubmittedTimecard, mockApprovedTimecard]

      render(
        <TimecardList 
          timecards={mixedTimecards} 
          onUpdate={mockOnUpdate} 
        />
      )

      // Draft timecard should have edit/submit buttons
      const cards = screen.getAllByText('View Details')
      expect(cards).toHaveLength(3)

      // Only one edit button (for draft)
      expect(screen.getAllByText('Edit')).toHaveLength(1)
      
      // Only one submit button (for draft)
      expect(screen.getAllByText('Submit')).toHaveLength(1)

      // Restriction messages for non-draft timecards
      expect(screen.getByText(/submitted and cannot be edited/)).toBeInTheDocument()
      expect(screen.getByText(/approved and cannot be edited/)).toBeInTheDocument()
    })
  })
})