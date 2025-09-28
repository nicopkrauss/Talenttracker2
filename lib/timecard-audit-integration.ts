/**
 * Timecard Audit Integration Helper
 * 
 * Provides helper functions to integrate audit logging into existing timecard edit operations
 */

import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAuditLogService, type FieldChange } from './audit-log-service'

export interface TimecardAuditContext {
  timecardId: string
  userId: string
  actionType: 'user_edit' | 'admin_edit' | 'rejection_edit'
  workDate?: Date
}

export interface TimecardUpdateData {
  [key: string]: any
}

/**
 * Helper function to detect changes and record audit logs for timecard updates
 */
export async function recordTimecardAuditLog(
  supabaseClient: SupabaseClient<any>,
  context: TimecardAuditContext,
  oldData: TimecardUpdateData,
  newData: TimecardUpdateData,
  specificFields?: string[]
): Promise<void> {
  try {
    const auditService = createAuditLogService(supabaseClient)
    
    // For rejection edits, we want to focus on the actual field changes, not metadata
    if (context.actionType === 'rejection_edit' && specificFields && specificFields.length > 0) {
      // Only track changes to the specific fields that were edited during rejection
      const filteredOldData: TimecardUpdateData = {}
      const filteredNewData: TimecardUpdateData = {}
      
      for (const fieldName of specificFields) {
        filteredOldData[fieldName] = oldData[fieldName]
        filteredNewData[fieldName] = newData[fieldName]
      }
      
      // Detect changes only for the specified fields
      const changes = auditService.detectChanges(filteredOldData, filteredNewData)
      
      if (changes.length > 0) {
        await auditService.recordChanges(
          context.timecardId,
          changes,
          context.userId,
          context.actionType,
          context.workDate
        )
      }
    } else {
      // For regular edits, detect all changes
      const changes = auditService.detectChanges(oldData, newData)
      
      if (changes.length > 0) {
        // Record the changes in the audit log
        await auditService.recordChanges(
          context.timecardId,
          changes,
          context.userId,
          context.actionType,
          context.workDate
        )
      }
    }
  } catch (error) {
    // Log the error but don't fail the timecard operation
    console.error('Failed to record audit log:', error)
    // In production, you might want to send this to a monitoring service
  }
}

/**
 * Helper function to fetch current timecard data for comparison
 */
export async function fetchTimecardForAudit(
  supabaseClient: SupabaseClient<any>,
  timecardId: string
): Promise<TimecardUpdateData | null> {
  try {
    // Fetch timecard header
    const { data: timecard, error } = await supabaseClient
      .from('timecard_headers')
      .select('*')
      .eq('id', timecardId)
      .single()

    if (error || !timecard) {
      console.error('Failed to fetch timecard for audit:', error)
      return null
    }

    // For multi-day timecards, also fetch daily entries
    if (timecard.is_multi_day) {
      const { data: dailyEntries, error: dailyError } = await supabaseClient
        .from('timecard_daily_entries')
        .select('*')
        .eq('timecard_id', timecardId)
        .order('day_index')

      if (dailyError) {
        console.error('Failed to fetch daily entries for audit:', dailyError)
        return timecard // Return header only if daily entries fail
      }

      // Flatten daily entries into the timecard object for comparison
      if (dailyEntries && dailyEntries.length > 0) {
        dailyEntries.forEach((entry, index) => {
          timecard[`check_in_time_day_${index}`] = entry.check_in_time
          timecard[`check_out_time_day_${index}`] = entry.check_out_time
          timecard[`break_start_time_day_${index}`] = entry.break_start_time
          timecard[`break_end_time_day_${index}`] = entry.break_end_time
          timecard[`total_hours_day_${index}`] = entry.total_hours
          timecard[`break_duration_day_${index}`] = entry.break_duration
        })
      }
    }

    return timecard
  } catch (error) {
    console.error('Error fetching timecard for audit:', error)
    return null
  }
}

/**
 * Helper function to extract work date from timecard data
 */
export function extractWorkDate(timecardData: TimecardUpdateData): Date | undefined {
  // For single-day timecards, use period_start_date
  if (timecardData.period_start_date) {
    return new Date(timecardData.period_start_date)
  }
  
  // For multi-day timecards, we might need to handle this differently
  // For now, return undefined and let the audit log handle it
  return undefined
}

/**
 * Wrapper function that handles the complete audit logging workflow for timecard updates
 */
export async function withTimecardAuditLogging<T>(
  supabaseClient: SupabaseClient<any>,
  context: TimecardAuditContext,
  updateOperation: () => Promise<T>,
  specificFields?: string[]
): Promise<T> {
  // Fetch current timecard data before the update
  const oldData = await fetchTimecardForAudit(supabaseClient, context.timecardId)
  
  // Execute the update operation
  const result = await updateOperation()
  
  // If we have old data, fetch new data and record audit log
  if (oldData) {
    const newData = await fetchTimecardForAudit(supabaseClient, context.timecardId)
    
    if (newData) {
      // Extract work date if not provided
      const workDate = context.workDate || extractWorkDate(oldData)
      
      await recordTimecardAuditLog(
        supabaseClient,
        { ...context, workDate },
        oldData,
        newData,
        specificFields
      )
    }
  }
  
  return result
}