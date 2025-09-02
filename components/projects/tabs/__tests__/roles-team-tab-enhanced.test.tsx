import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RolesTeamTab } from '../roles-team-tab'
import { EnhancedProject } from '@/lib/types'

// Mock the hooks and components
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

vi.mock('@/components/projects/project-role-template-manager', () => ({
  ProjectRoleTemplateManager: ({ onUpdate }: { onUpdate: () => void }) => (
    <div data-testid="role-template-manager">Role Template Manager</div>
  )
}))

// Mock fetch
global.fetch = vi.fn()

const mockProject: EnhancedProject = {
  id: 'test-project-1',
  name: 'Test Project',
  description: 'Test Description',
  status: 'prep',
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  project_setup_checklist: [],
  project_role_templates: []
}

const mockAvailableStaff = [
  {
    id: 'staff-1',
    full_name: 'John Doe',
    email: 'john@example.com',
    nearest_major_city: 'Los Angeles',
    willing_to_fly: true,
    role: 'admin',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'staff-2',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    nearest_major_city: 'New York',
    willing_to_fly: false,
    role: null,
    status: 'active',
    created_at: '2024-01-01T00:00:00Z'
  }
]

const mockAssignments = [
  {
    id: 'assignment-1',
    project_id: 'test-project-1',
    user_id: 'staff-3',
    role: 'supervisor' as const,
    pay_rate: 350,
    created_at: '2024-01-01T00:00:00Z',
    profiles: {
      id: 'staff-3',
      full_name: 'Bob Wilson',
      email: 'bob@example.com',
      nearest_major_city: 'Chicago',
      willing_to_fly: true
    }
  }
]

const mockRoleTemplates = [
  {
    id: 'template-1',
    project_id: 'test-project-1',
    role: 'supervisor' as const,
    display_name: 'Supervisor',
    base_pay_rate: 350,
    time_type: 'daily' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

describe('RolesTeamTab Enhanced Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock API responses
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
      if (url.includes('/role-templates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ roleTemplates: mockRoleTemplates })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
  })

  it('displays staff information with city and flight status in assign staff section', async () => {
    render(
      <RolesTeamTab 
        project={mockProject} 
        onProjectUpdate={vi.fn()} 
      />
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Check that staff information is displayed correctly
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('📍 Los Angeles')).toBeInTheDocument()
    expect(screen.getAllByText('✈️ Will fly')).toHaveLength(2) // One in available staff, one in assignments

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('📍 New York')).toBeInTheDocument()
    expect(screen.getByText('✈️ Local only')).toBeInTheDocument()
  })

  it('displays assigned staff information with city and flight status', async () => {
    render(
      <RolesTeamTab 
        project={mockProject} 
        onProjectUpdate={vi.fn()} 
      />
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })

    // Check that assigned staff information is displayed correctly
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    expect(screen.getByText('📍 Chicago')).toBeInTheDocument()
    expect(screen.getAllByText('✈️ Will fly')).toHaveLength(2) // One in available staff, one in assignments
    expect(screen.getByText('Supervisor')).toBeInTheDocument()
  })

  it('displays the information header correctly', async () => {
    render(
      <RolesTeamTab 
        project={mockProject} 
        onProjectUpdate={vi.fn()} 
      />
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Name • Role • City • Flight Status')).toBeInTheDocument()
    })
  })

  it('handles staff without city or flight preference gracefully', async () => {
    const staffWithoutInfo = [{
      id: 'staff-minimal',
      full_name: 'Minimal Staff',
      email: 'minimal@example.com',
      nearest_major_city: null,
      willing_to_fly: undefined,
      role: null,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z'
    }]

    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/available-staff')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ staff: staffWithoutInfo })
        })
      }
      if (url.includes('/team-assignments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ assignments: [] })
        })
      }
      if (url.includes('/role-templates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ roleTemplates: mockRoleTemplates })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })

    render(
      <RolesTeamTab 
        project={mockProject} 
        onProjectUpdate={vi.fn()} 
      />
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Minimal Staff')).toBeInTheDocument()
    })

    // Should display name and email but not city or flight info
    expect(screen.getByText('Minimal Staff')).toBeInTheDocument()
    expect(screen.getByText('minimal@example.com')).toBeInTheDocument()
    expect(screen.queryByText('📍')).not.toBeInTheDocument()
    expect(screen.queryByText('✈️')).not.toBeInTheDocument()
  })
})