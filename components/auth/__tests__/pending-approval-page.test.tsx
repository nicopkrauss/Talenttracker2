import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PendingApprovalPage } from '../pending-approval-page'

// Mock the auth hook
const mockSignOut = vi.fn()
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
  }),
}))

describe('PendingApprovalPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders pending approval message', () => {
    render(<PendingApprovalPage />)
    
    expect(screen.getByText('Talent Tracker')).toBeInTheDocument()
    expect(screen.getByText('Professional Talent Management System')).toBeInTheDocument()
    expect(screen.getByText('Account Pending')).toBeInTheDocument()
    expect(screen.getByText(/Your account has been created and is awaiting approval/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
  })

  it('displays proper layout structure', () => {
    render(<PendingApprovalPage />)
    
    // Check for header, main, and footer sections
    const header = screen.getByRole('banner')
    const main = screen.getByRole('main')
    const footer = screen.getByRole('contentinfo')
    
    expect(header).toBeInTheDocument()
    expect(main).toBeInTheDocument()
    expect(footer).toBeInTheDocument()
  })

  it('shows clock icon', () => {
    render(<PendingApprovalPage />)
    
    // Check for the presence of the clock icon by looking for the SVG
    const clockIcon = document.querySelector('.lucide-clock')
    expect(clockIcon).toBeInTheDocument()
  })

  it('handles sign out action', async () => {
    mockSignOut.mockResolvedValue(undefined)
    
    render(<PendingApprovalPage />)
    
    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)
    
    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it('shows loading state during sign out', async () => {
    // Mock a delayed sign out
    mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<PendingApprovalPage />)
    
    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)
    
    // Should show loading state
    expect(screen.getByText('Signing out...')).toBeInTheDocument()
    expect(signOutButton).toBeDisabled()
    
    // Wait for sign out to complete
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce()
    })
  })

  it('handles sign out error gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSignOut.mockRejectedValue(new Error('Sign out failed'))
    
    render(<PendingApprovalPage />)
    
    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Sign out error:', expect.any(Error))
    })
    
    // Button should be re-enabled after error
    await waitFor(() => {
      expect(signOutButton).not.toBeDisabled()
    })
    
    consoleError.mockRestore()
  })

  it('has proper accessibility structure', () => {
    render(<PendingApprovalPage />)
    
    // Check for proper heading hierarchy
    const mainHeading = screen.getByRole('heading', { level: 1 })
    const secondaryHeading = screen.getByRole('heading', { level: 2 })
    
    expect(mainHeading).toHaveTextContent('Talent Tracker')
    expect(secondaryHeading).toHaveTextContent('Account Pending')
  })

  it('displays copyright information', () => {
    render(<PendingApprovalPage />)
    
    expect(screen.getByText('© 2024 Talent Tracker. All rights reserved.')).toBeInTheDocument()
  })

  it('has proper button styling and accessibility', () => {
    render(<PendingApprovalPage />)
    
    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    
    expect(signOutButton).toHaveClass('w-full')
    expect(signOutButton).not.toBeDisabled()
  })

  it('shows proper responsive design classes', () => {
    const { container } = render(<PendingApprovalPage />)
    
    // Check for responsive classes on main container
    const mainContainer = container.querySelector('.min-h-screen')
    expect(mainContainer).toHaveClass('bg-gradient-to-br')
  })
})