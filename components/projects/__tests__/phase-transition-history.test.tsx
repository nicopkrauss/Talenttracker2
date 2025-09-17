import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PhaseTransitionHistory } from '../phase-transition-history'
import { useToast } from '@/hooks/use-toast'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

const mockToast = jest.fn()
;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })

const mockHistoryData = {
  projectId: 'project-1',
  history: [
    {
      id: 'transition-1',
      transitionedAt: '2024-01-15T10:30:00Z',
      transitionedBy: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com'
      },
      fromPhase: 'prep',
      toPhase: 'staffing',
      trigger: 'automatic',
      reason: 'All preparation tasks completed',
      metadata: {
        completedTasks: ['roles', 'locations', 'basic_info']
      }
    },
    {
      id: 'transition-2',
      transitionedAt: '2024-01-10T14:15:00Z',
      transitionedBy: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com'
      },
      fromPhase: 'staffing',
      toPhase: 'active',
      trigger: 'manual',
      reason: 'Manual override by project manager',
      metadata: {
        override_reason: 'Early start requested'
      }
    }
  ],
  totalTransitions: 2
}

describe('PhaseTransitionHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('renders loading state initially', () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<PhaseTransitionHistory projectId="project-1" />)
    
    expect(screen.getByText('Phase Transition History')).toBeInTheDocument()
    expect(screen.getByRole('generic', { name: /loading/i })).toBeInTheDocument()
  })

  it('renders empty state when no transitions exist', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          projectId: 'project-1',
          history: [],
          totalTransitions: 0
        }
      })
    })

    render(<PhaseTransitionHistory projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('No Phase Transitions Yet')).toBeInTheDocument()
    })

    expect(screen.getByText('Phase transitions will appear here as your project progresses through its lifecycle.')).toBeInTheDocument()
  })

  it('renders transition history correctly', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    })

    render(<PhaseTransitionHistory projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('2 transitions')).toBeInTheDocument()
    })

    // Check first transition
    expect(screen.getByText('Preparation')).toBeInTheDocument()
    expect(screen.getByText('Staffing')).toBeInTheDocument()
    expect(screen.getByText('Automatic')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('"All preparation tasks completed"')).toBeInTheDocument()

    // Check second transition
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Manual Override')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('"Manual override by project manager"')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch history' })
    })

    render(<PhaseTransitionHistory projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch history')).toBeInTheDocument()
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to fetch history',
      variant: 'destructive'
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('refreshes data when refresh button is clicked', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockHistoryData })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ...mockHistoryData, totalTransitions: 3 } })
      })

    const onRefresh = jest.fn()
    render(<PhaseTransitionHistory projectId="project-1" onRefresh={onRefresh} />)

    await waitFor(() => {
      expect(screen.getByText('2 transitions')).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText('3 transitions')).toBeInTheDocument()
    })

    expect(onRefresh).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('expands metadata details when clicked', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    })

    render(<PhaseTransitionHistory projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('2 transitions')).toBeInTheDocument()
    })

    const detailsButton = screen.getAllByText('View details')[0]
    fireEvent.click(detailsButton)

    await waitFor(() => {
      expect(screen.getByText('"completedTasks"')).toBeInTheDocument()
    })
  })

  it('formats dates and times correctly', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    })

    render(<PhaseTransitionHistory projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('2 transitions')).toBeInTheDocument()
    })

    // Check that dates are formatted (exact format may vary by locale)
    expect(screen.getByText(/1\/15\/2024|15\/1\/2024|2024-01-15/)).toBeInTheDocument()
    expect(screen.getByText(/1\/10\/2024|10\/1\/2024|2024-01-10/)).toBeInTheDocument()
  })

  it('displays phase badges with correct colors', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    })

    render(<PhaseTransitionHistory projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('2 transitions')).toBeInTheDocument()
    })

    const prepBadge = screen.getByText('Preparation')
    const staffingBadge = screen.getByText('Staffing')
    const activeBadge = screen.getByText('Active')

    expect(prepBadge).toHaveClass('bg-blue-100', 'text-blue-800')
    expect(staffingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
    expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('displays trigger badges with correct colors', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    })

    render(<PhaseTransitionHistory projectId="project-1" />)

    await waitFor(() => {
      expect(screen.getByText('2 transitions')).toBeInTheDocument()
    })

    const automaticBadge = screen.getByText('Automatic')
    const manualBadge = screen.getByText('Manual Override')

    expect(automaticBadge).toHaveClass('bg-green-100', 'text-green-800')
    expect(manualBadge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('calls onRefresh callback when provided', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    })

    const onRefresh = jest.fn()
    render(<PhaseTransitionHistory projectId="project-1" onRefresh={onRefresh} />)

    await waitFor(() => {
      expect(screen.getByText('2 transitions')).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled()
    })
  })
})