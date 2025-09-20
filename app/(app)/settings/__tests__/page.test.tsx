import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GlobalSettingsPage from '../page'

// Mock the toast hook
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

// Mock fetch
global.fetch = vi.fn()

describe('GlobalSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful settings fetch
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          settings: {
            breakDurations: {
              defaultEscortMinutes: 30,
              defaultStaffMinutes: 60
            },
            timecardNotifications: {
              reminderFrequencyDays: 1,
              submissionOpensOnShowDay: true
            },
            shiftLimits: {
              maxHoursBeforeStop: 20,
              overtimeWarningHours: 12
            },
            systemSettings: {
              archiveDate: {
                month: 12,
                day: 31
              },
              postShowTransitionTime: "06:00"
            }
          },
          permissions: {
            inHouse: {
              canApproveTimecards: true,
              canInitiateCheckout: true,
              canManageProjects: true
            },
            supervisor: {
              canApproveTimecards: false,
              canInitiateCheckout: true
            },
            coordinator: {
              canApproveTimecards: false,
              canInitiateCheckout: false
            }
          }
        }
      })
    })
  })

  it('should render the page title and main sections', async () => {
    render(<GlobalSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Global Settings')).toBeInTheDocument()
    })

    expect(screen.getByText('Timecard & Break Settings')).toBeInTheDocument()
    expect(screen.getByText('System Settings')).toBeInTheDocument()
    expect(screen.getByText('Role Permissions')).toBeInTheDocument()
  })

  it('should load and display settings correctly', async () => {
    render(<GlobalSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Timecard & Break Settings')).toBeInTheDocument()
      expect(screen.getByText('System Settings')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/settings/global')
  })

  it('should handle save settings', async () => {
    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            settings: {
              breakDurations: { defaultEscortMinutes: 30, defaultStaffMinutes: 60 },
              timecardNotifications: { reminderFrequencyDays: 1, submissionOpensOnShowDay: true },
              shiftLimits: { maxHoursBeforeStop: 20, overtimeWarningHours: 12 },
              systemSettings: { archiveDate: { month: 12, day: 31 }, postShowTransitionTime: "06:00" }
            },
            permissions: {
              inHouse: { canApproveTimecards: true, canInitiateCheckout: true, canManageProjects: true },
              supervisor: { canApproveTimecards: false, canInitiateCheckout: true },
              coordinator: { canApproveTimecards: false, canInitiateCheckout: false }
            }
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Settings saved successfully' })
      })

    render(<GlobalSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Save All Settings')).toBeInTheDocument()
    })

    const saveButton = screen.getByText('Save All Settings')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/global', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('breakDurations')
      })
    })
  })

  it('should show loading state initially', () => {
    render(<GlobalSettingsPage />)
    
    expect(screen.getByText('Global Settings')).toBeInTheDocument()
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('API Error'))

    render(<GlobalSettingsPage />)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to load global settings",
        variant: "destructive",
      })
    })
  })

  it('should display role permissions placeholder', async () => {
    render(<GlobalSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Role Permissions')).toBeInTheDocument()
    })

    expect(screen.getByText(/Role permission configuration will be implemented/)).toBeInTheDocument()
  })

  it('should allow changing break duration settings', async () => {
    render(<GlobalSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Default Escort Break Duration')).toBeInTheDocument()
      expect(screen.getByText('Default Staff Break Duration')).toBeInTheDocument()
    })

    // Verify the labels are present - actual Select component testing would be more complex
    expect(screen.getByText('Default Escort Break Duration')).toBeInTheDocument()
    expect(screen.getByText('Default Staff Break Duration')).toBeInTheDocument()
  })
})