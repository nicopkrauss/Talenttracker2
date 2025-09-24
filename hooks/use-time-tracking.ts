import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProjectRole } from '@/lib/types'

// Time tracking state machine types
export type TimeTrackingStatus = 
  | 'checked_out'
  | 'checked_in' 
  | 'on_break'
  | 'break_ended'

export interface TimeTrackingState {
  status: TimeTrackingStatus
  nextAction: 'check_in' | 'start_break' | 'end_break' | 'check_out' | 'complete'
  contextInfo: string
  canEndBreak?: boolean
  breakStartTime?: Date
  shiftStartTime?: Date
  shiftDuration?: number
  isOvertime?: boolean
}

export interface TimecardRecord {
  id: string
  user_id: string
  project_id: string
  date: string
  check_in_time?: string
  check_out_time?: string
  break_start_time?: string
  break_end_time?: string
  total_hours: number
  break_duration: number
  pay_rate: number
  total_pay: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  manually_edited: boolean
  edit_comments?: string
  admin_edited?: boolean
  last_edited_by?: string
  edit_type?: 'user_correction' | 'admin_adjustment' | 'system_correction'
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  created_at: string
  updated_at: string
}

export interface GlobalSettings {
  default_escort_break_minutes: number
  default_staff_break_minutes: number
  max_hours_before_stop: number
  overtime_warning_hours: number
  timecard_reminder_frequency_days: number
  submission_opens_on_show_day: boolean
}

export interface UseTimeTrackingProps {
  projectId: string
  userRole: ProjectRole
  scheduledStartTime?: string
  onStateChange?: (state: TimeTrackingState) => void
  onShiftLimitExceeded?: () => void
}

export interface UseTimeTrackingReturn {
  currentState: TimeTrackingState
  contextInfo: string
  checkIn: () => Promise<void>
  startBreak: () => Promise<void>
  endBreak: () => Promise<void>
  checkOut: () => Promise<void>
  loading: boolean
  error: string | null
  shiftDuration: number
  isOvertime: boolean
  timecardRecord: TimecardRecord | null
  refreshState: () => Promise<void>
}

