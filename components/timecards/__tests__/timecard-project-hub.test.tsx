import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TimecardProjectHub } from '../timecard-project-hub'
import { useAuth } from '@/lib/auth-context'

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn()
}))

// Mock the TimecardProjectCard component
vi.mock('../timecard-project-card', () => ({
  TimecardProjectCard: ({ project, onSelectProject }: any) => (
    <div data-testid={`project-card-${project.id}`}>
      <h3>{project.name}</h3>
      <button onClick={() => onSelectProject(project.id)}>
        View Timecards
      </button>
    </div>
  )
}))

// Mock fetch
global.fetch = vi.fn()

const mockProjectStats = [
  {
    projectId: '1',
    projectName: 'Test Project 1',
    projectDescription: 'Test description 1',
    productionCompany: 'Test Company 1',
    totalTimecards: 5,
    statusBreakdown: {
      draft: 2,
      submitted: 2,
      approved: 1,
      rejected: 0
    },
    totalHours: 40,
    totalApprovedPay: 1000,
    lastActivity: '2024-01-15T10:00:00Z',
    pendingApprovals: 2,
    overdueSubmissions: 0
  },
  {
    projectId: '2',
    projectName: 'Test Project 2',
    projectDescription: 'Test description 2',
    productionCompany: 'Test Company 2',
    totalTimecards: 3,
    statusBreakdown: {
      draft: 1,
      submitted: 0,
      approved: 1,
      rejected: 1
    },
    totalHours: 24,
    totalApprovedPay: 600,
    lastActivity: '2024-01-10T10:00:00Z',
    pendingApprovals: 0,
    overdueSubmissions: 0
  }
]

describe('TimecardProjectHub', () => {
  const defaultProps = {
    userRole: 'admin' as const,
    onSelectProject: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'test@example.com' }
    })
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockProjectStats,
        count: mockProjectStats.length,
        userRole: 'admin'
      })
    })
  })

  it('renders loading state initially', () => {
    render(<TimecardProjectHub {...defaultProps} />)
    
    expect(screen.getByText('Loading timecard projects...')).toBeInTheDocument()
  })

  it('renders projects after loading', async () => {
    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })
  })

  it('displays project cards when data is loaded', async () => {
    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })
  })

  it('filters projects by search term', async () => {
    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search projects by name, description, or production company...')
    fireEvent.change(searchInput, { target: { value: 'Project 1' } })

    expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    expect(screen.queryByText('Test Project 2')).not.toBeInTheDocument()
  })

  it('filters projects by status', async () => {
    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })

    // Click on "Rejected" filter
    const rejectedFilter = screen.getByText('Rejected (1)')
    fireEvent.click(rejectedFilter)

    // Only Project 2 has rejected timecards
    expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument()
    expect(screen.getByText('Test Project 2')).toBeInTheDocument()
  })

  it('shows filter counts correctly', async () => {
    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('All (2)')).toBeInTheDocument()
      expect(screen.getByText('Draft (2)')).toBeInTheDocument() // Both projects have drafts
      expect(screen.getByText('Submitted (1)')).toBeInTheDocument() // Only Project 1 has submitted
      expect(screen.getByText('Rejected (1)')).toBeInTheDocument() // Only Project 2 has rejected
    })
  })

  it('handles empty state when no projects', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        count: 0,
        userRole: 'admin'
      })
    })

    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('No timecard projects found')).toBeInTheDocument()
      expect(screen.getByText('There are no projects with timecards to review. Projects will appear here once team members start submitting timecards.')).toBeInTheDocument()
    })
  })

  it('displays no results state when search returns no matches', async () => {
    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search projects by name, description, or production company...')
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Project' } })

    expect(screen.getByText('No projects found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search terms or filters to find what you\'re looking for.')).toBeInTheDocument()
  })

  it('clears filters when Clear Filters button is clicked', async () => {
    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Apply search filter
    const searchInput = screen.getByPlaceholderText('Search projects by name, description, or production company...')
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } })

    // Should show no results
    expect(screen.getByText('No projects found')).toBeInTheDocument()

    // Click Clear Filters
    const clearButton = screen.getByText('Clear Filters')
    fireEvent.click(clearButton)

    // Should show all projects again
    expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    expect(screen.getByText('Test Project 2')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as any).mockRejectedValue(new Error('Network error'))

    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('calls onSelectProject when project is selected', async () => {
    const onSelectProject = vi.fn()
    render(<TimecardProjectHub {...defaultProps} onSelectProject={onSelectProject} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    const viewButton = screen.getAllByText('View Timecards')[0]
    fireEvent.click(viewButton)

    expect(onSelectProject).toHaveBeenCalledWith('1')
  })



  it('shows unauthenticated state when user is not logged in', () => {
    ;(useAuth as any).mockReturnValue({
      isAuthenticated: false,
      user: null
    })

    render(<TimecardProjectHub {...defaultProps} />)
    
    expect(screen.getByText('Please sign in to view timecard projects.')).toBeInTheDocument()
  })

  it('filters projects by recent activity', async () => {
    // Mock current date to be 2024-01-20
    const mockDate = new Date('2024-01-20T10:00:00Z')
    vi.setSystemTime(mockDate)

    render(<TimecardProjectHub {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })

    // Click on "Recent" filter (last 30 days)
    const recentFilter = screen.getByText('Recent (2)')
    fireEvent.click(recentFilter)

    // Both projects should still be visible as they're within 30 days
    expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    expect(screen.getByText('Test Project 2')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('shows different empty state message for non-admin users', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        count: 0,
        userRole: 'talent_escort'
      })
    })

    render(<TimecardProjectHub {...defaultProps} userRole="talent_escort" />)
    
    await waitFor(() => {
      expect(screen.getByText('No timecard projects found')).toBeInTheDocument()
      expect(screen.getByText('You don\'t have any timecards yet. Projects will appear here once you start creating timecards for your assigned projects.')).toBeInTheDocument()
    })
  })
})