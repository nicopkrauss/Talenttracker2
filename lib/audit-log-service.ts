/**
 * Audit Log Service
 * 
 * Comprehensive audit logging system for timecard operations that tracks all changes
 * made to timecard data, provides visibility into edit history, and ensures compliance
 * with payroll auditing requirements.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Core interfaces for audit log system
export interface AuditLogEntry {
  id: string
  timecard_id: string
  change_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_at: Date
  action_type: 'user_edit' | 'admin_edit' | 'rejection_edit'
  work_date: Date | null
  changed_by_profile?: {
    full_name: string
  }
}

export interface AuditLogFilter {
  action_type?: ('user_edit' | 'admin_edit' | 'rejection_edit')[]
  field_name?: string[]
  date_from?: Date
  date_to?: Date
  limit?: number
  offset?: number
  grouped?: boolean
}

export interface GroupedAuditEntry {
  change_id: string
  changed_at: Date
  changed_by: string
  action_type: 'user_edit' | 'admin_edit' | 'rejection_edit'
  changes: AuditLogEntry[]
  changed_by_profile?: {
    full_name: string
  }
}

/**
 * Get rejected fields for a timecard from audit logs
 * Returns array of field names that were flagged during rejection
 */
export async function getRejectedFields(
  supabase: SupabaseClient,
  timecardId: string
): Promise<string[]> {
  try {
    const { data: rejectionLogs, error } = await supabase
      .from('timecard_audit_log')
      .select('field_name')
      .eq('timecard_id', timecardId)
      .eq('action_type', 'rejection_edit')
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('Error fetching rejection audit logs:', error)
      return []
    }

    // Get unique field names from rejection edits
    const rejectedFields = [...new Set(rejectionLogs.map(log => log.field_name))]
    return rejectedFields

  } catch (error) {
    console.error('Error in getRejectedFields:', error)
    return []
  }
}

export interface FieldChange {
  fieldName: string
  oldValue: any
  newValue: any
}

export interface AuditLogResponse {
  data: AuditLogEntry[] | GroupedAuditEntry[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

// Field name mapping constants for consistent display
export const TRACKABLE_FIELDS = {
  // Time tracking fields
  'check_in_time': 'Check In Time',
  'check_out_time': 'Check Out Time',
  'break_start_time': 'Break Start Time',
  'break_end_time': 'Break End Time',
  
  // Calculated fields
  'total_hours': 'Total Hours',
  'break_duration': 'Break Duration',
  'overtime_hours': 'Overtime Hours',
  
  // Status and metadata
  'status': 'Status',
  'manually_edited': 'Manually Edited Flag',
  'admin_notes': 'Admin Notes',
  'edit_comments': 'Edit Comments',
  'rejected_fields': 'Rejected Fields',
  
  // Daily entry fields (for multi-day timecards)
  'daily_check_in': 'Daily Check In',
  'daily_check_out': 'Daily Check Out',
  'daily_break_start': 'Daily Break Start',
  'daily_break_end': 'Daily Break End',
  'daily_total_hours': 'Daily Total Hours'
} as const

// Helper function to check if a field is trackable (including dynamic daily fields)
export function isTrackableField(fieldName: string): boolean {
  // Check if it's a standard trackable field
  if (fieldName in TRACKABLE_FIELDS) {
    return true
  }
  
  // Check if it's a daily entry field (e.g., check_in_time_day_0, break_start_time_day_1)
  const dailyFieldPattern = /^(check_in_time|check_out_time|break_start_time|break_end_time|total_hours|break_duration)_day_\d+$/
  return dailyFieldPattern.test(fieldName)
}

// Value formatting utilities
export class ValueFormatter {
  /**
   * Format old value for display
   */
  static formatOldValue(fieldName: string, value: any): string {
    return this.formatValue(fieldName, value)
  }

  /**
   * Format new value for display
   */
  static formatNewValue(fieldName: string, value: any): string {
    return this.formatValue(fieldName, value)
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  /**
   * Format duration in minutes to human readable format
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    }
    return `${hours}h ${remainingMinutes}m`
  }

  /**
   * Format field name for display
   */
  static formatFieldName(fieldName: string): string {
    // Check if it's a standard trackable field
    if (fieldName in TRACKABLE_FIELDS) {
      return TRACKABLE_FIELDS[fieldName as keyof typeof TRACKABLE_FIELDS]
    }
    
    // Handle daily entry fields (e.g., check_in_time_day_0 -> "Check In Time (Day 1)")
    const dailyFieldMatch = fieldName.match(/^(check_in_time|check_out_time|break_start_time|break_end_time|total_hours|break_duration)_day_(\d+)$/)
    if (dailyFieldMatch) {
      const [, baseField, dayIndex] = dailyFieldMatch
      const baseFieldName = TRACKABLE_FIELDS[baseField as keyof typeof TRACKABLE_FIELDS] || baseField
      const dayNumber = parseInt(dayIndex) + 1 // Convert 0-based index to 1-based day number
      return `${baseFieldName} (Day ${dayNumber})`
    }
    
    // Fallback to the original field name
    return fieldName
  }

  /**
   * Internal value formatting logic
   */
  private static formatValue(fieldName: string, value: any): string {
    if (value === null || value === undefined) {
      return '(empty)'
    }

    // Handle time fields
    if (fieldName.includes('time') && typeof value === 'string') {
      try {
        const date = new Date(value)
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).format(date)
      } catch {
        return value
      }
    }

    // Handle duration fields (in minutes)
    if (fieldName.includes('duration') && typeof value === 'number') {
      return this.formatDuration(value)
    }

    // Handle hours fields
    if (fieldName.includes('hours') && typeof value === 'number') {
      return `${value} ${value === 1 ? 'hour' : 'hours'}`
    }

    // Handle status fields
    if (fieldName === 'status') {
      const statusMap: Record<string, string> = {
        'draft': 'Draft',
        'submitted': 'Submitted',
        'approved': 'Approved',
        'rejected': 'Rejected'
      }
      return statusMap[value] || value
    }

    // Handle boolean fields
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    // Handle arrays (like rejected_fields)
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '(none)'
    }

    // Default string conversion
    return String(value)
  }
}

// Custom error class for audit log operations
export class AuditLogError extends Error {
  constructor(
    message: string,
    public readonly timecardId: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'AuditLogError'
  }
}

/**
 * Core Audit Log Service Class
 */
export class AuditLogService {
  private supabase: SupabaseClient<any>

