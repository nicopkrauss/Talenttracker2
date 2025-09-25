import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TimecardProjectHub } from '../timecard-project-hub'
import { useAuth } from '@/lib/auth-context'

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn()

describe('TimecardProjectHub Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'test@example.com' }
    })
  })

  it('integrates with the project statistics API correctly', async () => {
    const mockApiResponse = {
      data: [
        {
          projectId: '1',
          projectName: 'Integration Test Project',
          projectDescription: 'Test description',
          productionCompany: 'Test Company',
          totalTimecards: 3,
          statusBreakdown: {
            draft: 1,
            submitted: 1,
            approved: 1,
            rejected: 0
          },
          totalHours: 24,
          totalApprovedPay: 600,
          lastActivity: '2024-01-15T10:00:00Z'
        }
      ],
      count: 1,
      userRole: 'admin'
    }

    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    })

    const onSelectProject = vi.fn()
    
    render(
      <TimecardProjectHub 
        userRole="admin" 
        onSelectProject={onSelectProject} 
      />
    )

    // Verify API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/timecards/projects/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    // Verify project is rendered
    await waitFor(() => {
      expect(screen.getByText('Integration Test Project')).toBeInTheDocument()
    })

    // Verify statistics are displayed
    expect(screen.getByText('3 timecards')).toBeInTheDocument()
    expect(screen.getByText('24.0h')).toBeInTheDocument()
    expect(screen.getByText('$600')).toBeInTheDocument()
  })

  it('handles role-based filtering correctly', async () => {
    const mockApiResponse = {
      data: [],
      count: 0,
      userRole: 'talent_escort'
    }

    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    })

    render(
      <TimecardProjectHub 
        userRole="talent_escort" 
        onSelectProject={vi.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No timecard projects found')).toBeInTheDocument()
      expect(screen.getByText('You don\'t have any timecards yet. Projects will appear here once you start creating timecards for your assigned projects.')).toBeInTheDocument()
    })
  })

  it('passes the correct project ID when selecting a project', async () => {
    const mockApiResponse = {
      data: [
        {
          projectId: 'project-123',
          projectName: 'Test Project',
          totalTimecards: 1,
          statusBreakdown: { draft: 1, submitted: 0, approved: 0, rejected: 0 },
          totalHours: 8,
          totalApprovedPay: 0,
          lastActivity: '2024-01-15T10:00:00Z'
        }
      ],
      count: 1,
      userRole: 'admin'
    }

    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    })

    const onSelectProject = vi.fn()
    
    render(
      <TimecardProjectHub 
        userRole="admin" 
        onSelectProject={onSelectProject} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Find and click the "View Timecards" button
    const viewButton = screen.getByText('View Timecards')
    viewButton.click()

    expect(onSelectProject).toHaveBeenCalledWith('project-123')
  })
})