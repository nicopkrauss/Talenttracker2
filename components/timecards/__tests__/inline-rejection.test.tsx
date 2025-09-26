import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { ProjectTimecardApproval } from '../project-timecard-approval'

// Mock the Supabase client
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    // Mock client methods if needed
  }))
}))

const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'Test Description'
}

describe('Inline Timecard Rejection Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful fetch responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            id: 'test-timecard',
            user_id: 'test-user',
            profiles: { full_name: 'Test User' },
            status: 'submitted',
            total_hours: 8,
            total_pay: 200,
            pay_rate: 25,
            break_duration: 0.5,
            date: '2024-01-01',
            check_in_time: '2024-01-01T09:00:00Z',
            check_out_time: '2024-01-01T17:00:00Z',
            break_start_time: '2024-01-01T12:00:00Z',
            break_end_time: '2024-01-01T12:30:00Z'
          }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          assignments: []
        })
      })
  })

  it('enters rejection mode when reject button is clicked', async () => {
    render(
      <ProjectTimecardApproval
        projectId="test-project-id"
        project={mockProject}
      />
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
    
    // Click reject button to enter rejection mode
    const rejectButton = screen.getByText('Reject')
    fireEvent.click(rejectButton)

    // Should show rejection mode UI
    expect(screen.getByText('(Click fields to flag issues)')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Confirm Rejection')).toBeInTheDocument()
  })

  it('allows field selection in rejection mode', async () => {
    render(
      <ProjectTimecardApproval
        projectId="test-project-id"
        project={mockProject}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
    
    // Enter rejection mode
    fireEvent.click(screen.getByText('Reject'))

    // Confirm rejection button should be disabled initially
    const confirmButton = screen.getByText('Confirm Rejection')
    expect(confirmButton).toBeDisabled()

    // Click on a time field (this should select it)
    const checkInFields = screen.getAllByText('9:00 AM')
    fireEvent.click(checkInFields[0]) // Click the first check-in time field

    // Now confirm button should be enabled
    expect(confirmButton).not.toBeDisabled()
  })

  it('shows reason dialog when confirming rejection', async () => {
    render(
      <ProjectTimecardApproval
        projectId="test-project-id"
        project={mockProject}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
    
    // Enter rejection mode and select a field
    fireEvent.click(screen.getByText('Reject'))
    
    // Click on total hours field
    const totalHoursField = screen.getByText('8.0')
    fireEvent.click(totalHoursField)

    // Click confirm rejection
    const confirmButton = screen.getByText('Confirm Rejection')
    fireEvent.click(confirmButton)

    // Should show reason dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Selected problematic fields:')).toBeInTheDocument()
    expect(screen.getByText('Total Hours')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Please explain the issues with this timecard...')).toBeInTheDocument()
  })

  it('exits rejection mode when cancel is clicked', async () => {
    render(
      <ProjectTimecardApproval
        projectId="test-project-id"
        project={mockProject}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
    
    // Enter rejection mode
    fireEvent.click(screen.getByText('Reject'))
    expect(screen.getByText('(Click fields to flag issues)')).toBeInTheDocument()

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'))

    // Should exit rejection mode
    expect(screen.queryByText('(Click fields to flag issues)')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('submits rejection with selected fields and reason', async () => {
    const mockRejectFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            id: 'test-timecard',
            user_id: 'test-user',
            profiles: { full_name: 'Test User' },
            status: 'submitted',
            total_hours: 8,
            total_pay: 200,
            pay_rate: 25,
            break_duration: 0.5,
            date: '2024-01-01'
          }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ assignments: [] })
      })
      .mockImplementation(mockRejectFetch)

    render(
      <ProjectTimecardApproval
        projectId="test-project-id"
        project={mockProject}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
    
    // Enter rejection mode and select fields
    fireEvent.click(screen.getByText('Reject'))
    fireEvent.click(screen.getByText('8.0')) // Select total hours
    fireEvent.click(screen.getByText('$25.00')) // Select pay rate

    // Confirm rejection
    fireEvent.click(screen.getByText('Confirm Rejection'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Add reason
    const reasonTextarea = screen.getByPlaceholderText('Please explain the issues with this timecard...')
    fireEvent.change(reasonTextarea, { target: { value: 'Hours and pay rate are incorrect' } })

    // Submit rejection
    const submitButton = screen.getByRole('button', { name: /reject timecard/i })
    fireEvent.click(submitButton)

    // Verify the API was called with correct data
    await waitFor(() => {
      expect(mockRejectFetch).toHaveBeenCalledWith('/api/timecards/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: 'test-timecard',
          comments: 'Hours and pay rate are incorrect',
          rejectedFields: ['total_hours', 'pay_rate'],
        }),
      })
    })
  })
})