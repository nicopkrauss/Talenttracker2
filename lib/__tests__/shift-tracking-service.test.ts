import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShiftTrackingService } from '../shift-tracking-service'

describe('ShiftTrackingService', () => {
  let service: ShiftTrackingService
  let mockSupabase: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a fresh mock for each test
    mockSupabase = {
      from: vi.fn(),
      insert: vi.fn()
    }
    
    service = new ShiftTrackingService(mockSupabase)
  })

  describe('getActiveShiftsWithDuration', () => {
    it('should calculate shift durations correctly', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          user_id: 'user-1',
          project_id: 'project-1',
          check_in_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          status: 'checked_in',
          profiles: { full_name: 'John Doe' },
          projects: { name: 'Test Project' },
          team_assignments: {
            project_roles: { role: 'supervisor' }
          }
        },
        {
          id: 'shift-2',
          user_id: 'user-2',
          project_id: 'project-1',
          check_in_time: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
          status: 'checked_in',
          profiles: { full_name: 'Jane Smith' },
          projects: { name: 'Test Project' },
          team_assignments: {
            project_roles: { role: 'talent_escort' }
          }
        }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockShifts,
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await service.getActiveShiftsWithDuration('project-1')

      expect(result).toHaveLength(2)
      expect(result[0].user_name).toBe('John Doe')
      expect(result[0].alert_level).toBe('none') // 6 hours
      expect(result[1].user_name).toBe('Jane Smith')
      expect(result[1].alert_level).toBe('warning') // 10 hours
    })

    it('should identify critical alerts for shifts over 12 hours', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          user_id: 'user-1',
          project_id: 'project-1',
          check_in_time: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), // 14 hours ago
          status: 'checked_in',
          profiles: { full_name: 'John Doe' },
          projects: { name: 'Test Project' },
          team_assignments: {
            project_roles: { role: 'supervisor' }
          }
        }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockShifts,
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await service.getActiveShiftsWithDuration('project-1')

      expect(result[0].alert_level).toBe('critical')
      expect(result[0].duration_hours).toBeGreaterThan(12)
    })
  })

  describe('getShiftAlerts', () => {
    it('should return only shifts with alerts', async () => {
      // Mock the getActiveShiftsWithDuration method
      vi.spyOn(service, 'getActiveShiftsWithDuration').mockResolvedValue([
        {
          user_id: 'user-1',
          user_name: 'John Doe',
          role: 'supervisor',
          check_in_time: new Date().toISOString(),
          duration_hours: 6,
          alert_level: 'none',
          project_name: 'Test Project'
        },
        {
          user_id: 'user-2',
          user_name: 'Jane Smith',
          role: 'talent_escort',
          check_in_time: new Date().toISOString(),
          duration_hours: 10,
          alert_level: 'warning',
          project_name: 'Test Project'
        },
        {
          user_id: 'user-3',
          user_name: 'Mike Wilson',
          role: 'talent_escort',
          check_in_time: new Date().toISOString(),
          duration_hours: 14,
          alert_level: 'critical',
          project_name: 'Test Project'
        }
      ])

      const alerts = await service.getShiftAlerts('project-1')

      expect(alerts).toHaveLength(2) // Only warning and critical
      expect(alerts.find(a => a.user_name === 'Jane Smith')?.alert_level).toBe('warning')
      expect(alerts.find(a => a.user_name === 'Mike Wilson')?.alert_level).toBe('critical')
    })
  })

  describe('getStaffCheckInStatus', () => {
    it('should count staff by status correctly', async () => {
      const mockShifts = [
        { status: 'checked_in' },
        { status: 'checked_in' },
        { status: 'on_break' },
        { status: 'checked_out' }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockShifts,
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await service.getStaffCheckInStatus('project-1')

      expect(result).toEqual({
        total: 4,
        checkedIn: 2,
        onBreak: 1,
        checkedOut: 1
      })
    })
  })

  describe('sendShiftAlertNotifications', () => {
    it('should send notifications for critical alerts', async () => {
      // Mock getShiftAlerts to return critical alerts
      vi.spyOn(service, 'getShiftAlerts').mockResolvedValue([
        {
          id: 'alert-1',
          user_id: 'user-1',
          user_name: 'John Doe',
          project_id: 'project-1',
          project_name: 'Test Project',
          shift_duration_hours: 14,
          alert_level: 'critical',
          check_in_time: new Date().toISOString()
        }
      ])

      // Mock team assignments query
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              user_id: 'admin-1',
              role: 'admin',
              profiles: { full_name: 'Admin User', email: 'admin@test.com' }
            }
          ],
          error: null
        })
      }

      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return { insert: mockInsert }
        }
        return mockQuery
      })

      await service.sendShiftAlertNotifications('project-1')

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'admin-1',
          title: 'Critical: Staff Overtime Alert',
          type: 'shift_alert_critical',
          project_id: 'project-1'
        })
      ])
    })
  })

  describe('calculateProjectKPIs', () => {
    it('should calculate comprehensive project KPIs', async () => {
      // Mock staff status
      vi.spyOn(service, 'getStaffCheckInStatus').mockResolvedValue({
        total: 6,
        checkedIn: 4,
        onBreak: 1,
        checkedOut: 1
      })

      // Mock active shifts with overtime
      vi.spyOn(service, 'getActiveShiftsWithDuration').mockResolvedValue([
        {
          user_id: 'user-1',
          user_name: 'John Doe',
          role: 'supervisor',
          check_in_time: new Date().toISOString(),
          duration_hours: 10,
          alert_level: 'warning',
          project_name: 'Test Project'
        },
        {
          user_id: 'user-2',
          user_name: 'Jane Smith',
          role: 'talent_escort',
          check_in_time: new Date().toISOString(),
          duration_hours: 14,
          alert_level: 'critical',
          project_name: 'Test Project'
        }
      ])

      // Mock project and talent data
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { talent_expected: 12 },
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'talent_status') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { status: 'on_location' },
                { status: 'on_location' },
                { status: 'on_break' },
                { status: 'not_arrived' }
              ],
              error: null
            })
          }
        }
        return mockQuery
      })

      const result = await service.calculateProjectKPIs('project-1')

      expect(result).toEqual({
        staffStatus: {
          total: 6,
          checkedIn: 4,
          onBreak: 1,
          overtime: {
            warning: 1,
            critical: 1
          }
        },
        talentStatus: {
          expected: 12,
          present: 3, // on_location + on_break
          onLocation: 2,
          onBreak: 1
        }
      })
    })
  })
})