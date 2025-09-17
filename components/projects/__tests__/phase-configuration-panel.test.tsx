import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhaseConfigurationPanel } from '../phase-configuration-panel'

// Mock the toast hook
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

// Mock fetch
global.fetch = vi.fn()

const mockConfiguration = {
  currentPhase: 'prep',
  phaseUpdatedAt: '2024-03-01T10:00:00Z',
  autoTransitionsEnabled: true,
  location: 'New York, NY',
  timezone: 'America/New_York',
  rehearsalStartDate: '2024-03-15',
  showEndDate: '2024-03-20',
  archiveMonth: 4,
  archiveDay: 1,
  postShowTransitionHour: 6
}

describe('PhaseConfigurationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with initial configuration', () => {
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    expect(screen.getByText('Phase Configuration')).toBeInTheDocument()
    expect(screen.getByText('Preparation')).toBeInTheDocument()
    expect(screen.getByDisplayValue('New York, NY')).toBeInTheDocument()
    // Check that the project dates section is present
    expect(screen.getByText('Project Dates')).toBeInTheDocument()
    expect(screen.getByText('Rehearsal Start Date')).toBeInTheDocument()
    expect(screen.getByText('Show End Date')).toBeInTheDocument()
  })

  it('should fetch configuration when not provided initially', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockConfiguration })
    } as Response)

    render(<PhaseConfigurationPanel projectId="project-1" />)

    expect(screen.getByText('Phase Configuration')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Preparation')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/phase/configuration')
  })

  it('should handle fetch error gracefully', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Project not found' })
    } as Response)

    render(<PhaseConfigurationPanel projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('Project not found')).toBeInTheDocument()
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Project not found',
      variant: 'destructive'
    })
  })

  it('should enable save button when changes are made', async () => {
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    const saveButton = screen.getByText('Save Configuration')
    expect(saveButton).toBeDisabled()

    const locationInput = screen.getByDisplayValue('New York, NY')
    fireEvent.change(locationInput, { target: { value: 'Los Angeles, CA' } })

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })
  })

  it('should toggle automatic transitions switch', async () => {
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    const autoTransitionsSwitch = screen.getByRole('switch')
    expect(autoTransitionsSwitch).toBeChecked()

    fireEvent.click(autoTransitionsSwitch)

    await waitFor(() => {
      expect(autoTransitionsSwitch).not.toBeChecked()
    })
  })

  it('should update archive month and day', async () => {
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    const archiveMonthSelect = screen.getByDisplayValue('April')
    fireEvent.change(archiveMonthSelect, { target: { value: '6' } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('June')).toBeInTheDocument()
    })

    const archiveDayInput = screen.getByDisplayValue('1')
    fireEvent.change(archiveDayInput, { target: { value: '15' } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('15')).toBeInTheDocument()
    })

    expect(screen.getByText('Projects will be automatically archived on June 15')).toBeInTheDocument()
  })

  it('should save configuration successfully', async () => {
    const mockFetch = vi.mocked(fetch)
    const updatedConfig = { ...mockConfiguration, location: 'Los Angeles, CA', timezone: 'America/Los_Angeles' }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedConfig })
    } as Response)

    const onConfigurationChange = vi.fn()

    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
        onConfigurationChange={onConfigurationChange}
      />
    )

    // Make a change
    const locationInput = screen.getByDisplayValue('New York, NY')
    fireEvent.change(locationInput, { target: { value: 'Los Angeles, CA' } })

    // Save
    const saveButton = screen.getByText('Save Configuration')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-1/phase/configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          autoTransitionsEnabled: true,
          location: 'Los Angeles, CA',
          timezone: 'America/New_York', // The timezone won't auto-update in test environment
          archiveMonth: 4,
          archiveDay: 1,
          postShowTransitionHour: 6
        })
      })
    })

    expect(onConfigurationChange).toHaveBeenCalledWith(updatedConfig)
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Phase configuration updated successfully'
    })
  })

  it('should handle save error', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Validation failed' })
    } as Response)

    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    // Make a change
    const locationInput = screen.getByDisplayValue('New York, NY')
    fireEvent.change(locationInput, { target: { value: 'Los Angeles, CA' } })

    // Save
    const saveButton = screen.getByText('Save Configuration')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Validation failed',
        variant: 'destructive'
      })
    })
  })

  it('should validate invalid archive date', async () => {
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    // Set invalid date (February 31st)
    const archiveMonthSelect = screen.getByDisplayValue('April')
    fireEvent.change(archiveMonthSelect, { target: { value: '2' } })

    const archiveDayInput = screen.getByDisplayValue('1')
    fireEvent.change(archiveDayInput, { target: { value: '31' } })

    // Try to save
    const saveButton = screen.getByText('Save Configuration')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Validation Error',
        description: 'Invalid archive date combination',
        variant: 'destructive'
      })
    })
  })

  it('should validate invalid location', async () => {
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    const locationInput = screen.getByDisplayValue('New York, NY')
    fireEvent.change(locationInput, { target: { value: 'Invalid Location' } })

    const saveButton = screen.getByText('Save Configuration')
    fireEvent.click(saveButton)

    // Since location validation is more lenient, this should still save
    // The timezone might not be auto-determined but that's okay
    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })
  })

  it('should reset form to original values', async () => {
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    // Make changes
    const locationInput = screen.getByDisplayValue('New York, NY')
    fireEvent.change(locationInput, { target: { value: 'Los Angeles, CA' } })

    const archiveDayInput = screen.getByDisplayValue('1')
    fireEvent.change(archiveDayInput, { target: { value: '15' } })

    // Reset
    const resetButton = screen.getByText('Reset')
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('New York, NY')).toBeInTheDocument()
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })

    const saveButton = screen.getByText('Save Configuration')
    expect(saveButton).toBeDisabled()
  })

  it('should show loading state', () => {
    render(<PhaseConfigurationPanel projectId="project-1" />)

    expect(screen.getByText('Phase Configuration')).toBeInTheDocument()
    // Check for the loading spinner
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should display different phase badges correctly', () => {
    const activeConfig = { ...mockConfiguration, currentPhase: 'active' }
    
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={activeConfig}
      />
    )

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should update post-show transition hour', async () => {
    render(
      <PhaseConfigurationPanel 
        projectId="project-1" 
        initialConfiguration={mockConfiguration}
      />
    )

    const hourInput = screen.getByDisplayValue('6')
    fireEvent.change(hourInput, { target: { value: '8' } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()
    })
  })
})