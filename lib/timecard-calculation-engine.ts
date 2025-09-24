/**
 * Timecard Calculation Engine
 * 
 * Handles automatic timecard generation and calculations from time tracking data.
 * Integrates with team_assignments for pay rates and provides real-time updates.
 */

import { createClient } from '@supabase/supabase-js'

export interface TimecardData {
  id?: string
  user_id: string
  project_id: string
  date: string
  check_in_time?: string | null
  check_out_time?: string | null
  break_start_time?: string | null
  break_end_time?: string | null
  total_hours?: number | null
  break_duration?: number | null
  pay_rate?: number | null
  total_pay?: number | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  manually_edited: boolean
  created_at?: string
  updated_at?: string
}

export interface CalculationResult {
  total_hours: number
  break_duration: number
  total_pay: number
  is_valid: boolean
  validation_errors: string[]
  manually_edited_flag: boolean
}

export interface PayRateInfo {
  base_rate: number
  overtime_rate?: number
  daily_rate?: number
  time_type: 'hourly' | 'daily'
}

export class TimecardCalculationEngine {
  private supabase: ReturnType<typeof createClient>

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient
  }

  /**
   * Calculate timecard totals from time tracking data
   */
  async calculateTimecard(timecardData: TimecardData): Promise<CalculationResult> {
    const result: CalculationResult = {
      total_hours: 0,
      break_duration: 0,
      total_pay: 0,
      is_valid: true,
      validation_errors: [],
      manually_edited_flag: false
    }

    try {
      // Validate time sequence
      const timeValidation = this.validateTimeSequence(timecardData)
      if (!timeValidation.is_valid) {
        result.is_valid = false
        result.validation_errors = timeValidation.errors
        return result
      }

      // Calculate total hours
      const hoursCalculation = this.calculateTotalHours(timecardData)
      result.total_hours = hoursCalculation.total_hours
      result.break_duration = hoursCalculation.break_duration

      // Get pay rate from team assignments
      const payRateInfo = await this.getPayRateForUser(
        timecardData.user_id, 
        timecardData.project_id
      )

      if (payRateInfo) {
        result.total_pay = this.calculatePay(result.total_hours, payRateInfo)
      }

      // Check for manual edits (>15 minute changes)
      result.manually_edited_flag = await this.detectManualEdits(timecardData)

      return result
    } catch (error) {
      console.error('Timecard calculation error:', error)
      result.is_valid = false
      result.validation_errors.push('Calculation engine error')
      return result
    }
  }

  /**
   * Calculate total hours worked including break handling
   */
  private calculateTotalHours(data: TimecardData): { total_hours: number; break_duration: number } {
    if (!data.check_in_time || !data.check_out_time) {
      return { total_hours: 0, break_duration: 0 }
    }

    const checkIn = new Date(data.check_in_time)
    const checkOut = new Date(data.check_out_time)
    
    // Calculate total shift duration in hours
    const totalShiftHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)

    // Calculate break duration
    let breakDurationMinutes = 0
    if (data.break_start_time && data.break_end_time) {
      const breakStart = new Date(data.break_start_time)
      const breakEnd = new Date(data.break_end_time)
      breakDurationMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
    }

    // Convert break to hours and subtract from total
    const breakDurationHours = breakDurationMinutes / 60
    const totalHours = Math.max(0, totalShiftHours - breakDurationHours)

    return {
      total_hours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
      break_duration: Math.round(breakDurationMinutes * 100) / 100
    }
  }

  /**
   * Calculate pay based on hours and pay rate info
   */
  private calculatePay(totalHours: number, payRateInfo: PayRateInfo): number {
    if (payRateInfo.time_type === 'daily') {
      // Daily rate - pay full rate regardless of hours (within reason)
      return payRateInfo.daily_rate || payRateInfo.base_rate
    }

    // Hourly rate calculation
    let totalPay = 0
    const regularHours = Math.min(totalHours, 8) // First 8 hours at regular rate
    const overtimeHours = Math.max(0, totalHours - 8) // Hours over 8 at overtime rate

    totalPay += regularHours * payRateInfo.base_rate

    if (overtimeHours > 0 && payRateInfo.overtime_rate) {
      totalPay += overtimeHours * payRateInfo.overtime_rate
    } else if (overtimeHours > 0) {
      // Default overtime at 1.5x if no specific rate set
      totalPay += overtimeHours * (payRateInfo.base_rate * 1.5)
    }

    return Math.round(totalPay * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Validate time sequence logic
   */
  private validateTimeSequence(data: TimecardData): { is_valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.check_in_time) {
      errors.push('Check-in time is required')
      return { is_valid: false, errors }
    }

    const checkIn = new Date(data.check_in_time)

    // Validate check-out time if present
    if (data.check_out_time) {
      const checkOut = new Date(data.check_out_time)
      if (checkOut <= checkIn) {
        errors.push('Check-out time must be after check-in time')
      }
    }

    // Validate break times if present
    if (data.break_start_time) {
      const breakStart = new Date(data.break_start_time)
      if (breakStart <= checkIn) {
        errors.push('Break start time must be after check-in time')
      }

      if (data.break_end_time) {
        const breakEnd = new Date(data.break_end_time)
        if (breakEnd <= breakStart) {
          errors.push('Break end time must be after break start time')
        }

        // If check-out exists, break must end before check-out
        if (data.check_out_time) {
          const checkOut = new Date(data.check_out_time)
          if (breakEnd > checkOut) {
            errors.push('Break end time must be before check-out time')
          }
        }
      }
    }

    // Check for 20-hour shift limit
    if (data.check_out_time) {
      const checkOut = new Date(data.check_out_time)
      const shiftHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
      if (shiftHours > 20) {
        errors.push('Shift exceeds 20-hour limit - requires manual review')
      }
    }

    return { is_valid: errors.length === 0, errors }
  }

  /**
   * Get pay rate information from team assignments
   */
  private async getPayRateForUser(userId: string, projectId: string): Promise<PayRateInfo | null> {
    try {
      const { data: assignment, error } = await this.supabase
        .from('team_assignments')
        .select(`
          pay_rate,
          overtime_rate,
          daily_rate,
          project_role_templates!inner(
            time_type,
            base_pay_rate
          )
        `)
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .single()

      if (error || !assignment) {
        console.warn('No team assignment found for user:', userId, 'project:', projectId)
        return null
      }

      const template = assignment.project_role_templates
      
      return {
        base_rate: assignment.pay_rate || template.base_pay_rate || 0,
        overtime_rate: assignment.overtime_rate,
        daily_rate: assignment.daily_rate,
        time_type: template.time_type || 'hourly'
      }
    } catch (error) {
      console.error('Error fetching pay rate:', error)
      return null
    }
  }

  /**
   * Detect manual edits by comparing with previous calculations
   */
  private async detectManualEdits(currentData: TimecardData): Promise<boolean> {
    if (!currentData.id) {
      return false // New timecard, no previous data to compare
    }

    try {
      // Get the previous version of this timecard
      const { data: previousData, error } = await this.supabase
        .from('timecard_headers')
        .select('*')
        .eq('id', currentData.id)
        .single()

      if (error || !previousData) {
        return false
      }

      // Calculate what the values should be based on time tracking data
      const calculatedResult = await this.calculateTimecard({
        ...currentData,
        manually_edited: false // Reset flag for calculation
      })

      // Check for significant differences (>15 minutes for break, >0.25 hours for total)
      const breakDiffMinutes = Math.abs(
        (currentData.break_duration || 0) - calculatedResult.break_duration
      )
      const hoursDiff = Math.abs(
        (currentData.total_hours || 0) - calculatedResult.total_hours
      )

      return breakDiffMinutes > 15 || hoursDiff > 0.25
    } catch (error) {
      console.error('Error detecting manual edits:', error)
      return false
    }
  }

  /**
   * Apply grace period logic for break duration
   */
  applyBreakGracePeriod(
    breakStartTime: string, 
    breakEndTime: string, 
    defaultDurationMinutes: number
  ): number {
    const breakStart = new Date(breakStartTime)
    const breakEnd = new Date(breakEndTime)
    const actualDurationMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
    
    // Grace period: if ended within 5 minutes of default duration, use default
    const gracePeriodMinutes = 5
    const expectedEndTime = new Date(breakStart.getTime() + (defaultDurationMinutes * 60 * 1000))
    const timeDiffFromExpected = Math.abs(breakEnd.getTime() - expectedEndTime.getTime()) / (1000 * 60)
    
    if (timeDiffFromExpected <= gracePeriodMinutes) {
      return defaultDurationMinutes
    }
    
    return actualDurationMinutes
  }

  /**
   * Generate or update timecard from time tracking data
   */
  async generateTimecard(
    userId: string, 
    projectId: string, 
    date: string, 
    timeTrackingData: Partial<TimecardData>
  ): Promise<TimecardData | null> {
    try {
      // Check if timecard already exists
      const { data: existingTimecard } = await this.supabase
        .from('timecard_headers')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('date', date)
        .single()

      const timecardData: TimecardData = {
        ...existingTimecard,
        ...timeTrackingData,
        user_id: userId,
        project_id: projectId,
        date: date,
        status: existingTimecard?.status || 'draft',
        manually_edited: existingTimecard?.manually_edited || false
      }

      // Calculate totals
      const calculation = await this.calculateTimecard(timecardData)
      
      if (!calculation.is_valid) {
        throw new Error(`Timecard calculation failed: ${calculation.validation_errors.join(', ')}`)
      }

      // Update timecard with calculated values
      const updatedTimecard: TimecardData = {
        ...timecardData,
        total_hours: calculation.total_hours,
        break_duration: calculation.break_duration,
        total_pay: calculation.total_pay,
        manually_edited: calculation.manually_edited_flag || timecardData.manually_edited
      }

      // Save to database
      if (existingTimecard) {
        const { data, error } = await this.supabase
          .from('timecard_headers')
          .update(updatedTimecard)
          .eq('id', existingTimecard.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        const { data, error } = await this.supabase
          .from('timecard_headers')
          .insert(updatedTimecard)
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (error) {
      console.error('Error generating timecard:', error)
      return null
    }
  }

  /**
   * Real-time calculation update for active time tracking
   */
  async updateTimecardCalculations(timecardId: string): Promise<boolean> {
    try {
      const { data: timecard, error } = await this.supabase
        .from('timecard_headers')
        .select('*')
        .eq('id', timecardId)
        .single()

      if (error || !timecard) {
        return false
      }

      const calculation = await this.calculateTimecard(timecard)
      
      if (!calculation.is_valid) {
        console.warn('Invalid timecard calculation:', calculation.validation_errors)
        return false
      }

      const { error: updateError } = await this.supabase
        .from('timecard_headers')
        .update({
          total_hours: calculation.total_hours,
          break_duration: calculation.break_duration,
          total_pay: calculation.total_pay,
          manually_edited: calculation.manually_edited_flag || timecard.manually_edited,
          updated_at: new Date().toISOString()
        })
        .eq('id', timecardId)

      return !updateError
    } catch (error) {
      console.error('Error updating timecard calculations:', error)
      return false
    }
  }
}

/**
 * Factory function to create calculation engine instance
 */
export function createTimecardCalculationEngine(supabaseClient: ReturnType<typeof createClient>) {
  return new TimecardCalculationEngine(supabaseClient)
}