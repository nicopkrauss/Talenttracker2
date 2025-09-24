import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MissingBreakResolutionModal } from '../missing-break-resolution-modal'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

const mockMissingBreaks = [
  {
    timecardId: '1',
    date: '2024-01-14', // Sunday
    totalHours: 8.5,
    hasBreakData: false
  },
  {
    timecardId: '2', 
    date: '2024-01-15', // Monday
    totalHours: 7.2,
    hasBreakData: false
  }
]

describe('MissingBreakResolutionModal', () => {
  const mockOnClose = vi.fn()
  const mockOnResolve = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with missing break information', () => {
    render(
      <MissingBreakResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        missingBreaks={mockMissingBreaks}
        onResolve={mockOnResolve}
      />
    )

    expect(screen.getByText('Missing Break Information')).toBeInTheDocument()
    expect(screen.getByText('8.5 hours worked')).toBeInTheDocument()
    expect(screen.getByText('7.2 hours worked')).toBeInTheDocument()
    
    // Check that both timecard dates are rendered (don't check exact format)
    const dateElements = screen.getAllByText(/January \d+, 2024/)
    expect(dateElements).toHaveLength(2)
  })

  it('shows resolution options for each missing break', () => {
    render(
      <MissingBreakResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        missingBreaks={mockMissingBreaks}
        onResolve={mockOnResolve}
      />
    )

    // Should have 2 "Add Break" buttons (one for each timecard)
    const addBreakButtons = screen.getAllByText('Add Break')
    expect(addBreakButtons).toHaveLength(2)

    // Should have 2 "I Did Not Take a Break" buttons
    const noBreakButtons = screen.getAllByText('I Did Not Take a Break')
    expect(noBreakButtons).toHaveLength(2)
  })

  it('tracks resolution selections', () => {
    render(
      <MissingBreakResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        missingBreaks={mockMissingBreaks}
        onResolve={mockOnResolve}
      />
    )

    // Initially shows 0 resolved
    expect(screen.getByText('0 of 2 resolved')).toBeInTheDocument()

    // Click "Add Break" for first timecard
    const addBreakButtons = screen.getAllByText('Add Break')
    fireEvent.click(addBreakButtons[0])

    // Should show 1 resolved
    expect(screen.getByText('1 of 2 resolved')).toBeInTheDocument()

    // Click "I Did Not Take a Break" for second timecard
    const noBreakButtons = screen.getAllByText('I Did Not Take a Break')
    fireEvent.click(noBreakButtons[1])

    // Should show 2 resolved
    expect(screen.getByText('2 of 2 resolved')).toBeInTheDocument()
  })

  it('enables submit button only when all breaks are resolved', () => {
    render(
      <MissingBreakResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        missingBreaks={mockMissingBreaks}
        onResolve={mockOnResolve}
      />
    )

    const submitButton = screen.getByText('Continue with Submission')
    expect(submitButton).toBeDisabled()

    // Resolve first break
    const addBreakButtons = screen.getAllByText('Add Break')
    fireEvent.click(addBreakButtons[0])
    expect(submitButton).toBeDisabled()

    // Resolve second break
    const noBreakButtons = screen.getAllByText('I Did Not Take a Break')
    fireEvent.click(noBreakButtons[1])
    expect(submitButton).not.toBeDisabled()
  })

  it('calls onResolve with correct resolutions when submitted', async () => {
    render(
      <MissingBreakResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        missingBreaks={mockMissingBreaks}
        onResolve={mockOnResolve}
      />
    )

    // Resolve breaks
    const addBreakButtons = screen.getAllByText('Add Break')
    fireEvent.click(addBreakButtons[0])

    const noBreakButtons = screen.getAllByText('I Did Not Take a Break')
    fireEvent.click(noBreakButtons[1])

    // Submit
    const submitButton = screen.getByText('Continue with Submission')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith({
        '1': 'add_break',
        '2': 'no_break'
      })
    })
  })

  it('shows loading state during resolution', () => {
    render(
      <MissingBreakResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        missingBreaks={mockMissingBreaks}
        onResolve={mockOnResolve}
        isResolving={true}
      />
    )

    expect(screen.getByText('Resolving...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('calls onClose when cancel is clicked', () => {
    render(
      <MissingBreakResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        missingBreaks={mockMissingBreaks}
        onResolve={mockOnResolve}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })
})