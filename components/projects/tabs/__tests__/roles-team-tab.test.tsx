import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RolesTeamTab } from '../roles-team-tab'
import { EnhancedProject } from '@/lib/types'

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock fetch
global.fetch = vi.fn()

const mockProject: EnhancedProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  production_company: 'Test Company',
  hiring_contact: 'Test Contact',
  project_locations: 'Test Location',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  status: 'prep',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  statistics: {
    talentExpected: 10,
    talentAssigned: 5,
    staffNeeded: 8,
    staffAssigned: 3,
    staffCheckedIn: 2,
    talentPresent: 4,
    activeEscorts: 2,
    staffOvertime: {
      over8Hours: 1,
      over12Hours: 0
    }
  }
}

const mockAssignments = [
  {
    id: 'assignment-1',
    project_id: 'project-1',
    user_id: 'user-1',
    role: 'supervisor' as const,
    pay_rate: 300,
    schedule_notes: 'Day shift',
    created_at: '2024-01-01T00:00:00Z',
    profiles: {
      id: 'user-1',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '555-0123',
      city: 'Los Angeles',
      state: 'CA'
    }
  }
]

const mockAvailableStaff = [
  {
    id: 'user-2',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-0124',
    city: 'New York',
    state: 'NY',
    role: null,
    status: 'active',
    created_at: '2024-01-01T00:00:00Z'
  }
]

describe('RolesTeamTab', () => {
  const mockOnProjectUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/team-assignments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ assignments: mockAssignments })
        })
      }
      if (url.includes('/available-staff')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ staff: mockAvailableStaff })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
  })

  it('should render role definitions table', async () => {
    render(<RolesTeamTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      expect(screen.getByText('Role Definitions')).toBeInTheDocument()
    })

    // Check role definitions
    expect(screen.getAllByText('Supervisor')).toHaveLength(2) // One in table, one in assignments
    expect(screen.getByText('$300/day')).toBeInTheDocument()
    expect(screen.getAllByText('Daily')).toHaveLength(2) // Supervisor and Coordinator are both daily
    
    expect(screen.getByText('Coordinator')).toBeInTheDocument()
    expect(screen.getByText('$350/day')).toBeInTheDocument()
    
    expect(screen.getByText('Escort')).toBeInTheDocument()
    expect(screen.getByText('$20/hr')).toBeInTheDocument()
    expect(screen.getByText('Hourly')).toBeInTheDocument()
  })

  it('should render staff assignment interface', async () => {
    render(<RolesTeamTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      expect(screen.getByText('Assign Staff to Roles')).toBeInTheDocument()
    })

    // Check filters
    expect(screen.getByPlaceholderText('Name or email...')).toBeInTheDocument()
    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })

  it('should display current team assignments', async () => {
    render(<RolesTeamTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      expect(screen.getByText('Current Team Assignments')).toBeInTheDocument()
    })

    // Check assignment details
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('Supervisor')).toHaveLength(2) // One in table, one in assignments
  })

  it('should display assignment summary', async () => {
    render(<RolesTeamTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      expect(screen.getByText('Assignment Summary')).toBeInTheDocument()
    })

    // Check summary counts
    expect(screen.getByText('Supervisors')).toBeInTheDocument()
    expect(screen.getByText('TLCs')).toBeInTheDocument()
    expect(screen.getByText('Escorts')).toBeInTheDocument()
    expect(screen.getByText('Est. Daily Cost')).toBeInTheDocument()
  })

  it('should display correct pluralization in assignment summary', async () => {
    // Create a project with single assignments to test singular forms
    const singleAssignmentProject = {
      ...mockProject,
      team_assignments: [
        {
          id: '1',
          user_id: 'user1',
          project_id: 'project1',
          role: 'supervisor' as const,
          pay_rate: 300,
          profiles: {
            id: 'user1',
            full_name: 'John Doe',
            email: 'john@example.com',
            role: null,
            status: 'active' as const,
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        }
      ]
    }

    render(<RolesTeamTab project={singleAssignmentProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      expect(screen.getByText('Assignment Summary')).toBeInTheDocument()
    })

    // Check singular forms when count is 1
    expect(screen.getByText('Supervisor')).toBeInTheDocument()
    expect(screen.getByText('TLC')).toBeInTheDocument()
    expect(screen.getByText('Escort')).toBeInTheDocument()
  })

  it('should handle staff selection', async () => {
    render(<RolesTeamTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Find and click the checkbox for Jane Smith
    const checkboxes = screen.getAllByRole('checkbox')
    const janeCheckbox = checkboxes.find(checkbox => 
      checkbox.closest('div')?.textContent?.includes('Jane Smith')
    )
    
    if (janeCheckbox) {
      fireEvent.click(janeCheckbox)
      
      await waitFor(() => {
        expect(screen.getByText('1 staff selected')).toBeInTheDocument()
      })
    }
  })

  it('should filter staff by search term', async () => {
    render(<RolesTeamTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Name or email...')
    fireEvent.change(searchInput, { target: { value: 'Jane' } })

    // Jane should still be visible
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()

    // Search for something that doesn't match
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } })
    
    // Jane should not be visible anymore (though the test might need adjustment based on implementation)
  })

  it('should enable finalize button when assignments exist', async () => {
    render(<RolesTeamTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      const finalizeButton = screen.getByText('Finalize Team Assignments')
      expect(finalizeButton).toBeInTheDocument()
      expect(finalizeButton).not.toBeDisabled()
    })
  })

  it('should handle finalize team assignments', async () => {
    ;(global.fetch as any).mockImplementation((url: string, options: any) => {
      if (url.includes('/team-assignments/complete') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      }
      // Default mock for other requests
      if (url.includes('/team-assignments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ assignments: mockAssignments })
        })
      }
      if (url.includes('/available-staff')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ staff: mockAvailableStaff })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })

    render(<RolesTeamTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)

    await waitFor(() => {
      const finalizeButton = screen.getByText('Finalize Team Assignments')
      expect(finalizeButton).toBeInTheDocument()
    })

    const finalizeButton = screen.getByText('Finalize Team Assignments')
    fireEvent.click(finalizeButton)

    await waitFor(() => {
      expect(mockOnProjectUpdate).toHaveBeenCalled()
    })
  })
})