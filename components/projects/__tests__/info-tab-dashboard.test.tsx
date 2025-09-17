import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InfoTabDashboard } from '../info-tab-dashboard'

// Mock router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}))

// Mock fetch
global.fetch = vi.fn()

describe('InfoTabDashboard', () => {
  const mockProject = {
    id: 'test-project-123',
    name: 'Test Project',
    description: 'Test project description',
    status: 'prep' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-123'
  }

  const mockReadinessData = {
    project_id: 'test-project-123',
    overall_status: 'getting-started' as const,
    total_staff_assigned: 0,
    total_talent: 0,
    escort_count: 0,
    locations_status: 'default-only' as const,
    roles_status: 'default-only' as const,
    team_status: 'none' as const,
    talent_status: 'none' as const,
    assignments_status: 'none' as const,
    urgent_assignment_issues: 0,
    has_default_locations: true,
    custom_location_count: 0,
    locations_finalized: false,
    has_default_roles: true,
    custom_role_count: 0,
    roles_finalized: false,
    supervisor_count: 0,
    coordinator_count: 0,
    team_finalized: false,
    talent_finalized: false,
    last_updated: '2024-01-01T00:00:00Z',
    todoItems: [
      {
        id: 'assign-team',
        area: 'team' as const,
        priority: 'critical' as const,
        title: 'Assign team members',
        description: 'No staff assigned to this project',
        actionText: 'Go to Roles & Team',
        actionRoute: '/roles-team'
      },
      {
        id: 'configure-roles',
        area: 'roles' as const,
        priority: 'important' as const,
        title: 'Configure custom roles',
        description: 'Using default roles only',
        actionText: 'Go to Roles & Team',
        actionRoute: '/roles-team'
      },
      {
        id: 'finalize-locations',
        area: 'locations' as const,
        priority: 'optional' as const,
        title: 'Finalize location setup',
        description: 'Mark locations as complete when ready',
        actionText: 'Go to Info Tab',
        actionRoute: '/info'
      }
    ],
    assignmentProgress: {
      totalAssignments: 10,
      completedAssignments: 3,
      urgentIssues: 2,
      upcomingDeadlines: [],
      assignmentRate: 30,
      totalEntities: 5,
      projectDays: 2
    },
    featureAvailability: {
      timeTracking: { available: false, requirement: 'At least one staff member assigned' },
      assignments: { available: false, requirement: 'Both talent and escorts assigned' },
      locationTracking: { available: false, requirement: 'Custom locations and assignments configured' },
      supervisorCheckout: { available: false, requirement: 'Supervisor and escorts assigned' },
      talentManagement: { available: false, requirement: 'At least one talent assigned' },
      projectOperations: { available: false, requirement: 'Project must be operational' },
      notifications: { available: false, requirement: 'Staff or talent assigned to receive notifications' }
    }
  }

  const mockOnProjectUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful fetch response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockReadinessData })
    })
  })

  it('should render project status correctly', async () => {
    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument()
      expect(screen.getByText('Basic setup in progress')).toBeInTheDocument()
    })
  })

  it('should render operational status correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        data: {
          ...mockReadinessData,
          overall_status: 'operational'
        }
      })
    })

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Operational')).toBeInTheDocument()
      expect(screen.getByText('Ready for limited operations')).toBeInTheDocument()
    })
  })

  it('should render production-ready status correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        data: {
          ...mockReadinessData,
          overall_status: 'production-ready'
        }
      })
    })

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Production Ready')).toBeInTheDocument()
      expect(screen.getByText('Fully configured and ready')).toBeInTheDocument()
    })
  })

  it('should categorize and display todo items correctly', async () => {
    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      // Critical items
      expect(screen.getByText('Critical (1)')).toBeInTheDocument()
      expect(screen.getByText('Assign team members')).toBeInTheDocument()
      expect(screen.getByText('No staff assigned to this project')).toBeInTheDocument()
      
      // Important items
      expect(screen.getByText('Important (1)')).toBeInTheDocument()
      expect(screen.getByText('Configure custom roles')).toBeInTheDocument()
      expect(screen.getByText('Using default roles only')).toBeInTheDocument()
      
      // Optional items
      expect(screen.getByText('Optional (1)')).toBeInTheDocument()
      expect(screen.getByText('Finalize location setup')).toBeInTheDocument()
      expect(screen.getByText('Mark locations as complete when ready')).toBeInTheDocument()
    })
  })

  it('should handle navigation when action buttons are clicked', async () => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost/projects/test-project-123',
        pathname: '/projects/test-project-123',
        search: ''
      },
      writable: true
    })

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Go to Roles & Team')).toBeInTheDocument()
    })

    const actionButton = screen.getByText('Go to Roles & Team')
    fireEvent.click(actionButton)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled()
    })
  })

  it('should display assignment progress summary', async () => {
    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('30%')).toBeInTheDocument()
      expect(screen.getByText('Assignments Complete')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Urgent Issues')).toBeInTheDocument()
    })
  })

  it('should show completed setup section when items are finalized', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        data: {
          ...mockReadinessData,
          locations_finalized: true,
          roles_finalized: true,
          custom_location_count: 3,
          custom_role_count: 2,
          todoItems: [] // No pending todos
        }
      })
    })

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Completed Setup')).toBeInTheDocument()
      expect(screen.getByText('Location setup finalized')).toBeInTheDocument()
      expect(screen.getByText('Role templates finalized')).toBeInTheDocument()
    })
  })

  it('should be collapsible', async () => {
    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('To-Do List')).toBeInTheDocument()
    })

    // Find the collapsible trigger for To-Do List
    const todoHeader = screen.getByText('To-Do List').closest('button')
    expect(todoHeader).toBeInTheDocument()
    
    fireEvent.click(todoHeader!)
    
    await waitFor(() => {
      expect(screen.queryByText('Critical (1)')).not.toBeInTheDocument()
    })
  })

  it('should show loading state', () => {
    // Mock a slow fetch to show loading state
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    expect(screen.getByText('Project Dashboard')).toBeInTheDocument()
    // Loading state shows animated skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should show error state', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load project readiness data')).toBeInTheDocument()
    })
  })

  it('should handle empty todo items', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        data: {
          ...mockReadinessData,
          todoItems: []
        }
      })
    })

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('All setup tasks completed!')).toBeInTheDocument()
    })
  })

  it('should display priority icons correctly', async () => {
    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      // Check for priority sections
      expect(screen.getByText('Critical (1)')).toBeInTheDocument()
      expect(screen.getByText('Important (1)')).toBeInTheDocument()
      expect(screen.getByText('Optional (1)')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' })
    })

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Warning",
        description: "Using basic project status. Some features may be limited.",
        variant: "default",
      })
    })
  })

  it('should display assignment progress data', async () => {
    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('30%')).toBeInTheDocument()
      expect(screen.getByText('Assignments Complete')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Urgent Issues')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('Staff Assigned')).toBeInTheDocument()
    })
  })

  it('should handle assignment progress with high urgent issues', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        data: {
          ...mockReadinessData,
          assignmentProgress: {
            ...mockReadinessData.assignmentProgress,
            urgentIssues: 5
          }
        }
      })
    })

    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Urgent Issues')).toBeInTheDocument()
    })
  })

  it('should handle collapsible sections', async () => {
    render(<InfoTabDashboard project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Project Status')).toBeInTheDocument()
      expect(screen.getByText('To-Do List')).toBeInTheDocument()
    })

    // Test collapsing project status
    const statusHeader = screen.getByText('Project Status').closest('button')
    fireEvent.click(statusHeader!)
    
    await waitFor(() => {
      expect(screen.queryByText('Basic setup in progress')).not.toBeInTheDocument()
    })
  })
})