import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuditTrailSection } from '../audit-trail-section'
import { AuditLogEntry } from '@/lib/audit-log-service'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock data
const mockAuditLogEntry: AuditLogEntry = {
  id: 'entry-1',
  timecard_id: 'timecard-123',
  change_id: 'change-1',
  field_name: 'check_in_time',
  old_value: '2024-01-15T09:00:00Z',
  new_value: '2024-01-15T09:30:00Z',
  changed_by: 'user-1',
  changed_at: new Date('2024-01-15T10:00:00Z'),
  action_type: 'user_edit',
  work_date: new Date('2024-01-15'),
  changed_by_profile: {
    full_name: 'John Doe'
  }
}

const mockSecondAuditLogEntry: AuditLogEntry = {
  ...mockAuditLogEntry,
  id: 'entry-2',
  field_name: 'check_out_time',
  old_value: '2024-01-15T17:00:00Z',
  new_value: '2024-01-15T17:30:00Z',
  action_type: 'admin_edit',
  changed_by_profile: {
    full_name: 'Admin User'
  }
}

const mockApiResponse = {
  data: [mockAuditLogEntry, mockSecondAuditLogEntry],
  pagination: {
    total: 2,
    limit: 10,
    offset: 0,
    has_more: false
  }
}



describe('AuditTrailSection', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<AuditTrailSection timecardId="timecard-123" />)
    
    expect(screen.getByText('Change Log')).toBeInTheDocument()
    // Should show loading skeletons immediately
    expect(screen.getAllByRole('generic')).toHaveLength(30) // 3 skeleton rows × 10 skeleton elements each
  })

  it('fetches and displays audit logs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      expect(screen.getByText('Check In Time on Jan 15')).toBeInTheDocument()
      expect(screen.getByText('Check Out Time on Jan 15')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/timecards/timecard-123/audit-logs?limit=10&offset=0&grouped=false'
    )
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch' })
    })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load change log/)).toBeInTheDocument()
    })

    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('shows empty state when no audit logs exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { total: 0, limit: 10, offset: 0, has_more: false }
      })
    })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      expect(screen.getByText('No changes recorded for this timecard')).toBeInTheDocument()
    })
  })

  it('displays individual field changes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      expect(screen.getByText('Check In Time on Jan 15')).toBeInTheDocument()
      expect(screen.getByText('Check Out Time on Jan 15')).toBeInTheDocument()
    })

    // Should show individual field changes, not grouped
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/timecards/timecard-123/audit-logs?limit=10&offset=0&grouped=false'
    )
  })

  it('loads more entries when pagination available', async () => {
    const firstResponse = {
      data: [mockAuditLogEntry],
      pagination: { total: 2, limit: 1, offset: 0, has_more: true }
    }
    
    const secondResponse = {
      data: [mockSecondAuditLogEntry],
      pagination: { total: 2, limit: 1, offset: 1, has_more: false }
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondResponse
      })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Load More'))
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })



  it('retries failed requests', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Network error' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try Again'))
    
    await waitFor(() => {
      expect(screen.getByText('Check In Time on Jan 15')).toBeInTheDocument()
    })
  })
})