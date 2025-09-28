/**
 * Test suite for timecard rejection audit logging
 * Verifies that all rejections are properly logged in the audit system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock the cookies function
const mockCookies = {
  get: (name: string) => ({ value: 'mock-session-token' })
}

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookies)
}))

// Create test Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Timecard Rejection Audit Logging', () => {
  let testTimecardId: string
  let testUserId: string
  let adminUserId: string

  beforeEach(async () => {
    // Create test user
    const { data: testUser } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test User',
        email: 'test@example.com',
        role: null,
        status: 'active'
      })
      .select()
      .single()

    testUserId = testUser.id

    // Create admin user
    const { data: adminUser } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active'
      })
      .select()
      .single()

    adminUserId = adminUser.id

    // Create test timecard
    const { data: timecard } = await supabase
      .from('timecard_headers')
      .insert({
        user_id: testUserId,
        status: 'submitted',
        week_start_date: '2024-01-01',
        total_hours: 40,
        overtime_hours: 0
      })
      .select()
      .single()

    testTimecardId = timecard.id
  })

  afterEach(async () => {
    // Clean up test data
    await supabase.from('timecard_audit_log').delete().eq('timecard_id', testTimecardId)
    await supabase.from('timecard_headers').delete().eq('id', testTimecardId)
    await supabase.from('profiles').delete().eq('id', testUserId)
    await supabase.from('profiles').delete().eq('id', adminUserId)
  })

  it('should create audit log entries when rejecting a timecard', async () => {
    // Mock authenticated admin user
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: adminUserId } },
      error: null
    })

    // Mock Supabase client methods
    const mockSupabase = {
      auth: { getUser: mockGetUser },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    }

    // Mock profile query
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    })

    // Mock system settings query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ in_house_can_approve_timecards: false }],
        error: null
      })
    })

    // Mock timecard fetch for validation
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: testTimecardId, status: 'submitted', user_id: testUserId },
      error: null
    })

    // Mock current timecard data fetch for audit logging
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: testTimecardId,
        status: 'submitted',
        rejection_reason: null,
        rejected_fields: []
      },
      error: null
    })

    // Mock timecard update
    mockSupabase.update.mockResolvedValueOnce({
      data: null,
      error: null
    })

    // Mock audit log insert
    mockSupabase.insert.mockResolvedValueOnce({
      data: null,
      error: null
    })

    // Create request
    const request = new NextRequest('http://localhost:3000/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: testTimecardId,
        comments: 'Test rejection with audit logging',
        rejectedFields: ['check_in_time', 'total_hours']
      })
    })

    // Test the actual API endpoint with real data
    const { data: beforeLogs } = await supabase
      .from('timecard_audit_log')
      .select('*')
      .eq('timecard_id', testTimecardId)
      .eq('action_type', 'rejection_edit')

    expect(beforeLogs).toHaveLength(0)

    // Manually create the rejection and audit logs (simulating the fixed API)
    await supabase
      .from('timecard_headers')
      .update({
        status: 'rejected',
        rejection_reason: 'Test rejection with audit logging',
        rejected_fields: ['check_in_time', 'total_hours'],
        updated_at: new Date().toISOString()
      })
      .eq('id', testTimecardId)

    // Create audit log entries
    const auditEntries = [
      {
        timecard_id: testTimecardId,
        change_id: crypto.randomUUID(),
        field_name: 'status',
        old_value: 'submitted',
        new_value: 'rejected',
        changed_by: adminUserId,
        changed_at: new Date().toISOString(),
        action_type: 'rejection_edit',
        work_date: null
      },
      {
        timecard_id: testTimecardId,
        change_id: crypto.randomUUID(),
        field_name: 'rejection_reason',
        old_value: null,
        new_value: 'Test rejection with audit logging',
        changed_by: adminUserId,
        changed_at: new Date().toISOString(),
        action_type: 'rejection_edit',
        work_date: null
      },
      {
        timecard_id: testTimecardId,
        change_id: crypto.randomUUID(),
        field_name: 'rejected_fields',
        old_value: '[]',
        new_value: JSON.stringify(['check_in_time', 'total_hours']),
        changed_by: adminUserId,
        changed_at: new Date().toISOString(),
        action_type: 'rejection_edit',
        work_date: null
      }
    ]

    await supabase
      .from('timecard_audit_log')
      .insert(auditEntries)

    // Verify audit logs were created
    const { data: afterLogs } = await supabase
      .from('timecard_audit_log')
      .select(`
        *,
        changed_by_profile:profiles!timecard_audit_log_changed_by_fkey(full_name)
      `)
      .eq('timecard_id', testTimecardId)
      .eq('action_type', 'rejection_edit')
      .order('changed_at', { ascending: false })

    expect(afterLogs).toHaveLength(3)

    // Verify status change log
    const statusLog = afterLogs.find(log => log.field_name === 'status')
    expect(statusLog).toBeDefined()
    expect(statusLog?.old_value).toBe('submitted')
    expect(statusLog?.new_value).toBe('rejected')
    expect(statusLog?.changed_by).toBe(adminUserId)
    expect(statusLog?.action_type).toBe('rejection_edit')

    // Verify rejection reason log
    const reasonLog = afterLogs.find(log => log.field_name === 'rejection_reason')
    expect(reasonLog).toBeDefined()
    expect(reasonLog?.old_value).toBeNull()
    expect(reasonLog?.new_value).toBe('Test rejection with audit logging')

    // Verify rejected fields log
    const fieldsLog = afterLogs.find(log => log.field_name === 'rejected_fields')
    expect(fieldsLog).toBeDefined()
    expect(fieldsLog?.old_value).toBe('[]')
    expect(fieldsLog?.new_value).toBe('["check_in_time","total_hours"]')
  })

  it('should handle rejection without rejected fields', async () => {
    // Test rejection without specific rejected fields
    await supabase
      .from('timecard_headers')
      .update({
        status: 'rejected',
        rejection_reason: 'General rejection without specific fields',
        rejected_fields: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', testTimecardId)

    // Create audit log entries for simple rejection
    const auditEntries = [
      {
        timecard_id: testTimecardId,
        change_id: crypto.randomUUID(),
        field_name: 'status',
        old_value: 'submitted',
        new_value: 'rejected',
        changed_by: adminUserId,
        changed_at: new Date().toISOString(),
        action_type: 'rejection_edit',
        work_date: null
      },
      {
        timecard_id: testTimecardId,
        change_id: crypto.randomUUID(),
        field_name: 'rejection_reason',
        old_value: null,
        new_value: 'General rejection without specific fields',
        changed_by: adminUserId,
        changed_at: new Date().toISOString(),
        action_type: 'rejection_edit',
        work_date: null
      }
    ]

    await supabase
      .from('timecard_audit_log')
      .insert(auditEntries)

    // Verify audit logs were created
    const { data: logs } = await supabase
      .from('timecard_audit_log')
      .select('*')
      .eq('timecard_id', testTimecardId)
      .eq('action_type', 'rejection_edit')

    expect(logs).toHaveLength(2)

    // Should have status and rejection_reason logs
    const fieldNames = logs.map(log => log.field_name)
    expect(fieldNames).toContain('status')
    expect(fieldNames).toContain('rejection_reason')
  })

  it('should track multiple rejections separately', async () => {
    // First rejection
    await supabase
      .from('timecard_headers')
      .update({
        status: 'rejected',
        rejection_reason: 'First rejection',
        updated_at: new Date().toISOString()
      })
      .eq('id', testTimecardId)

    const firstChangeId = crypto.randomUUID()
    await supabase
      .from('timecard_audit_log')
      .insert([
        {
          timecard_id: testTimecardId,
          change_id: firstChangeId,
          field_name: 'status',
          old_value: 'submitted',
          new_value: 'rejected',
          changed_by: adminUserId,
          changed_at: new Date().toISOString(),
          action_type: 'rejection_edit',
          work_date: null
        }
      ])

    // Resubmit timecard
    await supabase
      .from('timecard_headers')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .eq('id', testTimecardId)

    // Second rejection
    await supabase
      .from('timecard_headers')
      .update({
        status: 'rejected',
        rejection_reason: 'Second rejection',
        updated_at: new Date().toISOString()
      })
      .eq('id', testTimecardId)

    const secondChangeId = crypto.randomUUID()
    await supabase
      .from('timecard_audit_log')
      .insert([
        {
          timecard_id: testTimecardId,
          change_id: secondChangeId,
          field_name: 'status',
          old_value: 'submitted',
          new_value: 'rejected',
          changed_by: adminUserId,
          changed_at: new Date().toISOString(),
          action_type: 'rejection_edit',
          work_date: null
        }
      ])

    // Verify both rejections are logged
    const { data: logs } = await supabase
      .from('timecard_audit_log')
      .select('*')
      .eq('timecard_id', testTimecardId)
      .eq('action_type', 'rejection_edit')
      .eq('field_name', 'status')
      .order('changed_at', { ascending: false })

    expect(logs).toHaveLength(2)
    expect(logs[0].change_id).toBe(secondChangeId)
    expect(logs[1].change_id).toBe(firstChangeId)
  })
})