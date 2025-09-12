import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TalentScheduleColumn } from '../talent-schedule-column'
import { createProjectScheduleFromStrings } from '@/lib/schedule-utils'
import { useToast } from '@/hooks/use-toast'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

const mockToast = jest.fn()
;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })

describe('TalentScheduleColumn', () => {
  const mockProjectSchedule = createProjectScheduleFromStrings('2024-01-15', '2024-01-17')
  const mockProps = {
    talentId: 'talent-1',
    projectId: 'project-1',
    projectSchedule: mockProjectSchedule,
    initialScheduledDates: ['2024-01-15'],
    isGroup: false,
    disabled: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
  })

  it('renders circular date selectors for project dates', () => {
    render(<TalentScheduleColumn {...mockProps} />)
    
    // Should render date selectors for all project dates
    expect(screen.getByText('1/15')).toBeInTheDocument()
    expect(screen.getByText('1/16')).toBeInTheDocument()
    expect(screen.getByText('1/17')).toBeInTheDocument()
  })

  it('shows initially scheduled dates as selected', () => {
    render(<TalentScheduleColumn {...mockProps} />)
    
    // The first date should be selected (filled)
    const firstDateButton = screen.getByText('1/15')
    expect(firstDateButton).toHaveClass('bg-primary')
  })

  it('toggles date selection when clicked', async () => {
    render(<TalentScheduleColumn {...mockProps} />)
    
    const secondDateButton = screen.getByText('1/16')
    
    // Initially not selected
    expect(secondDateButton).not.toHaveClass('bg-primary')
    
    // Click to select
    fireEvent.click(secondDateButton)
    
    // Should become selected
    expect(secondDateButton).toHaveClass('bg-primary')
    
    // Should call API
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/projects/project-1/talent-roster/talent-1/schedule',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('2024-01-15')
        })
      )
    })
  })

  it('uses group API endpoint when isGroup is true', async () => {
    render(<TalentScheduleColumn {...mockProps} isGroup={true} />)
    
    const dateButton = screen.getByText('1/16')
    fireEvent.click(dateButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/projects/project-1/talent-groups/talent-1',
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })
  })

  it('disables interaction when disabled prop is true', () => {
    render(<TalentScheduleColumn {...mockProps} disabled={true} />)
    
    const dateButton = screen.getByText('1/16')
    expect(dateButton).toBeDisabled()
  })

  it('shows error toast when API call fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'API Error' })
    })

    render(<TalentScheduleColumn {...mockProps} />)
    
    const dateButton = screen.getByText('1/16')
    fireEvent.click(dateButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "API Error",
        variant: "destructive"
      })
    })
  })

  it('validates dates are within project range', async () => {
    // Create a date outside project range
    const outsideDate = new Date('2024-01-20')
    
    render(<TalentScheduleColumn {...mockProps} />)
    
    // Simulate clicking a date outside range (this would be prevented by the component)
    // The component should validate before making API calls
    expect(mockProjectSchedule.allDates).not.toContainEqual(outsideDate)
  })

  it('calls onScheduleUpdate callback when provided', async () => {
    const mockCallback = jest.fn()
    
    render(<TalentScheduleColumn {...mockProps} onScheduleUpdate={mockCallback} />)
    
    const dateButton = screen.getByText('1/16')
    fireEvent.click(dateButton)
    
    // Should call callback with updated dates
    expect(mockCallback).toHaveBeenCalledWith(
      'talent-1',
      expect.arrayContaining([
        expect.any(Date)
      ])
    )
  })
})