export function useTimeTracking({
  projectId,
  userRole,
  scheduledStartTime,
  onStateChange,
  onShiftLimitExceeded
}: UseTimeTrackingProps): UseTimeTrackingReturn {
  const { userProfile } = useAuth()
  
  // State management
  const [currentState, setCurrentState] = useState<TimeTrackingState>({
    status: 'checked_out',
    nextAction: 'check_in',
    contextInfo: 'Ready to check in'
  })
  const [timecardRecord, setTimecardRecord] = useState<TimecardRecord | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for timers and monitoring
  const shiftMonitorRef = useRef<NodeJS.Timeout | null>(null)
  const breakTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Helper function to get break duration based on role
  const getBreakDuration = useCallback(() => {
    if (!globalSettings) return 30 // Default fallback
    
    return userRole === 'talent_escort' 
      ? globalSettings.default_escort_break_minutes
      : globalSettings.default_staff_break_minutes
  }, [globalSettings, userRole])

  // Helper function to format time for display
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }, [])

  // Helper function to calculate shift duration in hours
  const calculateShiftDuration = useCallback((checkInTime: Date, currentTime?: Date) => {
    const endTime = currentTime || new Date()
    return (endTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
  }, [])

  // Derive state from timecard record
  const deriveStateFromTimecard = useCallback((record: TimecardRecord | null): TimeTrackingState => {
    if (!record) {
      return {
        status: 'checked_out',
        nextAction: 'check_in',
        contextInfo: scheduledStartTime 
          ? `Shift starts at ${scheduledStartTime}`
          : 'Ready to check in'
      }
    }

    const checkInTime = record.check_in_time ? new Date(record.check_in_time) : null
    const checkOutTime = record.check_out_time ? new Date(record.check_out_time) : null
    const breakStartTime = record.break_start_time ? new Date(record.break_start_time) : null
    const breakEndTime = record.break_end_time ? new Date(record.break_end_time) : null
    const now = new Date()

    // Calculate shift duration and overtime status
    const shiftDuration = checkInTime ? calculateShiftDuration(checkInTime, checkOutTime || now) : 0
    const isOvertime = globalSettings ? shiftDuration >= globalSettings.overtime_warning_hours : false

    // State machine logic based on timestamps
    if (!checkInTime) {
      return {
        status: 'checked_out',
        nextAction: 'check_in',
        contextInfo: scheduledStartTime 
          ? `Shift starts at ${scheduledStartTime}`
          : 'Ready to check in',
        shiftDuration,
        isOvertime
      }
    }

    if (checkInTime && !breakStartTime) {
      return {
        status: 'checked_in',
        nextAction: 'start_break',
        contextInfo: `Break expected to start at ${formatTime(now)}`,
        shiftStartTime: checkInTime,
        shiftDuration,
        isOvertime
      }
    }

    if (breakStartTime && !breakEndTime) {
      const breakDurationMinutes = getBreakDuration()
      const breakEndExpected = new Date(breakStartTime.getTime() + (breakDurationMinutes * 60 * 1000))
      const canEndBreak = now >= breakEndExpected
      const remainingMinutes = Math.max(0, Math.ceil((breakEndExpected.getTime() - now.getTime()) / (1000 * 60)))

      return {
        status: 'on_break',
        nextAction: 'end_break',
        contextInfo: canEndBreak 
          ? `Break can be ended (${breakDurationMinutes} min minimum met)`
          : `Break ends at ${formatTime(breakEndExpected)} (${remainingMinutes} min remaining)`,
        canEndBreak,
        breakStartTime,
        shiftStartTime: checkInTime,
        shiftDuration,
        isOvertime
      }
    }

    if (breakEndTime && !checkOutTime) {
      // Role-specific behavior after break
      if (userRole === 'talent_escort') {
        return {
          status: 'break_ended',
          nextAction: 'complete',
          contextInfo: 'Break completed - checkout handled by supervisor',
          shiftStartTime: checkInTime,
          shiftDuration,
          isOvertime
        }
      } else {
        return {
          status: 'break_ended',
          nextAction: 'check_out',
          contextInfo: `Expected check out at ${formatTime(now)}`,
          shiftStartTime: checkInTime,
          shiftDuration,
          isOvertime
        }
      }
    }

    if (checkOutTime) {
      return {
        status: 'checked_out',
        nextAction: 'check_in',
        contextInfo: 'Shift completed - ready for next day',
        shiftDuration,
        isOvertime: false
      }
    }

    // Fallback state
    return {
      status: 'checked_out',
      nextAction: 'check_in',
      contextInfo: 'Unknown state - ready to check in',
      shiftDuration,
      isOvertime
    }
  }, [scheduledStartTime, formatTime, calculateShiftDuration, getBreakDuration, userRole, globalSettings])

  // Load timecard record and global settings
  const loadTimecardData = useCallback(async () => {
    if (!userProfile?.id) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      const response = await fetch(`/api/timecards/time-tracking?projectId=${projectId}&date=${today}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setTimecardRecord(data.timecard)
      setGlobalSettings(data.globalSettings)
      
      // Derive and set current state
      const newState = deriveStateFromTimecard(data.timecard)
      setCurrentState(newState)
      onStateChange?.(newState)

    } catch (err) {
      console.error('Error loading timecard data:', err)
      setError('Failed to load timecard data')
    }
  }, [userProfile?.id, projectId, deriveStateFromTimecard, onStateChange])

  // Refresh state (public method)
  const refreshState = useCallback(async () => {
    await loadTimecardData()
  }, [loadTimecardData])

  // Update timecard record via API
  const updateTimecardRecord = useCallback(async (action: string, timestamp?: Date) => {
    if (!userProfile?.id) throw new Error('User not authenticated')

    const actionTimestamp = timestamp || new Date()
    
    try {
      const response = await fetch('/api/timecards/time-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          action,
          timestamp: actionTimestamp.toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setTimecardRecord(data.timecard)
      
      // Derive and set new state
      const newState = deriveStateFromTimecard(data.timecard)
      setCurrentState(newState)
      onStateChange?.(newState)

      return data.timecard
    } catch (err) {
      console.error('Error updating timecard record:', err)
      throw new Error('Failed to update timecard')
    }
  }, [userProfile?.id, projectId, deriveStateFromTimecard, onStateChange])

  // Monitor for 20-hour shift limit
  const startShiftMonitoring = useCallback(() => {
    if (shiftMonitorRef.current) {
      clearInterval(shiftMonitorRef.current)
    }

    shiftMonitorRef.current = setInterval(() => {
      if (timecardRecord?.check_in_time && !timecardRecord.check_out_time && globalSettings) {
        const checkInTime = new Date(timecardRecord.check_in_time)
        const shiftDuration = calculateShiftDuration(checkInTime)
        
        if (shiftDuration >= globalSettings.max_hours_before_stop) {
          // Automatically stop time tracking
          checkOut().catch(console.error)
          onShiftLimitExceeded?.()
          
          if (shiftMonitorRef.current) {
            clearInterval(shiftMonitorRef.current)
            shiftMonitorRef.current = null
          }
        }
      }
    }, 60000) // Check every minute
  }, [timecardRecord, globalSettings, calculateShiftDuration, onShiftLimitExceeded])

  // Stop shift monitoring
  const stopShiftMonitoring = useCallback(() => {
    if (shiftMonitorRef.current) {
      clearInterval(shiftMonitorRef.current)
      shiftMonitorRef.current = null
    }
  }, [])

  // Start break timer for UI updates
  const startBreakTimer = useCallback(() => {
    if (breakTimerRef.current) {
      clearInterval(breakTimerRef.current)
    }

    breakTimerRef.current = setInterval(() => {
      // Refresh state to update break timer display
      if (timecardRecord) {
        const newState = deriveStateFromTimecard(timecardRecord)
        setCurrentState(newState)
        onStateChange?.(newState)
      }
    }, 30000) // Update every 30 seconds during break
  }, [timecardRecord, deriveStateFromTimecard, onStateChange])

  // Stop break timer
  const stopBreakTimer = useCallback(() => {
    if (breakTimerRef.current) {
      clearInterval(breakTimerRef.current)
      breakTimerRef.current = null
    }
  }, [])

  // Time tracking actions
  const checkIn = useCallback(async () => {
    if (currentState.status !== 'checked_out') return
    
    setLoading(true)
    setError(null)
    
    try {
      await updateTimecardRecord('check_in')
      startShiftMonitoring()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in')
    } finally {
      setLoading(false)
    }
  }, [currentState.status, updateTimecardRecord, startShiftMonitoring])

  const startBreak = useCallback(async () => {
    if (currentState.status !== 'checked_in') return
    
    setLoading(true)
    setError(null)
    
    try {
      await updateTimecardRecord('start_break')
      startBreakTimer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start break')
    } finally {
      setLoading(false)
    }
  }, [currentState.status, updateTimecardRecord, startBreakTimer])

  const endBreak = useCallback(async () => {
    if (currentState.status !== 'on_break') return
    
    setLoading(true)
    setError(null)
    
    try {
      const now = new Date()
      const breakStartTime = timecardRecord?.break_start_time ? new Date(timecardRecord.break_start_time) : null
      
      let breakEndTime = now
      if (breakStartTime) {
        const breakDurationMinutes = getBreakDuration()
        const minBreakEnd = new Date(breakStartTime.getTime() + (breakDurationMinutes * 60 * 1000))
        
        // Use grace period logic - if within 5 minutes of minimum, use exact minimum
        const timeDiff = Math.abs(now.getTime() - minBreakEnd.getTime()) / (1000 * 60)
        breakEndTime = timeDiff <= 5 ? minBreakEnd : now
      }
      
      await updateTimecardRecord('end_break', breakEndTime)
      stopBreakTimer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end break')
    } finally {
      setLoading(false)
    }
  }, [currentState.status, timecardRecord, updateTimecardRecord, getBreakDuration, stopBreakTimer])

  const checkOut = useCallback(async () => {
    if (currentState.status !== 'break_ended' && currentState.status !== 'checked_in') return
    
    setLoading(true)
    setError(null)
    
    try {
      await updateTimecardRecord('check_out')
      stopShiftMonitoring()
      stopBreakTimer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check out')
    } finally {
      setLoading(false)
    }
  }, [currentState.status, updateTimecardRecord, stopShiftMonitoring, stopBreakTimer])

  // Initialize hook
  useEffect(() => {
    loadTimecardData()
  }, [loadTimecardData])

  // Start monitoring when checked in
  useEffect(() => {
    if (currentState.status === 'checked_in' || currentState.status === 'on_break' || currentState.status === 'break_ended') {
      startShiftMonitoring()
    } else {
      stopShiftMonitoring()
    }

    return () => {
      stopShiftMonitoring()
    }
  }, [currentState.status, startShiftMonitoring, stopShiftMonitoring])

  // Start break timer when on break
  useEffect(() => {
    if (currentState.status === 'on_break') {
      startBreakTimer()
    } else {
      stopBreakTimer()
    }

    return () => {
      stopBreakTimer()
    }
  }, [currentState.status, startBreakTimer, stopBreakTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopShiftMonitoring()
      stopBreakTimer()
    }
  }, [stopShiftMonitoring, stopBreakTimer])

  // Calculate current values
  const shiftDuration = currentState.shiftDuration || 0
  const isOvertime = currentState.isOvertime || false
  const contextInfo = currentState.contextInfo

  return {
    currentState,
    contextInfo,
    checkIn,
    startBreak,
    endBreak,
    checkOut,
    loading,
    error,
    shiftDuration,
    isOvertime,
    timecardRecord,
    refreshState
  }
}