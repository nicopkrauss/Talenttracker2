/**
 * Test for Rejection Edit Audit Logging Fix
 * 
 * Tests that rejection edits are properly logged according to the specifications:
 * - change_id should be unique for the interaction (same for all fields changed in one rejection)
 * - field_name should be one of: check_in, break_start, break_end, check_out
 * - old_value should be current value from timecard daily entries
 * - new_value should be the modified value from user input
 * - changed_by should be the ID of person making change
 * - changed_at should be when change happened
 * - action_type should be rejection_edit
 * - work_date should be the day that had its field changed
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createServerClient } from '@supabase/ssr'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'
import { vi } from 'date-fns/locale'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      limit: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    insert: vi.fn()
  }))
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase)
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn()
  }))
}))

describe('Rejection Edit Audit Logging Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create audit log entries with correct structure for rejection edits', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock user profile with admin role
    const mockProfile = { role: 'admin' }
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'system_settings') {
        return {
          select: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { 
                  in_house_can_approve_timecards: true,
                  supervisor_can_approve_timecards: false,
                  coordinator_can_approve_timecards: false
                },
                error: null
              })
            }))
          }))
        }
      }

      if (table === 'timecard_headers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'timecard-123',
                  status: 'submitted',
                  user_id: 'user-456',
                  period_start_date: '2024-01-15'
                },
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }
      }

      if (table === 'timecard_daily_entries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    work_date: '2024-01-15',
                    check_in_time: '09:00:00',
                    check_out_time: '17:00:00',
                    break_start_time: '12:00:00',
                    break_end_time: '13:00:00'
                  }
                ],
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }))
          }))
        }
      }

      if (table === 'timecard_audit_log') {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }))
      }
    })

    // Create request with rejection edit data
    const requestBody = {
      timecardId: 'timecard-123',
      updates: {
        status: 'rejected'
      },
      dailyUpdates: {
        'day_0': {
          check_in_time: '09:30:00',  // Changed from 09:00:00
          break_start_time: '12:30:00' // Changed from 12:00:00
        }
      },
      editComment: 'Times corrected during rejection'
    }

    const request = new NextRequest('http://localhost:3000/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Execute the API call
    const response = await POST(request)
    const result = await response.json()

    // Verify response is successful
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify audit log entries were created
    const auditInsertCall = mockSupabase.from.mock.calls.find(call => call[0] === 'timecard_audit_log')
    expect(auditInsertCall).toBeDefined()

    // Get the insert call for audit log
    const auditLogTable = mockSupabase.from('timecard_audit_log')
    expect(auditLogTable.insert).toHaveBeenCalled()

    const insertedAuditEntries = auditLogTable.insert.mock.calls[0][0]
    
    // Verify audit entries structure
    expect(Array.isArray(insertedAuditEntries)).toBe(true)
    expect(insertedAuditEntries.length).toBe(2) // Two fields changed

    // Verify first audit entry (check_in_time change)
    const checkInEntry = insertedAuditEntries.find((entry: any) => entry.field_name === 'check_in')
    expect(checkInEntry).toBeDefined()
    expect(checkInEntry.timecard_id).toBe('timecard-123')
    expect(checkInEntry.field_name).toBe('check_in')
    expect(checkInEntry.old_value).toBe('09:00:00')
    expect(checkInEntry.new_value).toBe('09:30:00')
    expect(checkInEntry.changed_by).toBe('user-123')
    expect(checkInEntry.action_type).toBe('rejection_edit')
    expect(checkInEntry.work_date).toBe('2024-01-15')
    expect(checkInEntry.change_id).toBeDefined()

    // Verify second audit entry (break_start_time change)
    const breakStartEntry = insertedAuditEntries.find((entry: any) => entry.field_name === 'break_start')
    expect(breakStartEntry).toBeDefined()
    expect(breakStartEntry.timecard_id).toBe('timecard-123')
    expect(breakStartEntry.field_name).toBe('break_start')
    expect(breakStartEntry.old_value).toBe('12:00:00')
    expect(breakStartEntry.new_value).toBe('12:30:00')
    expect(breakStartEntry.changed_by).toBe('user-123')
    expect(breakStartEntry.action_type).toBe('rejection_edit')
    expect(breakStartEntry.work_date).toBe('2024-01-15')
    expect(breakStartEntry.change_id).toBeDefined()

    // Verify both entries have the same change_id (same interaction)
    expect(checkInEntry.change_id).toBe(breakStartEntry.change_id)

    // Verify timestamps are present and recent
    expect(checkInEntry.changed_at).toBeDefined()
    expect(breakStartEntry.changed_at).toBeDefined()
    expect(checkInEntry.changed_at).toBe(breakStartEntry.changed_at) // Same timestamp for same interaction
  })

  it('should only create audit entries for fields that actually changed', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock user profile with admin role
    const mockProfile = { role: 'admin' }
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'timecard_headers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'timecard-123',
                  status: 'submitted',
                  user_id: 'user-456',
                  period_start_date: '2024-01-15'
                },
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }
      }

      if (table === 'timecard_daily_entries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    work_date: '2024-01-15',
                    check_in_time: '09:00:00',
                    check_out_time: '17:00:00',
                    break_start_time: '12:00:00',
                    break_end_time: '13:00:00'
                  }
                ],
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }))
          }))
        }
      }

      if (table === 'timecard_audit_log') {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }))
      }
    })

    // Create request with rejection edit where some values don't change
    const requestBody = {
      timecardId: 'timecard-123',
      updates: {
        status: 'rejected'
      },
      dailyUpdates: {
        'day_0': {
          check_in_time: '09:00:00',  // Same as current - no change
          check_out_time: '18:00:00', // Changed from 17:00:00
          break_start_time: '12:00:00', // Same as current - no change
          break_end_time: '13:00:00'  // Same as current - no change
        }
      },
      editComment: 'Only check out time corrected'
    }

    const request = new NextRequest('http://localhost:3000/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Execute the API call
    const response = await POST(request)
    const result = await response.json()

    // Verify response is successful
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify audit log entries were created
    const auditLogTable = mockSupabase.from('timecard_audit_log')
    expect(auditLogTable.insert).toHaveBeenCalled()

    const insertedAuditEntries = auditLogTable.insert.mock.calls[0][0]
    
    // Should only have one audit entry for the changed field
    expect(Array.isArray(insertedAuditEntries)).toBe(true)
    expect(insertedAuditEntries.length).toBe(1)

    // Verify the single audit entry is for check_out
    const checkOutEntry = insertedAuditEntries[0]
    expect(checkOutEntry.field_name).toBe('check_out')
    expect(checkOutEntry.old_value).toBe('17:00:00')
    expect(checkOutEntry.new_value).toBe('18:00:00')
    expect(checkOutEntry.action_type).toBe('rejection_edit')
  })

  it('should use correct field name mappings', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock user profile with admin role
    const mockProfile = { role: 'admin' }
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            }))
          }))
        }
      }
      
      if (table === 'timecard_headers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'timecard-123',
                  status: 'submitted',
                  user_id: 'user-456',
                  period_start_date: '2024-01-15'
                },
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }
      }

      if (table === 'timecard_daily_entries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    work_date: '2024-01-15',
                    check_in_time: '09:00:00',
                    check_out_time: '17:00:00',
                    break_start_time: '12:00:00',
                    break_end_time: '13:00:00'
                  }
                ],
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }))
          }))
        }
      }

      if (table === 'timecard_audit_log') {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }))
      }
    })

    // Create request testing all field mappings
    const requestBody = {
      timecardId: 'timecard-123',
      updates: {
        status: 'rejected'
      },
      dailyUpdates: {
        'day_0': {
          check_in_time: '09:30:00',   // check_in_time -> check_in
          check_out_time: '17:30:00',  // check_out_time -> check_out
          break_start_time: '12:30:00', // break_start_time -> break_start
          break_end_time: '13:30:00'   // break_end_time -> break_end
        }
      }
    }

    const request = new NextRequest('http://localhost:3000/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Execute the API call
    const response = await POST(request)
    const result = await response.json()

    // Verify response is successful
    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify audit log entries were created
    const auditLogTable = mockSupabase.from('timecard_audit_log')
    expect(auditLogTable.insert).toHaveBeenCalled()

    const insertedAuditEntries = auditLogTable.insert.mock.calls[0][0]
    
    // Should have four audit entries for all changed fields
    expect(Array.isArray(insertedAuditEntries)).toBe(true)
    expect(insertedAuditEntries.length).toBe(4)

    // Verify field name mappings
    const fieldNames = insertedAuditEntries.map((entry: any) => entry.field_name).sort()
    expect(fieldNames).toEqual(['break_end', 'break_start', 'check_in', 'check_out'])

    // Verify each entry has correct mapping
    const checkInEntry = insertedAuditEntries.find((entry: any) => entry.field_name === 'check_in')
    expect(checkInEntry.old_value).toBe('09:00:00')
    expect(checkInEntry.new_value).toBe('09:30:00')

    const checkOutEntry = insertedAuditEntries.find((entry: any) => entry.field_name === 'check_out')
    expect(checkOutEntry.old_value).toBe('17:00:00')
    expect(checkOutEntry.new_value).toBe('17:30:00')

    const breakStartEntry = insertedAuditEntries.find((entry: any) => entry.field_name === 'break_start')
    expect(breakStartEntry.old_value).toBe('12:00:00')
    expect(breakStartEntry.new_value).toBe('12:30:00')

    const breakEndEntry = insertedAuditEntries.find((entry: any) => entry.field_name === 'break_end')
    expect(breakEndEntry.old_value).toBe('13:00:00')
    expect(breakEndEntry.new_value).toBe('13:30:00')
  })
})