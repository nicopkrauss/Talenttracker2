import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProjectCard } from '../project-card'
import { Project } from '@/lib/types'

// Mock date-fns functions
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MMM d, yyyy') return 'Jan 1, 2024'
    if (formatStr === 'MMM d') return 'Jan 1'
    return 'Jan 1, 2024'
  }),
  isAfter: vi.fn(() => false),
  isBefore: vi.fn(() => false)
}))

const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project description',
  production_company: 'Test Studios',
  hiring_contact: 'John Doe',
  project_location: 'Los Angeles, CA',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  status: 'prep',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1'
}

describe('ProjectCard', () => {
  const defaultProps = {
    project: mockProject,
    userRole: 'admin' as const,
    canAccessDetails: true
  }

  it('renders project information correctly', () => {
    render(<ProjectCard {...defaultProps} />)
    
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('A test project description')).toBeInTheDocument()
    expect(screen.getByText('Test Studios')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument()
  })

  it('displays correct status badge for prep project', () => {
    render(<ProjectCard {...defaultProps} />)
    
    expect(screen.getByText('Prep')).toBeInTheDocument()
  })

  it('displays correct status badge for active project', () => {
    const activeProject = { ...mockProject, status: 'active' as const }
    render(<ProjectCard {...defaultProps} project={activeProject} />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays correct status badge for archived project', () => {
    const archivedProject = { ...mockProject, status: 'archived' as const }
    render(<ProjectCard {...defaultProps} project={archivedProject} />)
    
    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('shows setup progress for prep projects when user can access details', () => {
    render(<ProjectCard {...defaultProps} />)
    
    expect(screen.getByText('Setup Progress')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('does not show setup progress for non-prep projects', () => {
    const activeProject = { ...mockProject, status: 'active' as const }
    render(<ProjectCard {...defaultProps} project={activeProject} />)
    
    expect(screen.queryByText('Setup Progress')).not.toBeInTheDocument()
  })

  it('shows admin action buttons for admin users with access', () => {
    render(<ProjectCard {...defaultProps} />)
    
    expect(screen.getByText('View Details')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('shows activate button for prep projects when admin has access', () => {
    render(<ProjectCard {...defaultProps} />)
    
    expect(screen.getByText('Activate')).toBeInTheDocument()
  })

  it('shows archive button for active projects when admin has access', () => {
    const activeProject = { ...mockProject, status: 'active' as const }
    render(<ProjectCard {...defaultProps} project={activeProject} />)
    
    expect(screen.getByText('Archive')).toBeInTheDocument()
  })

  it('does not show admin buttons for non-admin users', () => {
    render(
      <ProjectCard 
        {...defaultProps} 
        userRole="talent_escort" 
        canAccessDetails={false}
      />
    )
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Activate')).not.toBeInTheDocument()
  })

  it('shows timecard button for restricted users with timecards', () => {
    render(
      <ProjectCard 
        {...defaultProps} 
        userRole="talent_escort" 
        canAccessDetails={false}
        hasTimecards={true}
      />
    )
    
    expect(screen.getByText('View My Timecard')).toBeInTheDocument()
  })

  it('shows access restriction message for users without access or timecards', () => {
    render(
      <ProjectCard 
        {...defaultProps} 
        userRole="talent_escort" 
        canAccessDetails={false}
        hasTimecards={false}
      />
    )
    
    expect(screen.getByText('Project access restricted')).toBeInTheDocument()
  })

  it('calls onViewProject when View Details button is clicked', () => {
    const onViewProject = vi.fn()
    render(<ProjectCard {...defaultProps} onViewProject={onViewProject} />)
    
    fireEvent.click(screen.getByText('View Details'))
    expect(onViewProject).toHaveBeenCalledWith('project-1')
  })

  it('calls onEditProject when Edit button is clicked', () => {
    const onEditProject = vi.fn()
    render(<ProjectCard {...defaultProps} onEditProject={onEditProject} />)
    
    fireEvent.click(screen.getByText('Edit'))
    expect(onEditProject).toHaveBeenCalledWith('project-1')
  })

  it('calls onActivateProject when Activate button is clicked', () => {
    const onActivateProject = vi.fn()
    render(<ProjectCard {...defaultProps} onActivateProject={onActivateProject} />)
    
    fireEvent.click(screen.getByText('Activate'))
    expect(onActivateProject).toHaveBeenCalledWith('project-1')
  })

  it('calls onViewTimecard when View My Timecard button is clicked', () => {
    const onViewTimecard = vi.fn()
    render(
      <ProjectCard 
        {...defaultProps} 
        userRole="talent_escort" 
        canAccessDetails={false}
        hasTimecards={true}
        onViewTimecard={onViewTimecard}
      />
    )
    
    fireEvent.click(screen.getByText('View My Timecard'))
    expect(onViewTimecard).toHaveBeenCalledWith('project-1')
  })

  it('handles missing optional project fields gracefully', () => {
    const minimalProject = {
      ...mockProject,
      description: undefined,
      production_company: undefined,
      hiring_contact: undefined,
      project_location: undefined
    }
    
    render(<ProjectCard {...defaultProps} project={minimalProject} />)
    
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.queryByText('Test Studios')).not.toBeInTheDocument()
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    expect(screen.queryByText('Los Angeles, CA')).not.toBeInTheDocument()
  })
})