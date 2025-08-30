import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectHub } from '../project-hub'
import { Project } from '@/lib/types'

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { id: 'user-123' },
    userProfile: { role: 'admin' },
    loading: false
  }))
}))

// Mock fetch
global.fetch = vi.fn()

const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    description: 'First test project',
    production_company: 'Test Studios',
    hiring_contact: 'John Doe',
    project_location: 'Los Angeles, CA',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: 'prep',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1'
  },
  {
    id: 'project-2',
    name: 'Test Project 2',
    description: 'Second test project',
    production_company: 'Another Studio',
    hiring_contact: 'Jane Smith',
    project_location: 'New York, NY',
    start_date: '2024-02-01',
    end_date: '2024-11-30',
    status: 'active',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    created_by: 'user-2'
  },
  {
    id: 'project-3',
    name: 'Test Project 3',
    description: 'Third test project',
    production_company: 'Old Studio',
    hiring_contact: 'Bob Johnson',
    project_location: 'Chicago, IL',
    start_date: '2023-01-01',
    end_date: '2023-12-31',
    status: 'archived',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    created_by: 'user-3'
  }
]

const mockFetchResponse = {
  data: mockProjects,
  user_role: 'admin',
  total_count: 3
}

describe('ProjectHub', () => {
  const defaultProps = {
    userRole: 'admin' as const
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockFetchResponse
    })
  })

  it('renders loading state initially', () => {
    render(<ProjectHub {...defaultProps} />)
    
    expect(screen.getByText('Loading projects...')).toBeInTheDocument()
  })

  it('renders projects after loading', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
      expect(screen.getByText('Test Project 3')).toBeInTheDocument()
    })
  })

  it('displays projects title', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument()
    })
  })

  it('shows create project button for admin users', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Create Project')).toBeInTheDocument()
    })
  })

  it('does not show create project button for non-admin users', async () => {
    render(<ProjectHub {...defaultProps} userRole="talent_escort" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Create Project')).not.toBeInTheDocument()
    })
  })

  it('filters projects by search term', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Search projects/)
    fireEvent.change(searchInput, { target: { value: 'Project 1' } })

    expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    expect(screen.queryByText('Test Project 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Test Project 3')).not.toBeInTheDocument()
  })

  it('filters projects by status', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    const activeButton = screen.getByText('Active (1)')
    fireEvent.click(activeButton)

    expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument()
    expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    expect(screen.queryByText('Test Project 3')).not.toBeInTheDocument()
  })

  it('shows status filter counts correctly', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('All (3)')).toBeInTheDocument()
      expect(screen.getByText('Prep (1)')).toBeInTheDocument()
      expect(screen.getByText('Active (1)')).toBeInTheDocument()
      expect(screen.getByText('Archived (1)')).toBeInTheDocument()
    })
  })

  it('displays empty state when no projects exist', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], user_role: 'admin', total_count: 0 })
    })

    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
      expect(screen.getByText('Create Your First Project')).toBeInTheDocument()
    })
  })

  it('displays no results state when search returns no matches', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Search projects/)
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Project' } })

    expect(screen.getByText('No projects found')).toBeInTheDocument()
    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })

  it('clears filters when Clear Filters button is clicked', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Apply search filter that returns no results
    const searchInput = screen.getByPlaceholderText(/Search projects/)
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } })

    // Should show no results
    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument()
    })

    // Clear filters
    const clearButton = screen.getByText('Clear Filters')
    fireEvent.click(clearButton)

    // Should show all projects again
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
      expect(screen.getByText('Test Project 3')).toBeInTheDocument()
    })
  })

  it('displays error state when fetch fails', async () => {
    ;(fetch as any).mockRejectedValue(new Error('Network error'))

    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('calls onCreateProject when create button is clicked', async () => {
    const onCreateProject = vi.fn()
    render(<ProjectHub {...defaultProps} onCreateProject={onCreateProject} />)
    
    await waitFor(() => {
      expect(screen.getByText('Create Project')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Create Project'))
    expect(onCreateProject).toHaveBeenCalled()
  })

  it('refreshes projects when refresh button is clicked', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    expect(fetch).toHaveBeenCalledTimes(2) // Initial load + refresh
  })

  it('does not show project summary section', async () => {
    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Project Summary')).not.toBeInTheDocument()
      expect(screen.queryByText('Projects in Prep')).not.toBeInTheDocument()
    })
    
    // Verify the filter buttons still show counts
    expect(screen.getByText('All (3)')).toBeInTheDocument()
    expect(screen.getByText('Prep (1)')).toBeInTheDocument()
    expect(screen.getByText('Active (1)')).toBeInTheDocument()
    expect(screen.getByText('Archived (1)')).toBeInTheDocument()
  })

  it('does not show project summary for non-admin users', async () => {
    render(<ProjectHub {...defaultProps} userRole="talent_escort" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Project Summary')).not.toBeInTheDocument()
    })
  })

  it('handles API error responses correctly', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Unauthorized access' })
    })

    render(<ProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Unauthorized access')).toBeInTheDocument()
    })
  })
})