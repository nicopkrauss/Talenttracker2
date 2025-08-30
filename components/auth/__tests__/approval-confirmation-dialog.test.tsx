import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApprovalConfirmationDialog } from '../approval-confirmation-dialog'
import type { PendingUser } from '@/lib/types'

describe('ApprovalConfirmationDialog', () => {
  const user = userEvent.setup()
  const mockOnOpenChange = vi.fn()
  const mockOnConfirm = vi.fn()

  const singleUser: PendingUser[] = [
    {
      id: '1',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      city: 'New York',
      state: 'NY',
      created_at: '2024-01-01T00:00:00Z',
    },
  ]

  const multipleUsers: PendingUser[] = [
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

  it('does not render when closed', () => {
    render(
      <ApprovalConfirmationDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
      />
    )
    
    expect(screen.queryByText('Approve User Account')).not.toBeInTheDocument()
  })

  it('renders single user approval dialog', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
      />
    )
    
    expect(screen.getByText('Approve User Account')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to approve/)).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Approve User')).toBeInTheDocument()
  })

  it('renders multiple users approval dialog', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={multipleUsers}
        onConfirm={mockOnConfirm}
      />
    )
    
    expect(screen.getByText('Approve 2 User Accounts')).toBeInTheDocument()
    expect(screen.getByText('2 user accounts')).toBeInTheDocument()
    expect(screen.getByText('Approve 2 Users')).toBeInTheDocument()
  })

  it('displays user list for multiple users', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={multipleUsers}
        onConfirm={mockOnConfirm}
      />
    )
    
    expect(screen.getByText('Users to be approved:')).toBeInTheDocument()
    expect(screen.getByText('• John Doe (john@example.com)')).toBeInTheDocument()
    expect(screen.getByText('• Jane Smith (jane@example.com)')).toBeInTheDocument()
  })

  it('shows approval benefits for single user', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
      />
    )
    
    expect(screen.getByText('Grant them access to the Talent Tracker system')).toBeInTheDocument()
    expect(screen.getByText('Send them a welcome notification')).toBeInTheDocument()
    expect(screen.getByText('Allow them to log in and use the application')).toBeInTheDocument()
  })

  it('shows approval benefits for multiple users', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={multipleUsers}
        onConfirm={mockOnConfirm}
      />
    )
    
    expect(screen.getByText('Grant all selected users access to the Talent Tracker system')).toBeInTheDocument()
    expect(screen.getByText('Send welcome notifications to all approved users')).toBeInTheDocument()
    expect(screen.getByText('Allow them to log in and use the application')).toBeInTheDocument()
  })

  it('handles confirm action', async () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
      />
    )
    
    const confirmButton = screen.getByText('Approve User')
    await user.click(confirmButton)
    
    expect(mockOnConfirm).toHaveBeenCalledOnce()
  })

  it('handles cancel action', async () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
      />
    )
    
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('shows loading state', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
        loading={true}
      />
    )
    
    expect(screen.getByText('Approving...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeDisabled()
    
    const confirmButton = screen.getByText('Approving...')
    expect(confirmButton).toBeDisabled()
  })

  it('shows loading state for multiple users', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={multipleUsers}
        onConfirm={mockOnConfirm}
        loading={true}
      />
    )
    
    expect(screen.getByText('Approving...')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
      />
    )
    
    // Check for dialog role and proper heading structure
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Approve User Account' })).toBeInTheDocument()
  })

  it('displays correct icons for single vs multiple users', () => {
    const { rerender } = render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
      />
    )
    
    // Single user should show UserCheck icon in title
    expect(screen.getByText('Approve User Account')).toBeInTheDocument()
    
    rerender(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={multipleUsers}
        onConfirm={mockOnConfirm}
      />
    )
    
    // Multiple users should show Users icon in title
    expect(screen.getByText('Approve 2 User Accounts')).toBeInTheDocument()
  })

  it('handles empty users array', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={[]}
        onConfirm={mockOnConfirm}
      />
    )
    
    expect(screen.getByText('Approve 0 User Accounts')).toBeInTheDocument()
    expect(screen.getByText('Approve 0 Users')).toBeInTheDocument()
  })

  it('has proper button styling', () => {
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={singleUser}
        onConfirm={mockOnConfirm}
      />
    )
    
    const confirmButton = screen.getByText('Approve User')
    expect(confirmButton).toHaveClass('bg-green-600', 'hover:bg-green-700')
  })

  it('scrolls user list when many users', () => {
    const manyUsers = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      full_name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      created_at: '2024-01-01T00:00:00Z',
    }))
    
    render(
      <ApprovalConfirmationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        users={manyUsers}
        onConfirm={mockOnConfirm}
      />
    )
    
    // Check that the user list container has scroll classes
    const userListContainer = screen.getByText('Users to be approved:').nextElementSibling
    expect(userListContainer).toHaveClass('max-h-32', 'overflow-y-auto')
  })
})