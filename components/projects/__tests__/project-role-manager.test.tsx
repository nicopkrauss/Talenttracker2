import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ProjectRoleManager } from '../project-role-manager'
import { useAuth } from '@/lib/auth-context'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}))

// Mock the role utils
vi.mock('@/lib/role-utils', () => ({
  hasAdminAccess: vi.fn()
}))

const mockUseAuth = useAuth as any
const mockHasAdminAccess = vi.fn()

// Mock fetch
global.fetch = vi.fn()

// Mock UI components
vi.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}))

const mockRoles = [
  {
    id: '1',
    project_id: 'project-1',
    role: 'supervisor',
    base_pay: 25.00,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    project_id: 'project-1',
    role: 'talent_escort',
    base_pay: 20.00,
    created_at: '2024-01-01T00:00:00Z'
  }
]

describe('ProjectRoleManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn()
    })
    mockHasAdminAccess.mockReturnValue(true)
  })

  it('renders loading state initially', () => {
    ;(global.fetch as any).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    )

    render(<ProjectRoleManager projectId="project-1" />)
    
    expect(screen.getByText('Loading roles...')).toBeInTheDocument()
  })

  it('renders role configuration form for admin users', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRoles })
    })

    render(<ProjectRoleManager projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('Project Roles & Pay Rates')).toBeInTheDocument()
    })

    expect(screen.getByText('Supervisor')).toBeInTheDocument()
    expect(screen.getByText('Talent Logistics Coordinator (TLC)')).toBeInTheDocument()
    expect(screen.getByText('Talent Escort')).toBeInTheDocument()
    expect(screen.getByText('Configured')).toBeInTheDocument()
  })

  it('displays current pay rates for existing roles', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockRoles })
    })

    render(<ProjectRoleManager projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('25')).toBeInTheDocument()
      expect(screen.getByDisplayValue('20')).toBeInTheDocument()
    })

    expect(screen.getByText('$25.00')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()
  })

  it('allows updating pay rates', async () => {
    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockRoles })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], message: 'Updated successfully' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Marked as complete' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockRoles })
      })

    render(<ProjectRoleManager projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('25')).toBeInTheDocument()
    })

    // Update supervisor pay rate
    const supervisorInput = screen.getByDisplayValue('25')
    fireEvent.change(supervisorInput, { target: { value: '30' } })

    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument()

    // Save changes
    const saveButton = screen.getByText('Save Roles & Pay Rates')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/project-1/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: [
            { role_name: 'supervisor', base_pay_rate: 30 },
            { role_name: 'talent_escort', base_pay_rate: 20 }
          ]
        })
      })
    })

    // Should also call the complete endpoint
    expect(global.fetch).toHaveBeenCalledWith('/api/projects/project-1/roles/complete', {
      method: 'POST'
    })
  })

  it('validates pay rate inputs', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    })

    render(<ProjectRoleManager projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('Project Roles & Pay Rates')).toBeInTheDocument()
    })

    // Enter invalid pay rate
    const supervisorInput = screen.getByLabelText('Base Pay Rate', { selector: 'input[id="pay-rate-supervisor"]' })
    fireEvent.change(supervisorInput, { target: { value: '-10' } })

    expect(screen.getByText('Pay rate must be a positive number')).toBeInTheDocument()

    // Enter pay rate that's too high
    fireEvent.change(supervisorInput, { target: { value: '10000' } })

    expect(screen.getByText('Pay rate cannot exceed $9,999.99')).toBeInTheDocument()
  })

  it('shows access denied message for non-admin users', async () => {
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

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    })

    render(<ProjectRoleManager projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('Only administrators and in-house users can manage project roles and pay rates.')).toBeInTheDocument()
    })

    // Save button should be disabled
    const saveButton = screen.getByText('Save Roles & Pay Rates')
    expect(saveButton).toBeDisabled()
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<ProjectRoleManager projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('prevents saving without configured roles', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    })

    render(<ProjectRoleManager projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('Project Roles & Pay Rates')).toBeInTheDocument()
    })

    const saveButton = screen.getByText('Save Roles & Pay Rates')
    expect(saveButton).toBeDisabled()
  })

  it('calls onRolesUpdated callback when roles are saved', async () => {
    const mockOnRolesUpdated = jest.fn()

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], message: 'Updated successfully' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Marked as complete' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })

    render(<ProjectRoleManager projectId="project-1" onRolesUpdated={mockOnRolesUpdated} />)

    await waitFor(() => {
      expect(screen.getByText('Project Roles & Pay Rates')).toBeInTheDocument()
    })

    // Add a pay rate
    const supervisorInput = screen.getByLabelText('Base Pay Rate', { selector: 'input[id="pay-rate-supervisor"]' })
    fireEvent.change(supervisorInput, { target: { value: '25' } })

    // Save changes
    const saveButton = screen.getByText('Save Roles & Pay Rates')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockOnRolesUpdated).toHaveBeenCalled()
    })
  })
})