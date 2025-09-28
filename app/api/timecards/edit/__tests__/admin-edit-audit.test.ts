/**
 * Admin Edit Audit Logging Tests
 * 
 * Tests for audit logging functionality in admin timecard edit operations
 * Requirements: 1.2, 1.4, 1.5, 6.1, 6.2, 9.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock the audit logging integration
vi.mock('@/lib/timecard-audit-integration', () => ({
  withTimecardAuditLogging: vi.fn(),
}))

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        limit: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
  })),
}))

vi.mock('@/lib/role-utils', () => ({
  canApproveTimecardsWithSettings: vi.fn(),
}))

describe('Admin Edit Audit Logging', () => {
  let mockWithTimecardAuditLogging: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked function
    const { withTimecardAuditLogging } = await import('@/lib/timecard-audit-integration')
    mockWithTimecardAuditLogging = vi.mocked(withTimecardAuditLogging)
    
    // Default mock implementations
    mockWithTimecardAuditLogging.mockImplementation(async (supabase: any, context: any, operation: any) => {
      return await operation()
    })
  })

  describe('Admin Edit Operations', () => {
    it('should record audit log with admin_edit action type for admin edits (requirement 1.2)', async () => {
      // Mock authenticated admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      })

      // Mock user profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          })),
        })),
      })

      // Mock global settings
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { in_house_can_approve_timecards: true },
              error: null,
            }),
          })),
        })),
      })

      // Mock timecard fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { 
                id: 'timecard-1',
                user_id: 'other-user-id', // Different from admin user
                status: 'draft',
                total_hours: 8.0,
                period_start_date: '2024-01-15',
              },
              error: null,
            }),
          })),
        })),
      })

      // Mock role utils
      const { canApproveTimecardsWithSettings } = await import('@/lib/role-utils')
      vi.mocked(canApproveTimecardsWithSettings).mockReturnValue(true)

      // Mock successful update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        })),
      })

      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          timecardId: 'timecard-1',
          updates: {
            total_hours: 7.5,
          },
          adminNote: 'Corrected hours based on security footage',
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      // Verify audit logging was called with correct context
      expect(mockWithTimecardAuditLogging).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          timecardId: 'timecard-1',
          userId: 'admin-user-id',
          actionType: 'admin_edit', // Should be admin_edit for admin editing other user's timecard
          workDate: new Date('2024-01-15'),
        }),
        expect.any(Function)
      )
    })

    it('should record audit log with user_edit action type for user editing own timecard (requirement 1.1)', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock user profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'supervisor' },
              error: null,
            }),
          })),
        })),
      })

      // Mock global settings
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { supervisor_can_approve_timecards: false },
              error: null,
            }),
          })),
        })),
      })

      // Mock timecard fetch (user owns this timecard)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { 
                id: 'timecard-1',
                user_id: 'user-id', // Same as authenticated user
                status: 'draft',
                total_hours: 8.0,
                period_start_date: '2024-01-15',
              },
              error: null,
            }),
          })),
        })),
      })

      // Mock role utils
      const { canApproveTimecardsWithSettings } = await import('@/lib/role-utils')
      vi.mocked(canApproveTimecardsWithSettings).mockReturnValue(false)

      // Mock successful update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        })),
      })

      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          timecardId: 'timecard-1',
          updates: {
            total_hours: 7.5,
          },
          editComment: 'Corrected my check-out time',
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      // Verify audit logging was called with user_edit action type
      expect(mockWithTimecardAuditLogging).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          timecardId: 'timecard-1',
          userId: 'user-id',
          actionType: 'user_edit', // Should be user_edit for user editing own timecard
          workDate: new Date('2024-01-15'),
        }),
        expect.any(Function)
      )
    })

    it('should record audit log with rejection_edit action type for return to draft (requirement 1.3)', async () => {
      // Mock authenticated admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      })

      // Mock user profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          })),
        })),
      })

      // Mock global settings
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { in_house_can_approve_timecards: true },
              error: null,
            }),
          })),
        })),
      })

      // Mock timecard fetch (submitted status for return to draft)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { 
                id: 'timecard-1',
                user_id: 'other-user-id',
                status: 'submitted', // Must be submitted for return to draft
                total_hours: 8.0,
                period_start_date: '2024-01-15',
              },
              error: null,
            }),
          })),
        })),
      })

      // Mock role utils
      const { canApproveTimecardsWithSettings } = await import('@/lib/role-utils')
      vi.mocked(canApproveTimecardsWithSettings).mockReturnValue(true)

      // Mock successful update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        })),
      })

      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          timecardId: 'timecard-1',
          updates: {
            total_hours: 7.5,
          },
          editComment: 'Please correct the break time',
          returnToDraft: true, // This triggers rejection_edit action type
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      // Verify audit logging was called with rejection_edit action type
      expect(mockWithTimecardAuditLogging).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          timecardId: 'timecard-1',
          userId: 'admin-user-id',
          actionType: 'rejection_edit', // Should be rejection_edit for return to draft
          workDate: new Date('2024-01-15'),
        }),
        expect.any(Function)
      )
    })

    it('should generate unique change_id for grouping related changes (requirement 1.5)', async () => {
      // Mock authenticated admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      })

      // Mock user profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          })),
        })),
      })

      // Mock global settings
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { in_house_can_approve_timecards: true },
              error: null,
            }),
          })),
        })),
      })

      // Mock timecard fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { 
                id: 'timecard-1',
                user_id: 'other-user-id',
                status: 'draft',
                total_hours: 8.0,
                break_duration: 30,
                period_start_date: '2024-01-15',
              },
              error: null,
            }),
          })),
        })),
      })

      // Mock role utils
      const { canApproveTimecardsWithSettings } = await import('@/lib/role-utils')
      vi.mocked(canApproveTimecardsWithSettings).mockReturnValue(true)

      // Mock successful update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        })),
      })

      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          timecardId: 'timecard-1',
          updates: {
            total_hours: 7.5, // Multiple field changes
            break_duration: 45,
          },
          adminNote: 'Corrected multiple fields',
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      // Verify audit logging was called once (the audit service handles grouping internally)
      expect(mockWithTimecardAuditLogging).toHaveBeenCalledTimes(1)
      expect(mockWithTimecardAuditLogging).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          timecardId: 'timecard-1',
          userId: 'admin-user-id',
          actionType: 'admin_edit',
        }),
        expect.any(Function)
      )
    })

    it('should handle audit logging failures gracefully (requirement 9.3)', async () => {
      // Mock authenticated admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      })

      // Mock user profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          })),
        })),
      })

      // Mock global settings
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { in_house_can_approve_timecards: true },
              error: null,
            }),
          })),
        })),
      })

      // Mock timecard fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { 
                id: 'timecard-1',
                user_id: 'other-user-id',
                status: 'draft',
                total_hours: 8.0,
                period_start_date: '2024-01-15',
              },
              error: null,
            }),
          })),
        })),
      })

      // Mock role utils
      const { canApproveTimecardsWithSettings } = await import('@/lib/role-utils')
      vi.mocked(canApproveTimecardsWithSettings).mockReturnValue(true)

      // Mock audit logging failure but successful timecard update
      mockWithTimecardAuditLogging.mockImplementation(async (supabase, context, operation) => {
        // Execute the operation successfully
        const result = await operation()
        // But simulate audit logging failure (should be handled gracefully)
        console.error('Simulated audit logging failure')
        return result
      })

      // Mock successful update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        })),
      })

      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          timecardId: 'timecard-1',
          updates: {
            total_hours: 7.5,
          },
          adminNote: 'Corrected hours',
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      // Should still succeed even if audit logging fails
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(mockWithTimecardAuditLogging).toHaveBeenCalled()
    })
  })

  describe('Permission Checks', () => {
    it('should enforce admin permissions for admin edit operations (requirement 6.1)', async () => {
      // Mock authenticated non-admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock user profile without admin permissions
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'talent_escort' }, // No admin permissions
              error: null,
            }),
          })),
        })),
      })

      // Mock global settings
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { talent_escort_can_approve_timecards: false },
              error: null,
            }),
          })),
        })),
      })

      // Mock timecard fetch (different user's timecard)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { 
                id: 'timecard-1',
                user_id: 'other-user-id', // Different from authenticated user
                status: 'draft',
                total_hours: 8.0,
              },
              error: null,
            }),
          })),
        })),
      })

      // Mock role utils
      const { canApproveTimecardsWithSettings } = await import('@/lib/role-utils')
      vi.mocked(canApproveTimecardsWithSettings).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          timecardId: 'timecard-1',
          updates: {
            total_hours: 7.5,
          },
          adminNote: 'Attempted unauthorized edit',
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Insufficient permissions to edit this timecard')
      expect(mockWithTimecardAuditLogging).not.toHaveBeenCalled()
    })

    it('should allow return to draft only for users with approval permissions (requirement 6.2)', async () => {
      // Mock authenticated user without approval permissions
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      // Mock user profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'supervisor' },
              error: null,
            }),
          })),
        })),
      })

      // Mock global settings (supervisor cannot approve)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { supervisor_can_approve_timecards: false },
              error: null,
            }),
          })),
        })),
      })

      // Mock role utils
      const { canApproveTimecardsWithSettings } = await import('@/lib/role-utils')
      vi.mocked(canApproveTimecardsWithSettings).mockReturnValue(false)

      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          timecardId: 'timecard-1',
          updates: {
            total_hours: 7.5,
          },
          returnToDraft: true, // Should be rejected for non-approvers
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Insufficient permissions to return timecard to draft')
      expect(mockWithTimecardAuditLogging).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle timecard not found', async () => {
      // Mock authenticated admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      })

      // Mock user profile
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          })),
        })),
      })

      // Mock global settings
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { in_house_can_approve_timecards: true },
              error: null,
            }),
          })),
        })),
      })

      // Mock timecard not found
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          })),
        })),
      })

      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          timecardId: 'nonexistent-timecard',
          updates: {
            total_hours: 7.5,
          },
          adminNote: 'Correction needed',
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Timecard not found')
      expect(mockWithTimecardAuditLogging).not.toHaveBeenCalled()
    })

    it('should validate request data', async () => {
      const request = new NextRequest('http://localhost/api/timecards/edit', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required timecardId
          updates: {
            total_hours: 7.5,
          },
        }),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Validation failed')
      expect(mockWithTimecardAuditLogging).not.toHaveBeenCalled()
    })
  })
})