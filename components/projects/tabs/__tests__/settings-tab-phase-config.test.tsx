import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { SettingsTab } from '../settings-tab'
import { useToast } from '@/hooks/use-toast'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

// Mock the child components
jest.mock('@/components/projects/phase-configuration-panel', () => ({
  PhaseConfigurationPanel: ({ projectId, onConfigurationChange }: any) => (
    <div data-testid="phase-configuration-panel">
      <h3>Phase Configuration Panel</h3>
      <button onClick={onConfigurationChange}>Update Configuration</button>
      <span>Project ID: {projectId}</span>
    </div>
  )
}))

jest.mock('@/components/projects/phase-transition-history', () => ({
  PhaseTransitionHistory: ({ projectId, onRefresh }: any) => (
    <div data-testid="phase-transition-history">
      <h3>Phase Transition History</h3>
      <button onClick={onRefresh}>Refresh History</button>
      <span>Project ID: {projectId}</span>
    </div>
  )
}))

jest.mock('@/components/projects/file-upload', () => ({
  FileUpload: ({ projectId, onUploadComplete }: any) => (
    <div data-testid="file-upload">
      <button onClick={onUploadComplete}>Upload Complete</button>
      <span>Project ID: {projectId}</span>
    </div>
  )
}))

// Mock fetch
global.fetch = jest.fn()

const mockToast = jest.fn()
;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  status: 'prep',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  start_date: '2024-02-01',
  end_date: '2024-02-28',
  description: 'Test project description'
}

const mockSettings = {
  projectId: 'project-1',
  defaultBreakDuration: 30,
  payrollExportFormat: 'csv',
  notificationRules: {
    timecardReminders: true,
    shiftAlerts: true,
    talentArrivalNotifications: false,
    overtimeWarnings: true,
  },
  autoTransitionsEnabled: true,
  archiveMonth: 4,
  archiveDay: 1,
  postShowTransitionHour: 6,
}

const mockAuditLog = [
  {
    id: 'audit-1',
    action: 'phase_configuration_updated',
    details: { autoTransitionsEnabled: true },
    created_at: '2024-01-15T10:30:00Z',
    user: { id: 'user-1', full_name: 'John Doe' }
  }
]

const mockAttachments = [
  {
    id: 'attachment-1',
    name: 'Project Notes',
    type: 'note',
    content: 'Important project notes',
    created_at: '2024-01-10T09:00:00Z',
    created_by_user: { id: 'user-1', full_name: 'John Doe' }
  }
]

describe('SettingsTab with Phase Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  const setupMockFetch = () => {
    ;(fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/settings')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: mockSettings })
          })
        }
        if (url.includes('/audit-log')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: mockAuditLog })
          })
        }
        if (url.includes('/attachments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: mockAttachments })
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })
  }

  it('renders phase configuration panel', async () => {
    setupMockFetch()
    
    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('phase-configuration-panel')).toBeInTheDocument()
    })

    expect(screen.getByText('Phase Configuration Panel')).toBeInTheDocument()
    expect(screen.getByText('Project ID: project-1')).toBeInTheDocument()
  })

  it('renders phase transition history', async () => {
    setupMockFetch()
    
    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('phase-transition-history')).toBeInTheDocument()
    })

    expect(screen.getByText('Phase Transition History')).toBeInTheDocument()
  })

  it('includes phase configuration in guidance buttons', async () => {
    setupMockFetch()
    
    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Phase Configuration')).toBeInTheDocument()
    })

    expect(screen.getByText('View Phase History')).toBeInTheDocument()
  })

  it('reloads audit log when phase configuration changes', async () => {
    setupMockFetch()
    
    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('phase-configuration-panel')).toBeInTheDocument()
    })

    const updateButton = screen.getByText('Update Configuration')
    fireEvent.click(updateButton)

    // Should trigger audit log reload
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects/project-1/audit-log')
    })
  })

  it('reloads audit log when phase history is refreshed', async () => {
    setupMockFetch()
    
    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTestId('phase-transition-history')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh History')
    fireEvent.click(refreshButton)

    // Should trigger audit log reload
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects/project-1/audit-log')
    })
  })

  it('handles phase configuration guidance navigation', async () => {
    setupMockFetch()
    
    // Mock scrollIntoView
    const mockScrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = mockScrollIntoView

    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Phase Configuration')).toBeInTheDocument()
    })

    const phaseConfigButton = screen.getByText('Phase Configuration')
    fireEvent.click(phaseConfigButton)

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('handles phase history guidance navigation', async () => {
    setupMockFetch()
    
    // Mock querySelector and scrollIntoView
    const mockScrollIntoView = jest.fn()
    const mockElement = { scrollIntoView: mockScrollIntoView }
    document.querySelector = jest.fn().mockReturnValue(mockElement)

    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('View Phase History')).toBeInTheDocument()
    })

    const phaseHistoryButton = screen.getByText('View Phase History')
    fireEvent.click(phaseHistoryButton)

    expect(document.querySelector).toHaveBeenCalledWith('[data-testid="phase-transition-history"]')
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('displays loading state correctly', () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    expect(screen.getByRole('generic', { name: /loading/i })).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
    
    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to load project settings",
        variant: "destructive",
      })
    })
  })

  it('saves settings with phase configuration', async () => {
    setupMockFetch()
    
    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })

    // Mock PUT request for settings save
    ;(fetch as jest.Mock).mockImplementationOnce((url: string, options: any) => {
      if (url.includes('/settings') && options.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockSettings })
        })
      }
      return Promise.reject(new Error('Unexpected request'))
    })

    const saveButton = screen.getByText('Save Settings')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Project settings saved successfully",
      })
    })
  })

  it('formats audit actions correctly for phase configuration', async () => {
    const phaseConfigAuditLog = [
      {
        id: 'audit-1',
        action: 'phase_configuration_updated',
        details: { autoTransitionsEnabled: true },
        created_at: '2024-01-15T10:30:00Z',
        user: { id: 'user-1', full_name: 'John Doe' }
      }
    ]

    ;(fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/settings')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: mockSettings })
          })
        }
        if (url.includes('/audit-log')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: phaseConfigAuditLog })
          })
        }
        if (url.includes('/attachments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [] })
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

    render(<SettingsTab project={mockProject} onProjectUpdate={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Should show the formatted action
    expect(screen.getByText(/phase_configuration_updated/)).toBeInTheDocument()
  })
})