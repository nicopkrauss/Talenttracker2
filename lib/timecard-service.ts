/**
 * Timecard Service
 * 
 * High-level service that integrates the calculation engine with timecard operations
 */

import { createClient } from '@supabase/supabase-js'
import { createTimecardCalculationEngine, type TimecardData, type CalculationResult } from './timecard-calculation-engine'

export interface TimecardSubmissionResult {
  success: boolean
  timecard?: TimecardData
  missingBreaks?: string[]
  validationErrors?: string[]
}

export interface TimecardApprovalResult {
  success: boolean
  timecard?: TimecardData
  error?: string
}

export class TimecardService {
  private calculationEngine: ReturnType<typeof createTimecardCalculationEngine>
  private supabase: ReturnType<typeof createClient>

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient
    this.calculationEngine = createTimecardCalculationEngine(supabaseClient)
  }

  /**
   * Generate timecard from time tracking data with real-time calculations
   */
  async generateTimecardFromTracking(
    userId: string,
    projectId: string,
    date: string,
    timeTrackingData: Partial<TimecardData>
  ): Promise<TimecardData | null> {
    return await this.calculationEngine.generateTimecard(
      userId,
      projectId,
      date,
      timeTrackingData
    )
  }

  /**
   * Submit timecard with validation and missing break resolution
   */
  async submitTimecard(timecardId: string): Promise<TimecardSubmissionResult> {
    try {
      // Get current timecard
      const { data: timecard, error: fetchError } = await this.supabase
        .from('timecard_headers')
        .select('*')
        .eq('id', timecardId)
        .single()

      if (fetchError || !timecard) {
        return {
          success: false,
          validationErrors: ['Timecard not found']
        }
      }

      // Calculate and validate timecard
      const calculation = await this.calculationEngine.calculateTimecard(timecard)
      
      if (!calculation.is_valid) {
        return {
          success: false,
          validationErrors: calculation.validation_errors
        }
      }

      // Check for missing breaks (>6 hour shifts)
      const missingBreaks = this.checkForMissingBreaks(timecard)
      if (missingBreaks.length > 0) {
        return {
          success: false,
          missingBreaks
        }
      }

      // Update timecard with final calculations and submit
      const { data: submittedTimecard, error: submitError } = await this.supabase
        .from('timecard_headers')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          total_hours: calculation.total_hours,
          break_duration: calculation.break_duration,
          total_pay: calculation.total_pay,
          manually_edited: calculation.manually_edited_flag || timecard.manually_edited
        })
        .eq('id', timecardId)
        .select()
        .single()

      if (submitError) {
        return {
          success: false,
          validationErrors: ['Failed to submit timecard']
        }
      }

      return {
        success: true,
        timecard: submittedTimecard
      }
    } catch (error) {
      console.error('Error submitting timecard:', error)
      return {
        success: false,
        validationErrors: ['Internal error during submission']
      }
    }
  }

  /**
   * Approve timecard with optional comments
   */
  async approveTimecard(
    timecardId: string,
    approverId: string,
    comments?: string
  ): Promise<TimecardApprovalResult> {
    try {
      const { data: approvedTimecard, error } = await this.supabase
        .from('timecard_headers')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approverId,
          edit_comments: comments
        })
        .eq('id', timecardId)
        .eq('status', 'submitted') // Only approve submitted timecards
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: 'Failed to approve timecard'
        }
      }

      return {
        success: true,
        timecard: approvedTimecard
      }
    } catch (error) {
      console.error('Error approving timecard:', error)
      return {
        success: false,
        error: 'Internal error during approval'
      }
    }
  }

  /**
   * Reject timecard with required comments
   */
  async rejectTimecard(
    timecardId: string,
    approverId: string,
    comments: string
  ): Promise<TimecardApprovalResult> {
    if (!comments.trim()) {
      return {
        success: false,
        error: 'Comments are required for timecard rejection'
      }
    }

    try {
      const { data: rejectedTimecard, error } = await this.supabase
        .from('timecard_headers')
        .update({
          status: 'rejected',
          approved_by: approverId,
          edit_comments: comments,
          updated_at: new Date().toISOString()
        })
        .eq('id', timecardId)
        .eq('status', 'submitted') // Only reject submitted timecards
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: 'Failed to reject timecard'
        }
      }

      return {
        success: true,
        timecard: rejectedTimecard
      }
    } catch (error) {
      console.error('Error rejecting timecard:', error)
      return {
        success: false,
        error: 'Internal error during rejection'
      }
    }
  }

  /**
   * Bulk approve multiple timecards
   */
  async bulkApproveTimecards(
    timecardIds: string[],
    approverId: string
  ): Promise<{ successful: string[]; failed: string[] }> {
    const successful: string[] = []
    const failed: string[] = []

    for (const timecardId of timecardIds) {
      const result = await this.approveTimecard(timecardId, approverId)
      if (result.success) {
        successful.push(timecardId)
      } else {
        failed.push(timecardId)
      }
    }

    return { successful, failed }
  }

  /**
   * Recalculate timecard after manual edits
   */
  async recalculateTimecard(timecardId: string): Promise<boolean> {
    return await this.calculationEngine.updateTimecardCalculations(timecardId)
  }

  /**
   * Check for missing breaks in shifts over 6 hours
   */
  private checkForMissingBreaks(timecard: TimecardData): string[] {
    const missingBreaks: string[] = []

    if (!timecard.check_in_time || !timecard.check_out_time) {
      return missingBreaks
    }

    const checkIn = new Date(timecard.check_in_time)
    const checkOut = new Date(timecard.check_out_time)
    const shiftHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)

    // Check if shift is over 6 hours and has no break information
    if (shiftHours > 6 && (!timecard.break_start_time || !timecard.break_end_time)) {
      missingBreaks.push(timecard.date)
    }

    return missingBreaks
  }

  /**
   * Resolve missing break for a specific date
   */
  async resolveMissingBreak(
    timecardId: string,
    resolution: 'add_break' | 'no_break',
    breakData?: { start_time: string; end_time: string }
  ): Promise<boolean> {
    try {
      let updateData: any = {}

      if (resolution === 'add_break' && breakData) {
        updateData = {
          break_start_time: breakData.start_time,
          break_end_time: breakData.end_time
        }
      } else if (resolution === 'no_break') {
        // Mark that no break was taken (could use a flag or comment)
        updateData = {
          edit_comments: 'No break taken - confirmed by user',
          manually_edited: true,
          edit_type: 'user_correction'
        }
      }

      const { error } = await this.supabase
        .from('timecard_headers')
        .update(updateData)
        .eq('id', timecardId)

      if (error) {
        console.error('Error resolving missing break:', error)
        return false
      }

      // Recalculate timecard after break resolution
      return await this.calculationEngine.updateTimecardCalculations(timecardId)
    } catch (error) {
      console.error('Error resolving missing break:', error)
      return false
    }
  }

  /**
   * Get timecard statistics for a project
   */
  async getTimecardStatistics(projectId: string, dateRange?: { start: string; end: string }) {
    try {
      let query = this.supabase
        .from('timecard_headers')
        .select(`
          *,
          profiles!timecards_user_id_fkey(full_name),
          team_assignments!inner(role)
        `)
        .eq('project_id', projectId)

      if (dateRange) {
        query = query
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)
      }

      const { data: timecards, error } = await query

      if (error) {
        throw error
      }

      // Calculate statistics
      const stats = {
        total_timecards: timecards.length,
        submitted: timecards.filter(t => t.status === 'submitted').length,
        approved: timecards.filter(t => t.status === 'approved').length,
        rejected: timecards.filter(t => t.status === 'rejected').length,
        draft: timecards.filter(t => t.status === 'draft').length,
        total_hours: timecards.reduce((sum, t) => sum + (t.total_hours || 0), 0),
        total_pay: timecards.reduce((sum, t) => sum + (t.total_pay || 0), 0),
        manually_edited: timecards.filter(t => t.manually_edited).length
      }

      return { stats, timecards }
    } catch (error) {
      console.error('Error getting timecard statistics:', error)
      return null
    }
  }
}

/**
 * Factory function to create timecard service instance
 */
export function createTimecardService(supabaseClient: ReturnType<typeof createClient>) {
  return new TimecardService(supabaseClient)
}