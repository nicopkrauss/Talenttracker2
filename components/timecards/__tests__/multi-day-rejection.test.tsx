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

describe('Multi-Day Timecard Rejection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock multi-day timecard response
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            id: 'test-timecard',
            user_id: 'test-user',
            profiles: { full_name: 'Test User' },
            status: 'submitted',
            total_hours: 16,
            total_pay: 400,
            pay_rate: 25,
            is_multi_day: true,
            working_days: 2,
            daily_entries: [
              {
                id: 'entry-1',
                work_date: '2024-09-18',
                check_in_time: '2024-09-18T09:00:00Z',
                check_out_time: '2024-09-18T17:00:00Z',
                break_start_time: '2024-09-18T12:00:00Z',
                break_end_time: '2024-09-18T12:30:00Z',
                hours_worked: 8,
                break_duration: 0.5,
                daily_pay: 200
              },
              {
                id: 'entry-2',
                work_date: '2024-09-19',
                check_in_time: '2024-09-19T09:00:00Z',
                check_out_time: '2024-09-19T17:00:00Z',
                break_start_time: null,
                break_end_time: null,
                hours_worked: 8,
                break_duration: 0,
                daily_pay: 200
              }
            ]
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

  it('displays date-grouped fields correctly in rejection dialog', async () => {
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

    // Should show rejection mode UI
    expect(screen.getByText('(Click fields to flag issues)')).toBeInTheDocument()

    // Select total hours field (easier to target)
    const totalHoursField = screen.getByText('16.0')
    fireEvent.click(totalHoursField)

    // Confirm rejection
    fireEvent.click(screen.getByText('Confirm Rejection'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Should show selected fields
    expect(screen.getByText('Selected problematic fields:')).toBeInTheDocument()
    
    // Look for the bordered field in the dialog (not the one in the timecard display)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    
    // Check that the dialog contains the selected field
    const totalHoursInDialog = screen.getAllByText('Total Hours').find(element => 
      element.className.includes('border-red-300')
    )
    expect(totalHoursInDialog).toBeInTheDocument()
  })

  it('submits multi-day rejection with correct field IDs', async () => {
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
            total_hours: 16,
            total_pay: 400,
            pay_rate: 25,
            is_multi_day: true
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
    
    // Select total hours and pay rate
    fireEvent.click(screen.getByText('16.0'))
    fireEvent.click(screen.getByText('$25.00'))

    // Confirm rejection
    fireEvent.click(screen.getByText('Confirm Rejection'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Add reason and submit
    const reasonTextarea = screen.getByPlaceholderText('Please explain the issues with this timecard...')
    fireEvent.change(reasonTextarea, { target: { value: 'Hours and pay rate are incorrect' } })

    const submitButton = screen.getByRole('button', { name: /reject timecard/i })
    fireEvent.click(submitButton)

    // Verify the API was called with correct field IDs
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