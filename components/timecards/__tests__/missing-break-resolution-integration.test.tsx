import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { TimecardList } from '../timecard-list'
import type { Timecard } from '@/lib/types'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock fetch for API calls
global.fetch = vi.fn()

const mockTimecards: Timecard[] = [
  {
    id: "1",
    user_id: "user1",
    project_id: "project1",
    date: "2024-01-15",
    check_in_time: "2024-01-15T08:00:00Z",
    check_out_time: "2024-01-15T17:30:00Z",
    break_start_time: null, // Missing break data
    break_end_time: null,
    total_hours: 9.5, // >6 hours, should trigger missing break resolution
    break_duration: 0,
    pay_rate: 25,
    total_pay: 237.5,
    status: "draft",
    manually_edited: false,
    created_at: "2024-01-15T08:00:00Z",
    updated_at: "2024-01-15T08:00:00Z",
    projects: {
      name: "Demo Project"
    }
  },
  {
    id: "2",
    user_id: "user1",
    project_id: "project1",
    date: "2024-01-16",
    check_in_time: "2024-01-16T09:00:00Z",
    check_out_time: "2024-01-16T16:00:00Z",
    break_start_time: "2024-01-16T12:00:00Z", // Has break data
    break_end_time: "2024-01-16T12:30:00Z",
    total_hours: 6.5,
    break_duration: 30,
    pay_rate: 25,
    total_pay: 162.5,
    status: "draft",
    manually_edited: false,
    created_at: "2024-01-16T09:00:00Z",
    updated_at: "2024-01-16T09:00:00Z",
    projects: {
      name: "Demo Project"
    }
  }
]

describe('Missing Break Resolution Integration', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockClear()
  })

  it('shows missing break modal when submitting timecard with missing breaks', async () => {
    render(
      <TimecardList 
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
      />
    )

    // Find and click submit button for the timecard with missing breaks
    const submitButtons = screen.getAllByText('Submit')
    fireEvent.click(submitButtons[0]) // First timecard has missing breaks

    // Should show the missing break resolution modal
    await waitFor(() => {
      expect(screen.getByText('Missing Break Information')).toBeInTheDocument()
    })

    expect(screen.getByText('9.5 hours worked')).toBeInTheDocument()
    expect(screen.getByText('Add Break')).toBeInTheDocument()
    expect(screen.getByText('I Did Not Take a Break')).toBeInTheDocument()
  })

  it('allows user to resolve missing breaks and continue with submission', async () => {
    // Mock successful API responses
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, updatedTimecards: ['1'] })
    })

    render(
      <TimecardList 
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
      />
    )

    // Submit timecard with missing breaks
    const submitButtons = screen.getAllByText('Submit')
    fireEvent.click(submitButtons[0])

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Missing Break Information')).toBeInTheDocument()
    })

    // Select "Add Break" resolution
    const addBreakButton = screen.getByText('Add Break')
    fireEvent.click(addBreakButton)

    // Submit the resolution
    const continueButton = screen.getByText('Continue with Submission')
    expect(continueButton).not.toBeDisabled()
    
    fireEvent.click(continueButton)

    // Should call the resolve-breaks API
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/timecards/resolve-breaks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardIds: ['1'],
          resolutions: { '1': 'add_break' }
        })
      })
    })

    // Should call onUpdate to refresh data
    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('supports bulk submission with missing break resolution', async () => {
    // Mock successful API responses
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, updatedTimecards: ['1'] })
    })

    render(
      <TimecardList 
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        enableBulkSubmit={true}
      />
    )

    // Click bulk submit button (get the button, not the heading)
    const bulkSubmitButton = screen.getByRole('button', { name: /Submit All/ })
    fireEvent.click(bulkSubmitButton)

    // Should show missing break modal for all timecards with issues
    await waitFor(() => {
      expect(screen.getByText('Missing Break Information')).toBeInTheDocument()
    })

    // Should show the timecard with missing breaks
    expect(screen.getByText('9.5 hours worked')).toBeInTheDocument()

    // Resolve the missing break
    const addBreakButton = screen.getByText('Add Break')
    fireEvent.click(addBreakButton)

    // Submit resolution
    const continueButton = screen.getByText('Continue with Submission')
    fireEvent.click(continueButton)

    // Should call API with all pending timecard IDs
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/timecards/resolve-breaks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardIds: ['1', '2'], // Both timecard IDs
          resolutions: { '1': 'add_break' }
        })
      })
    })
  })

  it('prevents submission when resolution is not provided', async () => {
    render(
      <TimecardList 
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
      />
    )

    // Submit timecard with missing breaks
    const submitButtons = screen.getAllByText('Submit')
    fireEvent.click(submitButtons[0])

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Missing Break Information')).toBeInTheDocument()
    })

    // Continue button should be disabled without resolution
    const continueButton = screen.getByText('Continue with Submission')
    expect(continueButton).toBeDisabled()

    // Should show resolution count
    expect(screen.getByText('0 of 1 resolved')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    // Mock API error
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to resolve breaks' })
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <TimecardList 
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
      />
    )

    // Submit timecard with missing breaks
    const submitButtons = screen.getAllByText('Submit')
    fireEvent.click(submitButtons[0])

    // Wait for modal and resolve break
    await waitFor(() => {
      expect(screen.getByText('Missing Break Information')).toBeInTheDocument()
    })

    const addBreakButton = screen.getByText('Add Break')
    fireEvent.click(addBreakButton)

    const continueButton = screen.getByText('Continue with Submission')
    fireEvent.click(continueButton)

    // Should handle error (the error message may vary based on the mock setup)
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error'), expect.any(Object))
    })

    consoleSpy.mockRestore()
  })

  it('allows canceling the resolution modal', async () => {
    render(
      <TimecardList 
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
      />
    )

    // Submit timecard with missing breaks
    const submitButtons = screen.getAllByText('Submit')
    fireEvent.click(submitButtons[0])

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Missing Break Information')).toBeInTheDocument()
    })

    // Click cancel
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Missing Break Information')).not.toBeInTheDocument()
    })

    // Should not call any APIs
    expect(fetch).not.toHaveBeenCalled()
  })
})