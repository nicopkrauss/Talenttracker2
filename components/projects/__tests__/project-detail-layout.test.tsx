import React from 'react'
import { render, screen } from '@testing-library/react'
import { ProjectDetailLayout } from '../project-detail-layout'
import { useAuth } from '@/lib/auth-context'

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn()
}))

// Mock the child components
jest.mock('../project-header', () => ({
  ProjectHeader: ({ project }: any) => <div data-testid="project-header">{project.name}</div>
}))

jest.mock('../project-overview-card', () => ({
  ProjectOverviewCard: ({ project }: any) => <div data-testid="project-overview-card">{project.name}</div>
}))

jest.mock('../project-tabs', () => ({
  ProjectTabs: ({ project }: any) => <div data-testid="project-tabs">Prep Mode</div>
}))

jest.mock('../operations-dashboard', () => ({
  OperationsDashboard: ({ project }: any) => <div data-testid="operations-dashboard">Active Mode</div>
}))

// Mock fetch
global.fetch = jest.fn()

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('ProjectDetailLayout', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      userProfile: {
        id: 'test-user',
        role: 'admin',
        status: 'active',
        full_name: 'Test User',
        email: 'test@example.com',
        phone: '123-456-7890',
        location: 'Test Location',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      loading: false,
      signOut: jest.fn()
    })

    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'test-project',
          name: 'Test Project',
          status: 'prep',
          talent_expected: 10,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          project_setup_checklist: {
            roles_and_pay_completed: false,
            talent_roster_completed: false,
            team_assignments_completed: false,
            locations_completed: false
          }
        }
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<ProjectDetailLayout projectId="test-project" />)
    
    // Should show loading spinner initially
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders project header and overview card for prep projects', async () => {
    render(<ProjectDetailLayout projectId="test-project" />)
    
    // Wait for the project to load
    await screen.findByTestId('project-header')
    
    expect(screen.getByTestId('project-header')).toBeInTheDocument()
    expect(screen.getByTestId('project-overview-card')).toBeInTheDocument()
    expect(screen.getByTestId('project-tabs')).toBeInTheDocument()
    expect(screen.queryByTestId('operations-dashboard')).not.toBeInTheDocument()
  })

  it('renders operations dashboard for active projects', async () => {
    // Mock active project response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'test-project',
          name: 'Test Project',
          status: 'active',
          talent_expected: 10,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          project_setup_checklist: {
            roles_and_pay_completed: true,
            talent_roster_completed: true,
            team_assignments_completed: true,
            locations_completed: true,
            completed_at: '2024-01-01T00:00:00Z'
          }
        }
      })
    })

    render(<ProjectDetailLayout projectId="test-project" />)
    
    // Wait for the project to load
    await screen.findByTestId('project-header')
    
    expect(screen.getByTestId('project-header')).toBeInTheDocument()
    expect(screen.getByTestId('project-overview-card')).toBeInTheDocument()
    expect(screen.getByTestId('operations-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('project-tabs')).not.toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    // Mock API error
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404
    })

    render(<ProjectDetailLayout projectId="test-project" />)
    
    // Should show error message
    await screen.findByText('Project not found')
    expect(screen.getByText('Project not found')).toBeInTheDocument()
  })
})