  constructor(supabaseClient: SupabaseClient<any>) {
    this.supabase = supabaseClient
  }

  /**
   * Record changes when timecard data is modified
   */
  async recordChanges(
    timecardId: string,
    changes: FieldChange[],
    changedBy: string,
    actionType: 'user_edit' | 'admin_edit' | 'rejection_edit',
    workDate?: Date
  ): Promise<void> {
    if (changes.length === 0) {
      return // No changes to record
    }

    try {
      // Generate a unique change_id for grouping related changes
      const changeId = uuidv4()
      const timestamp = new Date()

      // Create audit log entries for each field change
      const auditEntries = changes.map(change => ({
        timecard_id: timecardId,
        change_id: changeId,
        field_name: change.fieldName,
        old_value: this.serializeValue(change.oldValue),
        new_value: this.serializeValue(change.newValue),
        changed_by: changedBy,
        changed_at: timestamp.toISOString(),
        action_type: actionType,
        work_date: workDate ? workDate.toISOString().split('T')[0] : null
      }))

      // Insert all audit entries in a single transaction
      const { error } = await this.supabase
        .from('timecard_audit_log')
        .insert(auditEntries as any)

      if (error) {
        throw new AuditLogError(
          `Failed to record audit log entries: ${error.message}`,
          timecardId,
          error
        )
      }
    } catch (error) {
      if (error instanceof AuditLogError) {
        throw error
      }
      throw new AuditLogError(
        'Unexpected error during audit log recording',
        timecardId,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Retrieve audit logs for a timecard
   */
  async getAuditLogs(
    timecardId: string,
    filter?: AuditLogFilter
  ): Promise<AuditLogEntry[]> {
    try {
      let query = this.supabase
        .from('timecard_audit_log')
        .select(`
          *,
          changed_by_profile:profiles!timecard_audit_log_changed_by_fkey(full_name)
        `)
        .eq('timecard_id', timecardId)

      // Apply filters
      if (filter?.action_type && filter.action_type.length > 0) {
        query = query.in('action_type', filter.action_type)
      }

      if (filter?.field_name && filter.field_name.length > 0) {
        query = query.in('field_name', filter.field_name)
      }

      if (filter?.date_from) {
        query = query.gte('changed_at', filter.date_from.toISOString())
      }

      if (filter?.date_to) {
        query = query.lte('changed_at', filter.date_to.toISOString())
      }

      // Apply pagination
      if (filter?.offset) {
        query = query.range(filter.offset, (filter.offset + (filter.limit || 50)) - 1)
      } else if (filter?.limit) {
        query = query.limit(filter.limit)
      }

      // Order by most recent first
      query = query.order('changed_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new AuditLogError(
          `Failed to retrieve audit logs: ${error.message}`,
          timecardId,
          error
        )
      }

      return (data || []).map((entry: any) => ({
        ...entry,
        changed_at: new Date(entry.changed_at),
        work_date: entry.work_date ? new Date(entry.work_date) : null
      }))
    } catch (error) {
      if (error instanceof AuditLogError) {
        throw error
      }
      throw new AuditLogError(
        'Unexpected error during audit log retrieval',
        timecardId,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Get audit logs grouped by change_id
   */
  async getGroupedAuditLogs(
    timecardId: string,
    filter?: AuditLogFilter
  ): Promise<GroupedAuditEntry[]> {
    try {
      // Get all audit logs first
      const auditLogs = await this.getAuditLogs(timecardId, filter)

      // Group by change_id
      const groupedMap = new Map<string, GroupedAuditEntry>()

      for (const entry of auditLogs) {
        if (!groupedMap.has(entry.change_id)) {
          groupedMap.set(entry.change_id, {
            change_id: entry.change_id,
            changed_at: entry.changed_at,
            changed_by: entry.changed_by,
            action_type: entry.action_type,
            changes: [],
            changed_by_profile: entry.changed_by_profile
          })
        }

        const group = groupedMap.get(entry.change_id)!
        group.changes.push(entry)
      }

      // Convert to array and sort by timestamp (most recent first)
      return Array.from(groupedMap.values())
        .sort((a, b) => b.changed_at.getTime() - a.changed_at.getTime())
    } catch (error) {
      if (error instanceof AuditLogError) {
        throw error
      }
      throw new AuditLogError(
        'Unexpected error during grouped audit log retrieval',
        timecardId,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Detect changes between old and new timecard data
   */
  detectChanges(oldData: Record<string, any>, newData: Record<string, any>): FieldChange[] {
    const changes: FieldChange[] = []
    
    // Get all field names from both old and new data
    const allFieldNames = new Set([...Object.keys(oldData), ...Object.keys(newData)])
    
    for (const fieldName of allFieldNames) {
      // Only track changes for trackable fields
      if (!isTrackableField(fieldName)) {
        continue
      }
      
      const oldValue = oldData[fieldName]
      const newValue = newData[fieldName]

      // Compare values, handling null/undefined equivalence
      if (!this.valuesEqual(oldValue, newValue)) {
        changes.push({
          fieldName,
          oldValue,
          newValue
        })
      }
    }

    return changes
  }

  /**
   * Get audit log statistics for a timecard
   */
  async getAuditLogStatistics(timecardId: string): Promise<{
    totalChanges: number
    userEdits: number
    adminEdits: number
    rejectionEdits: number
    lastModified?: Date
    lastModifiedBy?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('timecard_audit_log')
        .select(`
          action_type,
          changed_at,
          changed_by,
          changed_by_profile:profiles!timecard_audit_log_changed_by_fkey(full_name)
        `)
        .eq('timecard_id', timecardId)
        .order('changed_at', { ascending: false })

      if (error) {
        throw new AuditLogError(
          `Failed to retrieve audit log statistics: ${error.message}`,
          timecardId,
          error
        )
      }

      const entries: any[] = data || []
      const stats = {
        totalChanges: entries.length,
        userEdits: entries.filter(e => e.action_type === 'user_edit').length,
        adminEdits: entries.filter(e => e.action_type === 'admin_edit').length,
        rejectionEdits: entries.filter(e => e.action_type === 'rejection_edit').length,
        lastModified: entries.length > 0 ? new Date(entries[0].changed_at) : undefined,
        lastModifiedBy: entries.length > 0 ? entries[0].changed_by_profile?.full_name : undefined
      }

      return stats
    } catch (error) {
      if (error instanceof AuditLogError) {
        throw error
      }
      throw new AuditLogError(
        'Unexpected error during audit log statistics retrieval',
        timecardId,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Serialize value for database storage
   */
  private serializeValue(value: any): string | null {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'boolean' || typeof value === 'number') {
      return String(value)
    }

    if (Array.isArray(value)) {
      return JSON.stringify(value)
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    // For objects, serialize as JSON
    return JSON.stringify(value)
  }

  /**
   * Compare two values for equality, handling null/undefined equivalence
   */
  private valuesEqual(a: any, b: any): boolean {
    // Handle null/undefined equivalence
    if ((a === null || a === undefined) && (b === null || b === undefined)) {
      return true
    }

    if ((a === null || a === undefined) !== (b === null || b === undefined)) {
      return false
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => this.valuesEqual(item, b[index]))
    }

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      
      if (keysA.length !== keysB.length) return false
      
      return keysA.every(key => this.valuesEqual(a[key], b[key]))
    }

    // Primitive comparison
    return a === b
  }
}

/**
 * Factory function to create audit log service instance
 */
export function createAuditLogService(supabaseClient: SupabaseClient<any>) {
  return new AuditLogService(supabaseClient)
}