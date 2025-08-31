import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { InfoTab } from '../info-tab'
import { EnhancedProject } from '@/lib/types'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'mock-token' } }
      }))
    }
  }))
}))

// Mock fetch
global.fetch = vi.fn()

const mockProject: EnhancedProject = {
  id: 'test-project-1',
  name: 'Test Project',
  description: 'Test description',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  status: 'prep',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  project_setup_checklist: {
    project_id: 'test-project-1',
    roles_and_pay_completed: false,
    talent_roster_completed: false,
    team_assignments_completed: false,
    locations_completed: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  statistics: {
    talentExpected: 10,
    talentAssigned: 5,
    staffNeeded: 6,
    staffAssigned: 4,
    staffCheckedIn: 2,
    talentPresent: 3,
    activeEscorts: 2,
    staffOvertime: {
      over8Hours: 1,
      over12Hours: 0
    }
  }
}

const mockOnProjectUpdate = vi.fn()

describe('InfoTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    })
  })

  it('renders description section', () => {
    render(<InfoTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('renders talent locations manager', () => {
    render(<InfoTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    expect(screen.getByText('Talent Locations Manager')).toBeInTheDocument()
  })

  it('allows editing description', async () => {
    render(<InfoTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    const editButton = screen.getByText('Edit Description')
    fireEvent.click(editButton)
    
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows add location button', async () => {
    render(<InfoTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Location')).toBeInTheDocument()
    })
  })

  it('shows loading state for locations', () => {
    render(<InfoTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    expect(screen.getByText('Loading locations...')).toBeInTheDocument()
  })

  it('shows empty state when no locations exist', async () => {
    render(<InfoTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('No locations defined yet.')).toBeInTheDocument()
    })
  })
})