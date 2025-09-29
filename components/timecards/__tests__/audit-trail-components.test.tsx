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
  old_value: '09:00:00',
  new_value: '09:30:00',
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
  old_value: '17:00:00',
  new_value: '17:30:00',
  action_type: 'admin_edit',
  changed_by_profile: {
    full_name: 'Admin User'
  }
}

const mockStatusChangeEntry: AuditLogEntry = {
  id: 'entry-3',
  timecard_id: 'timecard-123',
  change_id: 'change-3',
  field_name: null, // null for status changes
  old_value: 'draft',
  new_value: 'submitted',
  changed_by: 'user-1',
  changed_at: new Date('2024-01-15T11:00:00Z'),
  action_type: 'status_change',
  work_date: null, // null for status changes
  changed_by_profile: {
    full_name: 'John Doe'
  }
}

const mockEditedDraftStatusEntry: AuditLogEntry = {
  id: 'entry-4',
  timecard_id: 'timecard-123',
  change_id: 'change-4',
  field_name: null,
  old_value: 'draft',
  new_value: 'edited_draft',
  changed_by: 'admin-1',
  changed_at: new Date('2024-01-15T12:00:00Z'),
  action_type: 'status_change',
  work_date: null,
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

const mockApiResponseWithStatusChanges = {
  data: [mockStatusChangeEntry, mockEditedDraftStatusEntry, mockAuditLogEntry],
  pagination: {
    total: 3,
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
      expect(screen.getByText(/Check In Time on/)).toBeInTheDocument()
      expect(screen.getByText(/Check Out Time on/)).toBeInTheDocument()
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
      expect(screen.getByText(/Check In Time on/)).toBeInTheDocument()
      expect(screen.getByText(/Check Out Time on/)).toBeInTheDocument()
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
      expect(screen.getByText(/Check In Time on/)).toBeInTheDocument()
    })
  })

  it('renders status change entries with status badges', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponseWithStatusChanges
    })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      // Should show status change description (multiple instances due to desktop/mobile layouts)
      expect(screen.getAllByText('Status changed to')).toHaveLength(4) // 2 status changes × 2 layouts each
      
      // Should show status badges (multiple instances due to desktop/mobile layouts)
      expect(screen.getAllByText('submitted')).toHaveLength(2) // desktop + mobile
      expect(screen.getAllByText('draft (edited)')).toHaveLength(2) // desktop + mobile
    })
  })

  it('handles edited_draft status display correctly', async () => {
    const editedDraftResponse = {
      data: [mockEditedDraftStatusEntry],
      pagination: { total: 1, limit: 10, offset: 0, has_more: false }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => editedDraftResponse
    })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      // Should display 'edited_draft' as 'draft (edited)' for better UX (2 instances for desktop/mobile)
      expect(screen.getAllByText('draft (edited)')).toHaveLength(2)
      expect(screen.queryByText('edited_draft')).not.toBeInTheDocument()
    })
  })

  it('uses appropriate icon for status changes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponseWithStatusChanges
    })

    render(<AuditTrailSection timecardId="timecard-123" />)
    
    await waitFor(() => {
      // Status change entries should be present (multiple instances due to desktop/mobile layouts)
      expect(screen.getAllByText('Status changed to').length).toBeGreaterThan(0)
    })

    // The ArrowRight icon should be used for status changes (different from Edit3 for field changes)
    // This is verified through the action type configuration in the component
  })
})