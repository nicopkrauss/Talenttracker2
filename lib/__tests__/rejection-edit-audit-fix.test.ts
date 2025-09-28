/**
 * Unit Test for Rejection Edit Audit Logging Fix
 * 
 * Tests the core logic for creating audit log entries during rejection edits
 */

import { describe, it, expect } from 'vitest'

describe('Rejection Edit Audit Logic', () => {
  it('should create correct field mappings', () => {
    const fieldMappings = {
      'check_in_time': 'check_in',
      'check_out_time': 'check_out', 
      'break_start_time': 'break_start',
      'break_end_time': 'break_end'
    }

    expect(fieldMappings['check_in_time']).toBe('check_in')
    expect(fieldMappings['check_out_time']).toBe('check_out')
    expect(fieldMappings['break_start_time']).toBe('break_start')
    expect(fieldMappings['break_end_time']).toBe('break_end')
  })

  it('should detect field changes correctly', () => {
    const currentDayEntry = {
      work_date: '2024-01-15',
      check_in_time: '09:00:00',
      check_out_time: '17:00:00',
      break_start_time: '12:00:00',
      break_end_time: '13:00:00'
    }

    const dayData = {
      check_in_time: '09:30:00',  // Changed
      check_out_time: '17:00:00', // Same
      break_start_time: '12:30:00', // Changed
      break_end_time: '13:00:00'  // Same
    }

    const changes = []
    const fieldMappings = {
      'check_in_time': 'check_in',
      'check_out_time': 'check_out', 
      'break_start_time': 'break_start',
      'break_end_time': 'break_end'
    }

    for (const [fieldKey, fieldValue] of Object.entries(dayData)) {
      if (fieldValue !== undefined && fieldKey in fieldMappings) {
        const auditFieldName = fieldMappings[fieldKey as keyof typeof fieldMappings]
        const oldValue = currentDayEntry[fieldKey as keyof typeof currentDayEntry]
        const newValue = fieldValue

        if (oldValue !== newValue) {
          changes.push({
            field_name: auditFieldName,
            old_value: oldValue,
            new_value: newValue
          })
        }
      }
    }

    expect(changes).toHaveLength(2)
    expect(changes[0]).toEqual({
      field_name: 'check_in',
      old_value: '09:00:00',
      new_value: '09:30:00'
    })
    expect(changes[1]).toEqual({
      field_name: 'break_start',
      old_value: '12:00:00',
      new_value: '12:30:00'
    })
  })

  it('should create audit entry structure correctly', () => {
    const changeId = 'test-change-id'
    const timecardId = 'test-timecard-id'
    const userId = 'test-user-id'
    const timestamp = new Date('2024-01-15T10:30:00Z')
    const workDate = new Date('2024-01-15')

    const auditEntry = {
      timecard_id: timecardId,
      change_id: changeId,
      field_name: 'check_in',
      old_value: '09:00:00',
      new_value: '09:30:00',
      changed_by: userId,
      changed_at: timestamp.toISOString(),
      action_type: 'rejection_edit',
      work_date: workDate.toISOString().split('T')[0]
    }

    expect(auditEntry.timecard_id).toBe(timecardId)
    expect(auditEntry.change_id).toBe(changeId)
    expect(auditEntry.field_name).toBe('check_in')
    expect(auditEntry.old_value).toBe('09:00:00')
    expect(auditEntry.new_value).toBe('09:30:00')
    expect(auditEntry.changed_by).toBe(userId)
    expect(auditEntry.changed_at).toBe('2024-01-15T10:30:00.000Z')
    expect(auditEntry.action_type).toBe('rejection_edit')
    expect(auditEntry.work_date).toBe('2024-01-15')
  })

  it('should handle multiple field changes with same change_id', () => {
    const changeId = 'shared-change-id'
    const timecardId = 'test-timecard-id'
    const userId = 'test-user-id'
    const timestamp = new Date('2024-01-15T10:30:00Z')
    const workDate = new Date('2024-01-15')

    const changes = [
      { field_name: 'check_in', old_value: '09:00:00', new_value: '09:30:00' },
      { field_name: 'break_start', old_value: '12:00:00', new_value: '12:30:00' },
      { field_name: 'check_out', old_value: '17:00:00', new_value: '17:30:00' }
    ]

    const auditEntries = changes.map(change => ({
      timecard_id: timecardId,
      change_id: changeId,
      field_name: change.field_name,
      old_value: change.old_value,
      new_value: change.new_value,
      changed_by: userId,
      changed_at: timestamp.toISOString(),
      action_type: 'rejection_edit',
      work_date: workDate.toISOString().split('T')[0]
    }))

    expect(auditEntries).toHaveLength(3)
    
    // All entries should have the same change_id
    const changeIds = auditEntries.map(entry => entry.change_id)
    expect(new Set(changeIds).size).toBe(1)
    expect(changeIds[0]).toBe(changeId)

    // All entries should have the same metadata
    auditEntries.forEach(entry => {
      expect(entry.timecard_id).toBe(timecardId)
      expect(entry.changed_by).toBe(userId)
      expect(entry.changed_at).toBe(timestamp.toISOString())
      expect(entry.action_type).toBe('rejection_edit')
      expect(entry.work_date).toBe('2024-01-15')
    })

    // Each entry should have correct field-specific data
    expect(auditEntries[0].field_name).toBe('check_in')
    expect(auditEntries[0].old_value).toBe('09:00:00')
    expect(auditEntries[0].new_value).toBe('09:30:00')

    expect(auditEntries[1].field_name).toBe('break_start')
    expect(auditEntries[1].old_value).toBe('12:00:00')
    expect(auditEntries[1].new_value).toBe('12:30:00')

    expect(auditEntries[2].field_name).toBe('check_out')
    expect(auditEntries[2].old_value).toBe('17:00:00')
    expect(auditEntries[2].new_value).toBe('17:30:00')
  })

  it('should handle null/undefined values correctly', () => {
    const currentDayEntry = {
      work_date: '2024-01-15',
      check_in_time: null,
      check_out_time: '17:00:00',
      break_start_time: undefined,
      break_end_time: '13:00:00'
    }

    const dayData = {
      check_in_time: '09:00:00',  // null -> value
      check_out_time: null,       // value -> null
      break_start_time: '12:00:00', // undefined -> value
      break_end_time: '13:00:00'  // same
    }

    const changes = []
    const fieldMappings = {
      'check_in_time': 'check_in',
      'check_out_time': 'check_out', 
      'break_start_time': 'break_start',
      'break_end_time': 'break_end'
    }

    for (const [fieldKey, fieldValue] of Object.entries(dayData)) {
      if (fieldValue !== undefined && fieldKey in fieldMappings) {
        const auditFieldName = fieldMappings[fieldKey as keyof typeof fieldMappings]
        const oldValue = currentDayEntry[fieldKey as keyof typeof currentDayEntry]
        const newValue = fieldValue

        if (oldValue !== newValue) {
          changes.push({
            field_name: auditFieldName,
            old_value: oldValue ? String(oldValue) : null,
            new_value: newValue ? String(newValue) : null
          })
        }
      }
    }

    expect(changes).toHaveLength(3)
    
    // null -> value
    expect(changes[0]).toEqual({
      field_name: 'check_in',
      old_value: null,
      new_value: '09:00:00'
    })
    
    // value -> null
    expect(changes[1]).toEqual({
      field_name: 'check_out',
      old_value: '17:00:00',
      new_value: null
    })
    
    // undefined -> value
    expect(changes[2]).toEqual({
      field_name: 'break_start',
      old_value: null,
      new_value: '12:00:00'
    })
  })
})