import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TimeTrackingActionBar } from '../time-tracking-action-bar'

// Mock the useTimeTracking hook
vi.mock('@/hooks/use-time-tracking', () => ({
  useTimeTracking: vi.fn()
}))

// Import the mocked hook after mocking
import { useTimeTracking } from '@/hooks/use-time-tracking'
const mockUseTimeTracking = vi.mocked(useTimeTracking)

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`button ${variant} ${className}`}
      data-testid="action-button"
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={`card ${className}`} data-testid="action-bar-card">
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={`card-content ${className}`}>
      {children}
    </div>
  )
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="status-badge">
      {children}
    </span>
  )
}))

vi.mock('lucide-react', () => ({
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>,
  CheckCircle: () => <span data-testid="check-icon">Check</span>
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

vi.mock('@/lib/types', () => ({
  ProjectRole: {}
}))

describe('TimeTrackingActionBar', () => {
  const defaultProps = {
    projectId: 'test-project-id',
    userRole: 'talent_escort' as const,
    scheduledStartTime: '9:00 AM',
    projectName: 'Test Project'
  }

  const mockTimeTrackingReturn = {
    currentState: {
      status: 'checked_out' as const,
      nextAction: 'check_in' as const,
      contextInfo: 'Shift starts at 9:00 AM'
    },
    contextInfo: 'Shift starts at 9:00 AM',
    checkIn: vi.fn(),
    startBreak: vi.fn(),
    endBreak: vi.fn(),
    checkOut: vi.fn(),
    loading: false,
    error: null,
    shiftDuration: 0,
    isOvertime: false,
    timecardRecord: null,
    refreshState: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTimeTracking.mockReturnValue(mockTimeTrackingReturn)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders the action bar with project name', () => {
      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByTestId('action-bar-card')).toBeInTheDocument()
    })

    it('hides project name when showProjectName is false', () => {
      render(<TimeTrackingActionBar {...defaultProps} showProjectName={false} />)
      
      expect(screen.queryByText('Test Project')).not.toBeInTheDocument()
    })

    it('applies compact styling when compact prop is true', () => {
      render(<TimeTrackingActionBar {...defaultProps} compact />)
      
      const cardContent = screen.getByTestId('action-bar-card').querySelector('.card-content')
      expect(cardContent).toHaveClass('p-3')
    })

    it('applies custom className', () => {
      render(<TimeTrackingActionBar {...defaultProps} className="custom-class" />)
      
      expect(screen.getByTestId('action-bar-card')).toHaveClass('custom-class')
    })
  })

  describe('State Machine Button Behavior', () => {
    it('shows "Check In" button when checked out', () => {
      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByTestId('action-button')).toHaveTextContent('Check In')
      expect(screen.getByText('Shift starts at 9:00 AM')).toBeInTheDocument()
    })

    it('shows "Start My Break" button when checked in', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'checked_in',
          nextAction: 'start_break',
          contextInfo: 'Break expected to start at 10:30 AM'
        },
        contextInfo: 'Break expected to start at 10:30 AM',
        shiftDuration: 1.5
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByTestId('action-button')).toHaveTextContent('Start My Break')
      expect(screen.getByText('Break expected to start at 10:30 AM')).toBeInTheDocument()
      expect(screen.getByText('Shift: 1h 30m')).toBeInTheDocument()
    })

    it('shows "End My Break" button when on break', () => {
      const breakStartTime = new Date('2024-01-01T10:30:00Z')
      
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'on_break',
          nextAction: 'end_break',
          contextInfo: 'Break ends at 11:00 AM (15 min remaining)',
          canEndBreak: false,
          breakStartTime
        },
        contextInfo: 'Break ends at 11:00 AM (15 min remaining)',
        shiftDuration: 2
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByTestId('action-button')).toHaveTextContent('End My Break')
      expect(screen.getByText('Break ends at 11:00 AM (15 min remaining)')).toBeInTheDocument()
      expect(screen.getByTestId('status-badge')).toHaveTextContent('On Break')
    })

    it('shows "Check Out" button for supervisors after break', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'break_ended',
          nextAction: 'check_out',
          contextInfo: 'Expected check out at 6:00 PM'
        },
        contextInfo: 'Expected check out at 6:00 PM',
        shiftDuration: 8
      })

      render(<TimeTrackingActionBar {...defaultProps} userRole="supervisor" />)
      
      expect(screen.getByTestId('action-button')).toHaveTextContent('Check Out')
      expect(screen.getByText('Expected check out at 6:00 PM')).toBeInTheDocument()
    })

    it('hides button for escorts after break (complete state)', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'break_ended',
          nextAction: 'complete',
          contextInfo: 'Break completed - checkout handled by supervisor'
        },
        contextInfo: 'Break completed - checkout handled by supervisor',
        shiftDuration: 4
      })

      render(<TimeTrackingActionBar {...defaultProps} userRole="talent_escort" />)
      
      expect(screen.queryByTestId('action-button')).not.toBeInTheDocument()
      expect(screen.getByText('Break completed - checkout handled by supervisor')).toBeInTheDocument()
    })
  })

  describe('Button Actions', () => {
    it('calls checkIn when Check In button is clicked', async () => {
      const checkInMock = vi.fn()
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        checkIn: checkInMock
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      fireEvent.click(screen.getByTestId('action-button'))
      
      expect(checkInMock).toHaveBeenCalledOnce()
    })

    it('calls startBreak when Start My Break button is clicked', async () => {
      const startBreakMock = vi.fn()
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'checked_in',
          nextAction: 'start_break',
          contextInfo: 'Break expected to start at 10:30 AM'
        },
        startBreak: startBreakMock
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      fireEvent.click(screen.getByTestId('action-button'))
      
      expect(startBreakMock).toHaveBeenCalledOnce()
    })

    it('calls endBreak when End My Break button is clicked', async () => {
      const endBreakMock = vi.fn()
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'on_break',
          nextAction: 'end_break',
          contextInfo: 'Break can be ended (30 min minimum met)',
          canEndBreak: true,
          breakStartTime: new Date('2024-01-01T10:30:00Z')
        },
        endBreak: endBreakMock
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      fireEvent.click(screen.getByTestId('action-button'))
      
      expect(endBreakMock).toHaveBeenCalledOnce()
    })

    it('calls checkOut when Check Out button is clicked', async () => {
      const checkOutMock = vi.fn()
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'break_ended',
          nextAction: 'check_out',
          contextInfo: 'Expected check out at 6:00 PM'
        },
        checkOut: checkOutMock
      })

      render(<TimeTrackingActionBar {...defaultProps} userRole="supervisor" />)
      
      fireEvent.click(screen.getByTestId('action-button'))
      
      expect(checkOutMock).toHaveBeenCalledOnce()
    })
  })

  describe('Button State Management', () => {
    it('disables button when loading', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        loading: true
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByTestId('action-button')).toBeDisabled()
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    it('disables End My Break button when canEndBreak is false', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'on_break',
          nextAction: 'end_break',
          contextInfo: 'Break ends at 11:00 AM (15 min remaining)',
          canEndBreak: false,
          breakStartTime: new Date('2024-01-01T10:30:00Z')
        }
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByTestId('action-button')).toBeDisabled()
    })

    it('enables End My Break button when canEndBreak is true', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'on_break',
          nextAction: 'end_break',
          contextInfo: 'Break can be ended (30 min minimum met)',
          canEndBreak: true,
          breakStartTime: new Date('2024-01-01T10:30:00Z')
        }
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByTestId('action-button')).not.toBeDisabled()
    })
  })

  describe('Status Indicators and Overtime Warnings', () => {
    it('shows overtime warning when isOvertime is true', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        isOvertime: true,
        shiftDuration: 13
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('Overtime')
      expect(badge).toHaveClass('destructive')
      
      const button = screen.getByTestId('action-button')
      expect(button).toHaveClass('destructive')
    })

    it('shows active status when checked in', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'checked_in',
          nextAction: 'start_break',
          contextInfo: 'Break expected to start at 10:30 AM'
        },
        shiftDuration: 2
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('Active')
    })

    it('shows on break status when on break', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'on_break',
          nextAction: 'end_break',
          contextInfo: 'Break ends at 11:00 AM (15 min remaining)',
          breakStartTime: new Date('2024-01-01T10:30:00Z')
        }
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('On Break')
      expect(badge).toHaveClass('secondary')
    })
  })

  describe('Break Timer Display', () => {
    it('shows break timer when on break', () => {
      // Mock current time to be 15 minutes after break start
      const breakStartTime = new Date('2024-01-01T10:30:00Z')
      const currentTime = new Date('2024-01-01T10:45:00Z')
      
      vi.spyOn(global, 'Date').mockImplementation(() => currentTime as any)
      
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'on_break',
          nextAction: 'end_break',
          contextInfo: 'Break ends at 11:00 AM (15 min remaining)',
          breakStartTime
        }
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByText('Break: 15 minutes')).toBeInTheDocument()
      expect(screen.getAllByTestId('clock-icon')).toHaveLength(2) // One in badge, one in timer
      
      vi.restoreAllMocks()
    })

    it('does not show break timer when not on break', () => {
      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.queryByText(/Break:/)).not.toBeInTheDocument()
    })
  })

  describe('Shift Duration Display', () => {
    it('formats shift duration correctly for hours and minutes', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        shiftDuration: 2.75 // 2 hours 45 minutes
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByText('Shift: 2h 45m')).toBeInTheDocument()
    })

    it('formats shift duration correctly for whole hours', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        shiftDuration: 3 // 3 hours exactly
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByText('Shift: 3h')).toBeInTheDocument()
    })

    it('formats shift duration correctly for minutes only', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        shiftDuration: 0.5 // 30 minutes
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByText('Shift: 30m')).toBeInTheDocument()
    })

    it('does not show shift duration when zero', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        shiftDuration: 0
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.queryByText(/Shift:/)).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when error occurs', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        error: 'Failed to connect to server'
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByText('Failed to connect to server')).toBeInTheDocument()
    })

    it('does not display error message when no error', () => {
      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.queryByText(/Failed/)).not.toBeInTheDocument()
    })
  })

  describe('Contextual Information Display', () => {
    it('displays contextual information below button', () => {
      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByText('Shift starts at 9:00 AM')).toBeInTheDocument()
    })

    it('updates contextual information based on state', () => {
      mockUseTimeTracking.mockReturnValue({
        ...mockTimeTrackingReturn,
        currentState: {
          status: 'checked_in',
          nextAction: 'start_break',
          contextInfo: 'Break expected to start at 10:30 AM'
        },
        contextInfo: 'Break expected to start at 10:30 AM'
      })

      render(<TimeTrackingActionBar {...defaultProps} />)
      
      expect(screen.getByText('Break expected to start at 10:30 AM')).toBeInTheDocument()
    })
  })

  describe('Role-Based Behavior', () => {
    it('handles talent escort role correctly', () => {
      render(<TimeTrackingActionBar {...defaultProps} userRole="talent_escort" />)
      
      expect(mockUseTimeTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: 'talent_escort'
        })
      )
    })

    it('handles supervisor role correctly', () => {
      render(<TimeTrackingActionBar {...defaultProps} userRole="supervisor" />)
      
      expect(mockUseTimeTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: 'supervisor'
        })
      )
    })

    it('handles coordinator role correctly', () => {
      render(<TimeTrackingActionBar {...defaultProps} userRole="coordinator" />)
      
      expect(mockUseTimeTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: 'coordinator'
        })
      )
    })
  })

  describe('Callback Integration', () => {
    it('passes onStateChange callback to hook', () => {
      const onStateChange = vi.fn()
      
      render(<TimeTrackingActionBar {...defaultProps} onStateChange={onStateChange} />)
      
      expect(mockUseTimeTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          onStateChange
        })
      )
    })

    it('passes onShiftLimitExceeded callback to hook', () => {
      const onShiftLimitExceeded = vi.fn()
      
      render(<TimeTrackingActionBar {...defaultProps} onShiftLimitExceeded={onShiftLimitExceeded} />)
      
      expect(mockUseTimeTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          onShiftLimitExceeded
        })
      )
    })
  })
})