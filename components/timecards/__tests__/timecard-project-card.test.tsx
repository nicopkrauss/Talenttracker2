import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TimecardProjectCard } from '../timecard-project-card'
import { Project } from '@/lib/types'

const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project for timecard navigation',
  production_company: 'Test Productions',
  location: 'Los Angeles, CA',
  start_date: '2024-01-15',
  end_date: '2024-01-20',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1'
}

const mockTimecardStats = {
  projectId: 'project-1',
  projectName: 'Test Project',
  projectDescription: 'A test project for timecard navigation',
  productionCompany: 'Test Productions',
  totalTimecards: 5,
  statusBreakdown: {
    draft: 1,
    submitted: 2,
    approved: 1,
    rejected: 1
  },
  totalHours: 40.5,
  totalApprovedPay: 1200,
  lastActivity: '2024-01-15T10:30:00Z',
  pendingApprovals: 2,
  overdueSubmissions: 0
}

describe('TimecardProjectCard', () => {
  const defaultProps = {
    project: mockProject,
    timecardStats: mockTimecardStats,
    userRole: 'admin' as const,
    onSelectProject: vi.fn()
  }

  it('renders project information correctly', () => {
    render(<TimecardProjectCard {...defaultProps} />)
    
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Test Productions')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument()
  })

  it('displays timecard statistics correctly', () => {
    render(<TimecardProjectCard {...defaultProps} />)
    
    expect(screen.getByText('5 timecards')).toBeInTheDocument()
    expect(screen.getByText('40.5h')).toBeInTheDocument()
    expect(screen.getByText('$1,200')).toBeInTheDocument()
  })

  it('shows status breakdown badges', () => {
    render(<TimecardProjectCard {...defaultProps} />)
    
    expect(screen.getByText('1 Draft')).toBeInTheDocument()
    expect(screen.getByText('2 Submitted')).toBeInTheDocument()
    expect(screen.getByText('1 Approved')).toBeInTheDocument()
    expect(screen.getByText('1 Rejected')).toBeInTheDocument()
  })

  it('shows pending approval indicator for admin users', () => {
    render(<TimecardProjectCard {...defaultProps} />)
    
    expect(screen.getByText('2 Pending')).toBeInTheDocument()
  })

  it('does not show admin indicators for non-admin users', () => {
    render(
      <TimecardProjectCard 
        {...defaultProps} 
        userRole="talent_escort" 
      />
    )
    
    expect(screen.queryByText('2 Pending')).not.toBeInTheDocument()
  })

  it('shows overdue submissions indicator when present', () => {
    const statsWithOverdue = {
      ...mockTimecardStats,
      overdueSubmissions: 1
    }
    
    render(
      <TimecardProjectCard 
        {...defaultProps} 
        timecardStats={statsWithOverdue}
      />
    )
    
    expect(screen.getByText('1 Overdue')).toBeInTheDocument()
  })

  it('calls onSelectProject when View Timecards button is clicked', () => {
    const onSelectProject = vi.fn()
    render(<TimecardProjectCard {...defaultProps} onSelectProject={onSelectProject} />)
    
    fireEvent.click(screen.getByText('View Timecards'))
    expect(onSelectProject).toHaveBeenCalledWith('project-1')
  })

  it('calls onSelectProject when project name is clicked', () => {
    const onSelectProject = vi.fn()
    render(<TimecardProjectCard {...defaultProps} onSelectProject={onSelectProject} />)
    
    fireEvent.click(screen.getByText('Test Project'))
    expect(onSelectProject).toHaveBeenCalledWith('project-1')
  })

  it('displays last activity correctly', () => {
    render(<TimecardProjectCard {...defaultProps} />)
    
    // Should show formatted date for activity from the past
    expect(screen.getByText(/Last activity:/)).toBeInTheDocument()
  })

  it('handles missing optional data gracefully', () => {
    const minimalStats = {
      projectId: 'project-1',
      projectName: 'Test Project',
      totalTimecards: 1,
      statusBreakdown: {
        draft: 1,
        submitted: 0,
        approved: 0,
        rejected: 0
      },
      totalHours: 8,
      totalApprovedPay: 0,
      lastActivity: null
    }
    
    const minimalProject = {
      ...mockProject,
      description: undefined,
      production_company: undefined,
      location: undefined
    }
    
    render(
      <TimecardProjectCard 
        {...defaultProps} 
        project={minimalProject}
        timecardStats={minimalStats}
      />
    )
    
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('1 timecards')).toBeInTheDocument()
    expect(screen.getByText(/No recent activity/)).toBeInTheDocument()
  })

  it('does not show zero-count status badges', () => {
    const statsWithZeros = {
      ...mockTimecardStats,
      statusBreakdown: {
        draft: 0,
        submitted: 1,
        approved: 0,
        rejected: 0
      }
    }
    
    render(
      <TimecardProjectCard 
        {...defaultProps} 
        timecardStats={statsWithZeros}
      />
    )
    
    expect(screen.queryByText('0 Draft')).not.toBeInTheDocument()
    expect(screen.queryByText('0 Approved')).not.toBeInTheDocument()
    expect(screen.queryByText('0 Rejected')).not.toBeInTheDocument()
    expect(screen.getByText('1 Submitted')).toBeInTheDocument()
  })
})