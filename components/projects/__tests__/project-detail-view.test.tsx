import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ProjectDetailView } from '../project-detail-view'

// Mock the auth context
const mockAuth = {
  user: { id: '1', email: 'admin@example.com' },
  userProfile: { id: '1', role: 'admin', status: 'active', full_name: 'Admin User' },
  isAuthenticated: true,
  loading: false
}

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockAuth
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock fetch
global.fetch = vi.fn()

const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  description: 'A test project',
  production_company: 'Test Productions',
  hiring_contact: 'John Doe',
  project_location: 'Los Angeles',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  status: 'prep',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  project_setup_checklist: {
    project_id: 'proj-1',
    roles_and_pay_completed: false,
    talent_roster_completed: true,
    team_assignments_completed: false,
    locations_completed: true,
    completed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
}

describe('ProjectDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful project fetch
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockProject })
    })
  })

  it('renders project details correctly', async () => {
    render(<ProjectDetailView projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    expect(screen.getByText('A test project')).toBeInTheDocument()
    expect(screen.getByText('Test Productions')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles')).toBeInTheDocument()
  })

  it('displays setup checklist for prep projects', async () => {
    render(<ProjectDetailView projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('Project Setup Checklist')).toBeInTheDocument()
    })

    expect(screen.getByText('Add Project Roles & Pay Rates')).toBeInTheDocument()
    expect(screen.getByText('Finalize Talent Roster')).toBeInTheDocument()
    expect(screen.getByText('Finalize Team Assignments')).toBeInTheDocument()
    expect(screen.getByText('Define Talent Locations')).toBeInTheDocument()
  })

  it('shows correct progress percentage', async () => {
    render(<ProjectDetailView projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('50% Complete')).toBeInTheDocument()
    })
  })

  it('disables activate button when setup is incomplete', async () => {
    render(<ProjectDetailView projectId="proj-1" />)

    await waitFor(() => {
      const activateButton = screen.getByRole('button', { name: /activate project/i })
      expect(activateButton).toBeDisabled()
    })
  })

  it('enables activate button when setup is complete', async () => {
    const completeProject = {
      ...mockProject,
      project_setup_checklist: {
        ...mockProject.project_setup_checklist,
        roles_and_pay_completed: true,
        talent_roster_completed: true,
        team_assignments_completed: true,
        locations_completed: true
      }
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: completeProject })
    })

    render(<ProjectDetailView projectId="proj-1" />)

    await waitFor(() => {
      const activateButton = screen.getByRole('button', { name: /activate project/i })
      expect(activateButton).not.toBeDisabled()
    })
  })

  it('updates checklist when checkbox is clicked', async () => {
    render(<ProjectDetailView projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('Project Setup Checklist')).toBeInTheDocument()
    })

    const rolesCheckbox = screen.getByLabelText('Add Project Roles & Pay Rates')
    
    // Mock the checklist update API call
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { ...mockProject.project_setup_checklist, roles_and_pay_completed: true } })
    })

    // Mock the project refetch
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        data: {
          ...mockProject,
          project_setup_checklist: {
            ...mockProject.project_setup_checklist,
            roles_and_pay_completed: true
          }
        }
      })
    })

    fireEvent.click(rolesCheckbox)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/proj-1/checklist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...mockProject.project_setup_checklist,
          roles_and_pay_completed: true
        })
      })
    })
  })

  it('shows permission message for non-admin users', async () => {
    // Mock non-admin user
    mockAuth.userProfile = { id: '1', role: 'supervisor', status: 'active', full_name: 'Supervisor User' }

    render(<ProjectDetailView projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText(/only administrators and in-house users can modify/i)).toBeInTheDocument()
    })

    // Checkboxes should be disabled
    const rolesCheckbox = screen.getByLabelText('Add Project Roles & Pay Rates')
    expect(rolesCheckbox).toBeDisabled()
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

    render(<ProjectDetailView projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })
})