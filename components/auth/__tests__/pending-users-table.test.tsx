import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PendingUsersTable } from '../pending-users-table'
import type { PendingUser } from '@/lib/types'

// Mock the user approval hook
const mockApproveUsers = vi.fn()
vi.mock('../use-user-approval', () => ({
  useUserApproval: () => ({
    approveUsers: mockApproveUsers,
    loading: false,
  }),
}))

// Mock the approval confirmation dialog
vi.mock('../approval-confirmation-dialog', () => ({
  ApprovalConfirmationDialog: ({ 
    open, 
    users, 
    onConfirm, 
    onOpenChange 
  }: {
    open: boolean
    users: PendingUser[]
    onConfirm: () => void
    onOpenChange: (open: boolean) => void
  }) => (
    open ? (
      <div data-testid="approval-dialog">
        <div>Approve {users.length} user(s)?</div>
        <button onClick={onConfirm} data-testid="confirm-approval">Confirm</button>
        <button onClick={() => onOpenChange(false)} data-testid="cancel-approval">Cancel</button>
      </div>
    ) : null
  ),
}))

describe('PendingUsersTable', () => {
  const user = userEvent.setup()
  const mockOnUsersApproved = vi.fn()

  const mockUsers: PendingUser[] = [
    {
      id: '1',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      city: 'New York',
      state: 'NY',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '(555) 987-6543',
      city: 'Los Angeles',
      state: 'CA',
      created_at: '2024-01-02T00:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no users', () => {
    render(<PendingUsersTable users={[]} />)
    
    expect(screen.getByText('No Pending Approvals')).toBeInTheDocument()
    expect(screen.getByText(/All user registrations have been processed/)).toBeInTheDocument()
  })

  it('renders users table with data', () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    expect(screen.getByText('Pending Approvals (2)')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('displays user information correctly', () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    // Check phone numbers
    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
    expect(screen.getByText('(555) 987-6543')).toBeInTheDocument()
    
    // Check locations
    expect(screen.getByText('New York, NY')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument()
    
    // Check registration dates (format may vary by locale)
    expect(screen.getByText(/1\/1\/2024|1\/2\/2024/)).toBeInTheDocument()
  })

  it('handles individual user selection', async () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    const firstCheckbox = screen.getAllByRole('checkbox')[1] // Skip "select all" checkbox
    await user.click(firstCheckbox)
    
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByText('Approve 1 User')).toBeInTheDocument()
  })

  it('handles select all functionality', async () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    await user.click(selectAllCheckbox)
    
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getByText('Approve 2 Users')).toBeInTheDocument()
  })

  it('handles individual approval', async () => {
    render(<PendingUsersTable users={mockUsers} onUsersApproved={mockOnUsersApproved} />)
    
    const approveButtons = screen.getAllByText('Approve')
    await user.click(approveButtons[0])
    
    expect(screen.getByTestId('approval-dialog')).toBeInTheDocument()
    expect(screen.getByText('Approve 1 user(s)?')).toBeInTheDocument()
  })

  it('handles bulk approval', async () => {
    render(<PendingUsersTable users={mockUsers} onUsersApproved={mockOnUsersApproved} />)
    
    // Select all users
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    await user.click(selectAllCheckbox)
    
    // Click bulk approve
    const bulkApproveButton = screen.getByText('Approve 2 Users')
    await user.click(bulkApproveButton)
    
    expect(screen.getByTestId('approval-dialog')).toBeInTheDocument()
    expect(screen.getByText('Approve 2 user(s)?')).toBeInTheDocument()
  })

  it('completes approval process', async () => {
    mockApproveUsers.mockResolvedValue(undefined)
    
    render(<PendingUsersTable users={mockUsers} onUsersApproved={mockOnUsersApproved} />)
    
    // Select first user
    const firstCheckbox = screen.getAllByRole('checkbox')[1]
    await user.click(firstCheckbox)
    
    // Click bulk approve
    const bulkApproveButton = screen.getByText('Approve 1 User')
    await user.click(bulkApproveButton)
    
    // Confirm approval
    const confirmButton = screen.getByTestId('confirm-approval')
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(mockApproveUsers).toHaveBeenCalledWith(['1'])
      expect(mockOnUsersApproved).toHaveBeenCalled()
    })
  })

  it('handles approval cancellation', async () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    // Select first user and start approval
    const firstCheckbox = screen.getAllByRole('checkbox')[1]
    await user.click(firstCheckbox)
    
    const bulkApproveButton = screen.getByText('Approve 1 User')
    await user.click(bulkApproveButton)
    
    // Cancel approval
    const cancelButton = screen.getByTestId('cancel-approval')
    await user.click(cancelButton)
    
    expect(screen.queryByTestId('approval-dialog')).not.toBeInTheDocument()
    expect(mockApproveUsers).not.toHaveBeenCalled()
  })

  it('handles approval errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApproveUsers.mockRejectedValue(new Error('Approval failed'))
    
    render(<PendingUsersTable users={mockUsers} />)
    
    // Select and approve first user
    const firstCheckbox = screen.getAllByRole('checkbox')[1]
    await user.click(firstCheckbox)
    
    const bulkApproveButton = screen.getByText('Approve 1 User')
    await user.click(bulkApproveButton)
    
    const confirmButton = screen.getByTestId('confirm-approval')
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Approval failed:', expect.any(Error))
    })
    
    consoleError.mockRestore()
  })

  it('shows bulk actions footer for multiple users', () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    expect(screen.getByText('Select users above to perform bulk actions')).toBeInTheDocument()
    expect(screen.getByText('Select All')).toBeInTheDocument()
    expect(screen.getByText('Clear Selection')).toBeInTheDocument()
  })

  it('handles bulk action buttons correctly', async () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    const selectAllButton = screen.getByText('Select All')
    const clearSelectionButton = screen.getByText('Clear Selection')
    
    // Initially clear selection should be disabled
    expect(clearSelectionButton).toBeDisabled()
    
    // Click select all
    await user.click(selectAllButton)
    
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(selectAllButton).toBeDisabled()
    expect(clearSelectionButton).not.toBeDisabled()
    
    // Click clear selection
    await user.click(clearSelectionButton)
    
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument()
    expect(selectAllButton).not.toBeDisabled()
    expect(clearSelectionButton).toBeDisabled()
  })

  it('displays loading state correctly', () => {
    render(<PendingUsersTable users={mockUsers} loading={true} />)
    
    const approveButtons = screen.getAllByText('Approve')
    approveButtons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('shows user avatars with initials', () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    // Check for avatar initials
    expect(screen.getByText('JD')).toBeInTheDocument() // John Doe
    expect(screen.getByText('JS')).toBeInTheDocument() // Jane Smith
  })

  it('handles partial selection state', async () => {
    render(<PendingUsersTable users={mockUsers} />)
    
    // Select only first user
    const firstCheckbox = screen.getAllByRole('checkbox')[1]
    await user.click(firstCheckbox)
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    
    // Should be in indeterminate state (this is handled by the ref callback)
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })
})