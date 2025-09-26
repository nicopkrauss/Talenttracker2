import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectTimecardList } from '../project-timecard-list'
import type { Timecard } from '@/lib/types'

// Mock the Supabase client
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }))
}))

// Mock fetch
global.fetch = vi.fn()

describe('Breakdown Toggle Functionality', () => {
  const mockProject = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'Test Description'
  }

  const mockTimecard: Timecard = {
    id: 'test-timecard-1',
    user_id: 'test-user-1',
    date: '2024-01-15',
    check_in_time: '2024-01-15T09:00:00Z',
    check_out_time: '2024-01-15T17:00:00Z',
    break_start_time: '2024-01-15T12:00:00Z',
    break_end_time: '2024-01-15T13:00:00Z',
    status: 'submitted',
    total_hours: 7,
    pay_rate: 25,
    total_pay: 175,
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z',
    profiles: {
      full_name: 'Test User',
      id: 'test-user-1'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API responses
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [mockTimecard]
      })
    })
  })

  it('should show expand all button when timecards are present', async () => {
    render(
      <ProjectTimecardList
        projectId="test-project-id"
        project={mockProject}
        userRole="admin"
        showUserColumn={true}
      />
    )

    // Wait for the component to load data
    await screen.findByText('Expand All')
    
    expect(screen.getByText('Expand All')).toBeInTheDocument()
  })

  it('should toggle between expand all and collapse all', async () => {
    render(
      <ProjectTimecardList
        projectId="test-project-id"
        project={mockProject}
        userRole="admin"
        showUserColumn={true}
      />
    )

    // Wait for the component to load data
    const expandButton = await screen.findByText('Expand All')
    
    // Click to expand all
    fireEvent.click(expandButton)
    
    // Should now show "Collapse All"
    expect(screen.getByText('Collapse All')).toBeInTheDocument()
    
    // Click to collapse all
    fireEvent.click(screen.getByText('Collapse All'))
    
    // Should now show "Expand All" again
    expect(screen.getByText('Expand All')).toBeInTheDocument()
  })

  it('should show breakdown toggle button on individual timecards', async () => {
    render(
      <ProjectTimecardList
        projectId="test-project-id"
        project={mockProject}
        userRole="admin"
        showUserColumn={true}
      />
    )

    // Wait for the component to load data
    await screen.findAllByText('Test User')
    
    // Should show the breakdown toggle button (mobile version)
    expect(screen.getByText('Show Daily Breakdown')).toBeInTheDocument()
    // Should also show the desktop version
    expect(screen.getByText('Show Details')).toBeInTheDocument()
  })

  it('should toggle individual timecard breakdown', async () => {
    render(
      <ProjectTimecardList
        projectId="test-project-id"
        project={mockProject}
        userRole="admin"
        showUserColumn={true}
      />
    )

    // Wait for the component to load data
    await screen.findAllByText('Test User')
    
    // Test mobile button
    const mobileBreakdownButton = screen.getByText('Show Daily Breakdown')
    
    // Click to show breakdown
    fireEvent.click(mobileBreakdownButton)
    
    // Should now show "Hide Daily Breakdown" for mobile
    expect(screen.getByText('Hide Daily Breakdown')).toBeInTheDocument()
    // Should also show "Hide Details" for desktop
    expect(screen.getByText('Hide Details')).toBeInTheDocument()
    
    // Should show time details (using getAllByText since there are mobile and desktop versions)
    expect(screen.getAllByText('Check In').length).toBeGreaterThan(0)
    expect(screen.getAllByText('9:00 AM').length).toBeGreaterThan(0)
  })

  it('should show breakdown toggle for draft timecards', async () => {
    const draftTimecard: Timecard = {
      ...mockTimecard,
      status: 'draft'
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [draftTimecard]
      })
    })

    render(
      <ProjectTimecardList
        projectId="test-project-id"
        project={mockProject}
        userRole="admin"
        showUserColumn={true}
      />
    )

    // Wait for the component to load data
    await screen.findAllByText('Test User')
    
    // Should show the breakdown toggle button even for draft timecards
    expect(screen.getByText('Show Daily Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Show Details')).toBeInTheDocument()
  })
})