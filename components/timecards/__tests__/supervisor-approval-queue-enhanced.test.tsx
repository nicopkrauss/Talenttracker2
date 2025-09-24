import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SupervisorApprovalQueueEnhanced } from '../supervisor-approval-queue-enhanced'
import type { Timecard } from '@/lib/types'

// Mock fetch
global.fetch = vi.fn()

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      }),
    },
  })),
}))

const mockTimecards: Timecard[] = [
  {
    id: 'timecard-1',
    user_id: 'user-1',
    project_id: 'project-1',
    date: '2024-01-15',
    check_in_time: '2024-01-15T09:00:00Z',
    check_out_time: '2024-01-15T17:00:00Z',
    break_start_time: '2024-01-15T12:00:00Z',
    break_end_time: '2024-01-15T12:30:00Z',
    total_hours: 8.0,
    break_duration: 30,
    pay_rate: 25.00,
    total_pay: 200.00,
    status: 'submitted',
    manually_edited: false,
    submitted_at: '2024-01-15T18:00:00Z',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T18:00:00Z',
    profiles: { full_name: 'John Doe' },
    projects: { name: 'Test Project' },
  },
  {
    id: 'timecard-2',
    user_id: 'user-2',
    project_id: 'project-1',
    date: '2024-01-15',
    check_in_time: '2024-01-15T10:00:00Z',
    check_out_time: '2024-01-15T18:00:00Z',
    break_start_time: '2024-01-15T13:00:00Z',
    break_end_time: '2024-01-15T13:30:00Z',
    total_hours: 7.5,
    break_duration: 30,
    pay_rate: 20.00,
    total_pay: 150.00,
    status: 'submitted',
    manually_edited: true, // This one has been manually edited
    submitted_at: '2024-01-15T19:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T19:00:00Z',
    profiles: { full_name: 'Jane Smith' },
    projects: { name: 'Test Project' },
  },
]

describe('SupervisorApprovalQueueEnhanced', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  it('should show permission error for users without approval rights', () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="talent_escort"
        globalSettings={{
          in_house_can_approve_timecards: false,
          supervisor_can_approve_timecards: false,
          coordinator_can_approve_timecards: false,
        }}
      />
    )

    expect(screen.getByText("You don't have permission to approve timecards.")).toBeInTheDocument()
    expect(screen.getByText("Contact an administrator to configure approval permissions for your role.")).toBeInTheDocument()
  })

  it('should display timecards for users with approval permissions', () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Manually Edited')).toBeInTheDocument()
  })

  it('should show edit button only for admin users', () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    const editButtons = screen.getAllByText('Edit')
    expect(editButtons).toHaveLength(2) // One for each timecard
  })

  it('should not show edit button for non-admin users', () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="supervisor"
        globalSettings={{
          supervisor_can_approve_timecards: true,
        }}
      />
    )

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('should require comments when rejecting a timecard (requirement 5.4)', async () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    // Click reject button
    const rejectButtons = screen.getAllByText('Reject')
    fireEvent.click(rejectButtons[0])

    // Dialog should open
    expect(screen.getByText('Reject Timecard')).toBeInTheDocument()
    expect(screen.getByText('Please provide a reason for rejecting this timecard.')).toBeInTheDocument()

    // Try to reject without comments
    const confirmRejectButton = screen.getByRole('button', { name: 'Reject Timecard' })
    expect(confirmRejectButton).toBeDisabled()

    // Add comments
    const textarea = screen.getByPlaceholderText('Explain why this timecard is being rejected...')
    fireEvent.change(textarea, { target: { value: 'Hours do not match schedule' } })

    // Now button should be enabled
    expect(confirmRejectButton).not.toBeDisabled()
  })

  it('should handle bulk approval with validation (requirement 5.9)', async () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    // Select all timecards
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /selected/ })
    fireEvent.click(selectAllCheckbox)

    // Click bulk approve
    const bulkApproveButton = screen.getByText('Approve 2 Timecards')
    fireEvent.click(bulkApproveButton)

    // Confirmation dialog should show validation info
    expect(screen.getByText('Confirm Bulk Approval')).toBeInTheDocument()
    expect(screen.getByText('1 timecard(s) have been manually edited and require special attention.')).toBeInTheDocument()
  })

  it('should call approve API when approving a timecard', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Timecard approved successfully' }),
    })

    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    const approveButtons = screen.getAllByText('Approve')
    fireEvent.click(approveButtons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/timecards/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: 'timecard-1',
          comments: undefined,
        }),
      })
    })

    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('should call reject API with required comments', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Timecard rejected successfully' }),
    })

    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    // Click reject button
    const rejectButtons = screen.getAllByText('Reject')
    fireEvent.click(rejectButtons[0])

    // Add comments
    const textarea = screen.getByPlaceholderText('Explain why this timecard is being rejected...')
    fireEvent.change(textarea, { target: { value: 'Hours do not match schedule' } })

    // Confirm rejection
    const confirmRejectButton = screen.getByRole('button', { name: 'Reject Timecard' })
    fireEvent.click(confirmRejectButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/timecards/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: 'timecard-1',
          comments: 'Hours do not match schedule',
        }),
      })
    })

    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Insufficient permissions' }),
    })

    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    const approveButtons = screen.getAllByText('Approve')
    fireEvent.click(approveButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Insufficient permissions')).toBeInTheDocument()
    })
  })

  it('should show manually edited flag prominently', () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    expect(screen.getByText('Manually Edited')).toBeInTheDocument()
    expect(screen.getByText('This timecard has been manually edited and requires supervisor review.')).toBeInTheDocument()
  })

  it('should allow in-house users to approve when configured', () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={mockTimecards}
        onUpdate={mockOnUpdate}
        userRole="in_house"
        globalSettings={{
          in_house_can_approve_timecards: true,
        }}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getAllByText('Approve')).toHaveLength(2)
  })

  it('should show empty state when no timecards', () => {
    render(
      <SupervisorApprovalQueueEnhanced
        timecards={[]}
        onUpdate={mockOnUpdate}
        userRole="admin"
        globalSettings={{}}
      />
    )

    expect(screen.getByText('No timecards pending approval.')).toBeInTheDocument()
  })
})
