import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ProjectTimecardStatistics } from '../project-timecard-statistics'

// Mock fetch
global.fetch = vi.fn()

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description'
}

const mockTimecards = [
  {
    id: 'tc-1',
    status: 'approved',
    total_pay: 1000,
    total_hours: 40,
    user_id: 'user-1',
    date: '2024-01-01',
    working_days: 5, // 5 days of work, 8 hours per day
    daily_entries: [
      { work_date: '2024-01-01', hours_worked: 8 },
      { work_date: '2024-01-02', hours_worked: 8 },
      { work_date: '2024-01-03', hours_worked: 8 },
      { work_date: '2024-01-04', hours_worked: 8 },
      { work_date: '2024-01-05', hours_worked: 8 }
    ]
  },
  {
    id: 'tc-2', 
    status: 'submitted',
    total_pay: 500,
    total_hours: 20,
    user_id: 'user-2',
    date: '2024-01-02',
    working_days: 2, // 2 days of work, 10 hours per day
    daily_entries: [
      { work_date: '2024-01-02', hours_worked: 10 },
      { work_date: '2024-01-03', hours_worked: 10 }
    ]
  },
  {
    id: 'tc-3',
    status: 'draft',
    total_pay: 300,
    total_hours: 15,
    user_id: 'user-3',
    date: '2024-01-03',
    working_days: 3, // 3 days of work, 5 hours per day
    daily_entries: [
      { work_date: '2024-01-03', hours_worked: 5 },
      { work_date: '2024-01-04', hours_worked: 5 },
      { work_date: '2024-01-05', hours_worked: 5 }
    ]
  }
]

const mockTeamAssignments = {
  assignments: [
    { user_id: 'user-1', role: 'supervisor' },
    { user_id: 'user-2', role: 'talent_escort' },
    { user_id: 'user-3', role: 'coordinator' }
  ]
}

describe('ProjectTimecardStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    
    render(
      <ProjectTimecardStatistics 
        projectId="project-1" 
        project={mockProject} 
      />
    )

    expect(screen.getByText('Timecard Overview')).toBeInTheDocument()
    expect(screen.getByLabelText('Collapse timecard overview')).toBeInTheDocument()
  })

  it('displays statistics correctly after loading', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTimecards })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeamAssignments
      } as Response)

    render(
      <ProjectTimecardStatistics 
        projectId="project-1" 
        project={mockProject} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Timecard Overview')).toBeInTheDocument()
      // Component renders both mobile and desktop layouts, so we expect multiple instances
      expect(screen.getAllByText('Total').length).toBeGreaterThan(0)
      expect(screen.getAllByText('25.0').length).toBeGreaterThan(0) // Average hours per timecard (75/3)
      expect(screen.getAllByText('7.5').length).toBeGreaterThan(0) // Daily average (75 hours / 10 days)
      expect(screen.getAllByText('Daily Average').length).toBeGreaterThan(0) // Daily average label
    })
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API Error' })
    } as Response)

    render(
      <ProjectTimecardStatistics 
        projectId="project-1" 
        project={mockProject} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load timecard statistics')).toBeInTheDocument()
    })
  })

  it('shows rejected timecards section when there are rejections', async () => {
    const timecardsWithRejected = [
      ...mockTimecards,
      {
        id: 'tc-4',
        status: 'rejected',
        total_pay: 200,
        total_hours: 10,
        user_id: 'user-4'
      }
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: timecardsWithRejected })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeamAssignments
      } as Response)

    render(
      <ProjectTimecardStatistics 
        projectId="project-1" 
        project={mockProject} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Rejected Timecards')).toBeInTheDocument()
    })
  })

  it('displays pay by role information', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTimecards })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeamAssignments
      } as Response)

    render(
      <ProjectTimecardStatistics 
        projectId="project-1" 
        project={mockProject} 
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText('Pay by Role').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Supervisor').length).toBeGreaterThan(0)
    })
  })

  it('can be collapsed and expanded', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTimecards })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeamAssignments
      } as Response)

    const user = userEvent.setup()
    render(
      <ProjectTimecardStatistics 
        projectId="project-1" 
        project={mockProject} 
      />
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Timecard Overview')).toBeInTheDocument()
    })

    // Initially expanded, should show statistics
    expect(screen.getAllByText('Total').length).toBeGreaterThan(0)

    // Click collapse button
    const collapseButton = screen.getByLabelText('Collapse timecard overview')
    await user.click(collapseButton)

    // Should be collapsed now, statistics should not be visible
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Expand timecard overview')).toBeInTheDocument()

    // Click expand button
    const expandButton = screen.getByLabelText('Expand timecard overview')
    await user.click(expandButton)

    // Should be expanded again, statistics should be visible
    expect(screen.getAllByText('Total').length).toBeGreaterThan(0)
  })
})