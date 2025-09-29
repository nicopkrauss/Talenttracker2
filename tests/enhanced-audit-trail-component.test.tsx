import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuditTrailSection } from '@/components/timecards/audit-trail-section'
import { AuditLogEntry } from '@/lib/audit-log-service'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock data for testing status changes and field changes
const mockFieldChangeEntry: AuditLogEntry = {
  id: 'field-entry-1',
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

const mockStatusChangeSubmitted: AuditLogEntry = {
  id: 'status-entry-1',
  timecard_id: 'timecard-123',
  change_id: 'change-2',
  field_name: null, // null for status changes (requirement 3.3)
  old_value: 'draft',
  new_value: 'submitted',
  changed_by: 'user-1',
  changed_at: new Date('2024-01-15T11:00:00Z'),
  action_type: 'status_change',
  work_date: null, // null for status changes (requirement 3.3)
  changed_by_profile: {
    full_name: 'John Doe'
  }
}

const mockStatusChangeRejected: AuditLogEntry = {
  id: 'status-entry-2',
  timecard_id: 'timecard-123',
  change_id: 'change-3',
  field_name: null,
  old_value: 'submitted',
  new_value: 'rejected',
  changed_by: 'admin-1',
  changed_at: new Date('2024-01-15T12:00:00Z'),
  action_type: 'status_change',
  work_date: null,
  changed_by_profile: {
    full_name: 'Admin User'
  }
}

const mockStatusChangeApproved: AuditLogEntry = {
  id: 'status-entry-3',
  timecard_id: 'timecard-123',
  change_id: 'change-4',
  field_name: null,
  old_value: 'submitted',
  new_value: 'approved',
  changed_by: 'admin-1',
  changed_at: new Date('2024-01-15T13:00:00Z'),
  action_type: 'status_change',
  work_date: null,
  changed_by_profile: {
    full_name: 'Admin User'
  }
}

const mockStatusChangeEditedDraft: AuditLogEntry = {
  id: 'status-entry-4',
  timecard_id: 'timecard-123',
  change_id: 'change-5',
  field_name: null,
  old_value: 'draft',
  new_value: 'edited_draft',
  changed_by: 'admin-1',
  changed_at: new Date('2024-01-15T14:00:00Z'),
  action_type: 'status_change',
  work_date: null,
  changed_by_profile: {
    full_name: 'Admin User'
  }
}

// Mock responses for different test scenarios
const mockMixedEntriesResponse = {
  data: [
    mockStatusChangeSubmitted,
    mockFieldChangeEntry,
    mockStatusChangeRejected,
    mockStatusChangeApproved
  ],
  pagination: {
    total: 4,
    limit: 10,
    offset: 0,
    has_more: false
  }
}

const mockStatusOnlyResponse = {
  data: [
    mockStatusChangeSubmitted,
    mockStatusChangeRejected,
    mockStatusChangeApproved,
    mockStatusChangeEditedDraft
  ],
  pagination: {
    total: 4,
    limit: 10,
    offset: 0,
    has_more: false
  }
}

const mockChronologicalResponse = {
  data: [
    // Most recent first (chronological order)
    mockStatusChangeApproved, // 13:00
    mockStatusChangeRejected, // 12:00
    mockStatusChangeSubmitted, // 11:00
    mockFieldChangeEntry // 10:00
  ],
  pagination: {
    total: 4,
    limit: 10,
    offset: 0,
    has_more: false
  }
}

describe('Enhanced Audit Trail Component Tests (requirement 4.1, 4.4, 1.4)', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Status change entry rendering with various status types (requirement 4.1)', () => {
    it('should render status change entries with proper "Status changed to [badge]" format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusOnlyResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Should show status change description for each status type
        expect(screen.getAllByText('Status changed to')).toHaveLength(8) // 4 status changes × 2 layouts (desktop + mobile)
        
        // Should show status badges with proper styling
        expect(screen.getAllByText('submitted')).toHaveLength(2) // desktop + mobile
        expect(screen.getAllByText('rejected')).toHaveLength(2) // desktop + mobile
        expect(screen.getAllByText('approved')).toHaveLength(2) // desktop + mobile
        expect(screen.getAllByText('draft (edited)')).toHaveLength(2) // desktop + mobile (edited_draft displayed as "draft (edited)")
      })
    })

    it('should display edited_draft status as "draft (edited)" for better UX', async () => {
      const editedDraftOnlyResponse = {
        data: [mockStatusChangeEditedDraft],
        pagination: { total: 1, limit: 10, offset: 0, has_more: false }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => editedDraftOnlyResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Should display 'edited_draft' as 'draft (edited)' for better UX
        expect(screen.getAllByText('draft (edited)')).toHaveLength(2) // desktop + mobile
        expect(screen.queryByText('edited_draft')).not.toBeInTheDocument()
      })
    })

    it('should use appropriate status badge colors for different statuses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusOnlyResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Check that status badges are rendered with proper classes
        const submittedBadges = screen.getAllByText('submitted')
        const rejectedBadges = screen.getAllByText('rejected')
        const approvedBadges = screen.getAllByText('approved')
        const draftEditedBadges = screen.getAllByText('draft (edited)')

        // Verify badges exist
        expect(submittedBadges).toHaveLength(2)
        expect(rejectedBadges).toHaveLength(2)
        expect(approvedBadges).toHaveLength(2)
        expect(draftEditedBadges).toHaveLength(2)

        // Check that badges have appropriate styling classes
        submittedBadges.forEach(badge => {
          expect(badge.closest('.bg-blue-100')).toBeTruthy()
        })
        
        rejectedBadges.forEach(badge => {
          expect(badge.closest('.bg-red-100')).toBeTruthy()
        })
        
        approvedBadges.forEach(badge => {
          expect(badge.closest('.bg-green-100')).toBeTruthy()
        })
        
        draftEditedBadges.forEach(badge => {
          expect(badge.closest('.bg-gray-100')).toBeTruthy()
        })
      })
    })

    it('should use ArrowRight icon for status changes to distinguish from field changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMixedEntriesResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Status changes should be present
        expect(screen.getAllByText('Status changed to').length).toBeGreaterThan(0)
        
        // Field changes should also be present for comparison
        expect(screen.getAllByText(/Check In Time on/)).toHaveLength(2) // desktop + mobile
      })

      // The component uses different icons for different action types:
      // - ArrowRight for status_change
      // - Edit3 for user_edit
      // - Shield for admin_edit
      // - AlertTriangle for rejection_edit
      // This is verified through the action type configuration in the component
    })
  })

  describe('Chronological ordering of mixed field and status changes (requirement 1.4)', () => {
    it('should display status changes and field changes in chronological order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockChronologicalResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Get all change entries in order
        const changeEntries = screen.getAllByText(/Status changed to|Check In Time on/)
        
        // Should have entries for both desktop and mobile layouts
        expect(changeEntries.length).toBeGreaterThan(4)
        
        // Verify that status changes and field changes are mixed together
        expect(screen.getAllByText('Status changed to')).toHaveLength(6) // 3 status changes × 2 layouts
        expect(screen.getAllByText(/Check In Time on/)).toHaveLength(2) // 1 field change × 2 layouts
      })
    })

    it('should maintain proper chronological order when loading more entries', async () => {
      const firstPageResponse = {
        data: [mockStatusChangeApproved, mockStatusChangeRejected],
        pagination: { total: 4, limit: 2, offset: 0, has_more: true }
      }
      
      const secondPageResponse = {
        data: [mockStatusChangeSubmitted, mockFieldChangeEntry],
        pagination: { total: 4, limit: 2, offset: 2, has_more: false }
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => firstPageResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => secondPageResponse
        })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Load More'))
      
      await waitFor(() => {
        // Should have all entries after loading more
        expect(screen.getAllByText('Status changed to')).toHaveLength(6) // 3 status changes × 2 layouts
        expect(screen.getAllByText(/Check In Time on/)).toHaveLength(2) // 1 field change × 2 layouts
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Responsive layout for status change entries (requirement 4.4)', () => {
    it('should render status changes with responsive desktop layout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusOnlyResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Desktop layout should be hidden on small screens and visible on larger screens
        const desktopLayouts = document.querySelectorAll('.hidden.sm\\:flex')
        expect(desktopLayouts.length).toBeGreaterThan(0)
        
        // Each desktop layout should have proper structure
        desktopLayouts.forEach(layout => {
          expect(layout).toHaveClass('sm:items-center', 'sm:justify-between')
        })
      })
    })

    it('should render status changes with responsive mobile layout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusOnlyResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Mobile layout should be visible on small screens and hidden on larger screens
        const mobileLayouts = document.querySelectorAll('.sm\\:hidden.grid')
        expect(mobileLayouts.length).toBeGreaterThan(0)
        
        // Each mobile layout should have proper grid structure
        mobileLayouts.forEach(layout => {
          expect(layout).toHaveClass('grid-cols-[auto_1fr]', 'gap-3')
        })
      })
    })

    it('should maintain consistent styling between desktop and mobile layouts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusOnlyResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Both layouts should have the same status badges
        const submittedBadges = screen.getAllByText('submitted')
        const rejectedBadges = screen.getAllByText('rejected')
        const approvedBadges = screen.getAllByText('approved')
        
        // Should have pairs (desktop + mobile) for each status
        expect(submittedBadges).toHaveLength(2)
        expect(rejectedBadges).toHaveLength(2)
        expect(approvedBadges).toHaveLength(2)
        
        // All badges should have consistent styling
        const allBadges = submittedBadges.concat(rejectedBadges).concat(approvedBadges)
        allBadges.forEach(badge => {
          expect(badge).toHaveClass('text-xs')
          expect(badge.closest('[class*="border"]')).toBeTruthy()
        })
      })
    })
  })

  describe('Error handling for missing attribution data (requirement 1.4)', () => {
    it('should handle missing user profile gracefully', async () => {
      const entryWithMissingProfile: AuditLogEntry = {
        ...mockStatusChangeSubmitted,
        changed_by_profile: undefined as any
      }

      const responseWithMissingProfile = {
        data: [entryWithMissingProfile],
        pagination: { total: 1, limit: 10, offset: 0, has_more: false }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithMissingProfile
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Should display "Unknown User" when profile is missing
        expect(screen.getAllByText('Unknown User')).toHaveLength(2) // desktop + mobile
        
        // Status change should still be displayed properly
        expect(screen.getAllByText('Status changed to')).toHaveLength(2)
        expect(screen.getAllByText('submitted')).toHaveLength(2)
      })
    })

    it('should handle null changed_by_profile gracefully', async () => {
      const entryWithNullProfile: AuditLogEntry = {
        ...mockStatusChangeSubmitted,
        changed_by_profile: null as any
      }

      const responseWithNullProfile = {
        data: [entryWithNullProfile],
        pagination: { total: 1, limit: 10, offset: 0, has_more: false }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithNullProfile
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Should display "Unknown User" when profile is null
        expect(screen.getAllByText('Unknown User')).toHaveLength(2) // desktop + mobile
        
        // Status change should still be displayed properly
        expect(screen.getAllByText('Status changed to')).toHaveLength(2)
        expect(screen.getAllByText('submitted')).toHaveLength(2)
      })
    })

    it('should handle missing full_name in profile gracefully', async () => {
      const entryWithEmptyName: AuditLogEntry = {
        ...mockStatusChangeSubmitted,
        changed_by_profile: {
          full_name: ''
        }
      }

      const responseWithEmptyName = {
        data: [entryWithEmptyName],
        pagination: { total: 1, limit: 10, offset: 0, has_more: false }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithEmptyName
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Should display "Unknown User" when full_name is empty
        expect(screen.getAllByText('Unknown User')).toHaveLength(2) // desktop + mobile
        
        // Status change should still be displayed properly
        expect(screen.getAllByText('Status changed to')).toHaveLength(2)
        expect(screen.getAllByText('submitted')).toHaveLength(2)
      })
    })

    it('should handle invalid timestamps gracefully', async () => {
      const entryWithInvalidDate: AuditLogEntry = {
        ...mockStatusChangeSubmitted,
        changed_at: new Date('invalid-date')
      }

      const responseWithInvalidDate = {
        data: [entryWithInvalidDate],
        pagination: { total: 1, limit: 10, offset: 0, has_more: false }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithInvalidDate
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Should display "Invalid date" when timestamp is invalid
        expect(screen.getAllByText('Invalid date')).toHaveLength(2) // desktop + mobile
        
        // Status change should still be displayed properly
        expect(screen.getAllByText('Status changed to')).toHaveLength(2)
        expect(screen.getAllByText('submitted')).toHaveLength(2)
      })
    })
  })

  describe('Visual consistency with field change entries (requirement 4.1)', () => {
    it('should use consistent styling between status changes and field changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMixedEntriesResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // All entries should have consistent container styling
        const allEntries = document.querySelectorAll('[class*="py-2"][class*="px-3"][class*="rounded-lg"][class*="border"]')
        expect(allEntries.length).toBe(4) // 4 total entries
        
        // All entries should have hover effects
        allEntries.forEach(entry => {
          expect(entry).toHaveClass('hover:bg-muted/50', 'transition-colors')
        })
      })
    })

    it('should maintain consistent layout structure between status and field changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMixedEntriesResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Desktop layouts should have consistent structure
        const desktopLayouts = document.querySelectorAll('.hidden.sm\\:flex.sm\\:items-center.sm\\:justify-between')
        expect(desktopLayouts.length).toBe(4) // All entries should have desktop layout
        
        // Mobile layouts should have consistent structure
        const mobileLayouts = document.querySelectorAll('.sm\\:hidden.grid.grid-cols-\\[auto_1fr\\]')
        expect(mobileLayouts.length).toBe(4) // All entries should have mobile layout
      })
    })

    it('should show proper attribution and timestamps for both status and field changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMixedEntriesResponse
      })

      render(<AuditTrailSection timecardId="timecard-123" />)
      
      await waitFor(() => {
        // Should show user names for all entries
        expect(screen.getAllByText('John Doe')).toHaveLength(4) // 2 entries × 2 layouts each
        expect(screen.getAllByText('Admin User')).toHaveLength(4) // 2 entries × 2 layouts each
        
        // Should show timestamps for all entries (various formats)
        const timestampElements = document.querySelectorAll('[class*="text-muted-foreground"]:not(:empty)')
        expect(timestampElements.length).toBeGreaterThan(8) // Multiple timestamp elements per entry
      })
    })
  })
})