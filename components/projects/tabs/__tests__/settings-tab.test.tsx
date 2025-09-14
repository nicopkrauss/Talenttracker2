import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsTab } from '../settings-tab'
import { EnhancedProject } from '@/lib/types'

// Mock the toast hook
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock fetch
global.fetch = vi.fn()

const mockProject: EnhancedProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test Description',
  productionCompany: 'Test Company',
  hiringContact: 'Test Contact',
  projectLocation: 'Test Location',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  status: 'prep',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'user-1',
  talentExpected: 10,
  statistics: {
    talentExpected: 10,
    talentAssigned: 5,
    staffNeeded: 8,
    staffAssigned: 6,
    staffCheckedIn: 4,
    talentPresent: 3,
    activeEscorts: 2,
    staffOvertime: {
      over8Hours: 1,
      over12Hours: 0,
    },
  },
  setupChecklist: {
    projectId: 'project-1',
    rolesAndPayCompleted: false,
    talentRosterCompleted: false,
    teamAssignmentsCompleted: false,
    locationsCompleted: false,
    completedAt: null,
  },
}

describe('SettingsTab', () => {
  const mockOnProjectUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API responses
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              projectId: 'project-1',
              defaultBreakDuration: 30,
              payrollExportFormat: 'csv',
              notificationRules: {
                timecardReminders: true,
                shiftAlerts: true,
                talentArrivalNotifications: false,
                overtimeWarnings: true,
              },
            },
          }),
        })
      }
      if (url.includes('/audit-log')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                id: 'audit-1',
                action: 'settings_updated',
                details: { defaultBreakDuration: 30 },
                created_at: '2024-01-15T10:30:00Z',
                user: {
                  id: 'user-1',
                  full_name: 'John Doe',
                },
              },
            ],
            pagination: {
              page: 1,
              limit: 50,
              total: 1,
              totalPages: 1,
            },
          }),
        })
      }
      if (url.includes('/attachments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                id: 'attachment-1',
                name: 'Test Note',
                type: 'note',
                content: 'This is a test note',
                created_at: '2024-01-15T10:30:00Z',
                created_by_user: {
                  id: 'user-1',
                  full_name: 'John Doe',
                },
              },
            ],
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
  })

  it('should render loading state initially', () => {
    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    expect(screen.getByText(/animate-pulse/)).toBeInTheDocument()
  })

  it('should load and display project settings', async () => {
    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Project Configuration')).toBeInTheDocument()
    })

    expect(screen.getByText('Default Break Duration')).toBeInTheDocument()
    expect(screen.getByText('Payroll Export Format')).toBeInTheDocument()
    expect(screen.getByText('Notification Rules')).toBeInTheDocument()
  })

  it('should display audit log entries', async () => {
    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Audit Log')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('updated project settings')).toBeInTheDocument()
    })
  })

  it('should display attachments and notes', async () => {
    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Attachments & Notes')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument()
      expect(screen.getByText('"This is a test note"')).toBeInTheDocument()
    })
  })

  it('should allow adding a new note', async () => {
    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Note')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Enter your note here...')
    const addButton = screen.getByRole('button', { name: /Add Note/ })

    fireEvent.change(textarea, { target: { value: 'New test note' } })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/project-1/attachments',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: expect.stringContaining('Note -'),
            type: 'note',
            content: 'New test note',
          }),
        })
      )
    })
  })

  it('should allow updating settings', async () => {
    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /Save Settings/ })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/project-1/settings',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to load settings' }),
      })
    )

    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to load project settings",
        variant: "destructive",
      })
    })
  })

  it('should show file upload notice', async () => {
    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText(/File upload functionality requires additional setup/)).toBeInTheDocument()
    })
  })

  it('should format audit actions correctly', async () => {
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/audit-log')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                id: 'audit-1',
                action: 'project_activated',
                details: null,
                created_at: '2024-01-15T10:30:00Z',
                user: {
                  id: 'user-1',
                  full_name: 'John Doe',
                },
              },
            ],
            pagination: {
              page: 1,
              limit: 50,
              total: 1,
              totalPages: 1,
            },
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      })
    })

    render(<SettingsTab project={mockProject} onProjectUpdate={mockOnProjectUpdate} />)
    
    await waitFor(() => {
      expect(screen.getByText('activated the project')).toBeInTheDocument()
    })
  })
})