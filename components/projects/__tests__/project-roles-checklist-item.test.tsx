import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProjectRolesChecklistItem } from '../project-roles-checklist-item'
import { useAuth } from '@/lib/auth-context'

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn()
}))

// Mock the role utils
jest.mock('@/lib/role-utils', () => ({
  hasAdminAccess: jest.fn()
}))

// Mock the ProjectRoleManager component
jest.mock('../project-role-manager', () => ({
  ProjectRoleManager: ({ onRolesUpdated }: { onRolesUpdated: () => void }) => (
    <div data-testid="project-role-manager">
      <button onClick={onRolesUpdated}>Update Roles</button>
    </div>
  )
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockHasAdminAccess = require('@/lib/role-utils').hasAdminAccess as jest.MockedFunction<any>

// Mock fetch
global.fetch = jest.fn()

describe('ProjectRolesChecklistItem', () => {
  const mockOnCompletionChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'admin@test.com' },
      userProfile: { 
        id: 'user-1', 
        role: 'admin',
        full_name: 'Admin User',
        email: 'admin@test.com',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn()
    })
    mockHasAdminAccess.mockReturnValue(true)
  })

  it('renders checklist item with correct labels', () => {
    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={false}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    expect(screen.getByText('Add Project Roles & Pay Rates')).toBeInTheDocument()
    expect(screen.getByText('Configure team roles and set base pay rates for the project')).toBeInTheDocument()
    expect(screen.getByText('Configure')).toBeInTheDocument()
  })

  it('shows completed state when isCompleted is true', () => {
    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={true}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
    expect(screen.getByTestId('CheckCircle2')).toBeInTheDocument()
  })

  it('allows toggling completion status for admin users', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Marked as complete' })
    })

    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={false}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/project-1/roles/complete', {
        method: 'POST'
      })
    })

    expect(mockOnCompletionChange).toHaveBeenCalledWith(true)
  })

  it('allows unchecking completion status', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Marked as incomplete' })
    })

    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={true}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/project-1/roles/complete', {
        method: 'DELETE'
      })
    })

    expect(mockOnCompletionChange).toHaveBeenCalledWith(false)
  })

  it('shows and hides role manager when configure button is clicked', () => {
    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={false}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    // Initially hidden
    expect(screen.queryByTestId('project-role-manager')).not.toBeInTheDocument()

    // Click configure button
    fireEvent.click(screen.getByText('Configure'))

    // Should show role manager
    expect(screen.getByTestId('project-role-manager')).toBeInTheDocument()
    expect(screen.getByText('Hide')).toBeInTheDocument()

    // Click hide button
    fireEvent.click(screen.getByText('Hide'))

    // Should hide role manager
    expect(screen.queryByTestId('project-role-manager')).not.toBeInTheDocument()
    expect(screen.getByText('Configure')).toBeInTheDocument()
  })

  it('hides role manager when roles are updated', () => {
    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={false}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    // Show role manager
    fireEvent.click(screen.getByText('Configure'))
    expect(screen.getByTestId('project-role-manager')).toBeInTheDocument()

    // Simulate roles update
    fireEvent.click(screen.getByText('Update Roles'))

    // Should hide role manager
    expect(screen.queryByTestId('project-role-manager')).not.toBeInTheDocument()
  })

  it('disables controls when disabled prop is true', () => {
    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={false}
        onCompletionChange={mockOnCompletionChange}
        disabled={true}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()

    const configureButton = screen.getByText('Configure')
    expect(configureButton).toBeDisabled()
  })

  it('shows access denied message for non-admin users', () => {
    mockHasAdminAccess.mockReturnValue(false)
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', email: 'user@test.com' },
      userProfile: { 
        id: 'user-2', 
        role: null,
        full_name: 'Regular User',
        email: 'user@test.com',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn()
    })

    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={false}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    expect(screen.getByText('Only administrators and in-house users can configure project roles and pay rates.')).toBeInTheDocument()
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()

    expect(screen.queryByText('Configure')).not.toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={false}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    expect(mockOnCompletionChange).not.toHaveBeenCalled()
  })

  it('shows loading state while updating completion status', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    )

    render(
      <ProjectRolesChecklistItem
        projectId="project-1"
        isCompleted={false}
        onCompletionChange={mockOnCompletionChange}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(screen.getByTestId('Loader2')).toBeInTheDocument()
    expect(checkbox).toBeDisabled()
  })
})