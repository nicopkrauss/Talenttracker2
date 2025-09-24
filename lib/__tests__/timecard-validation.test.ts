import { 
  validateTimecardBreaks, 
  hasTimecardMissingBreak, 
  validateTimecardSubmission,
  resolveTimecardBreaks 
} from '../timecard-validation'
import type { Timecard } from '../types'

const createMockTimecard = (overrides: Partial<Timecard> = {}): Timecard => ({
  id: '1',
  user_id: 'user1',
  project_id: 'project1',
  date: '2024-01-15',
  check_in_time: '2024-01-15T08:00:00Z',
  check_out_time: '2024-01-15T17:00:00Z',
  break_start_time: null,
  break_end_time: null,
  total_hours: 8.5,
  break_duration: 0,
  pay_rate: 25,
  total_pay: 212.5,
  status: 'draft',
  manually_edited: false,
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2024-01-15T08:00:00Z',
  ...overrides
})

describe('timecard validation', () => {
  describe('validateTimecardBreaks', () => {
    it('identifies timecards with missing breaks for >6 hour shifts', () => {
      const timecards = [
        createMockTimecard({ id: '1', total_hours: 8.5, break_duration: 0 }),
        createMockTimecard({ id: '2', total_hours: 5.5, break_duration: 0 }),
        createMockTimecard({ id: '3', total_hours: 7.0, break_start_time: '2024-01-15T12:00:00Z', break_end_time: '2024-01-15T12:30:00Z', break_duration: 30 })
      ]

      const missingBreaks = validateTimecardBreaks(timecards)

      expect(missingBreaks).toHaveLength(1)
      expect(missingBreaks[0]).toEqual({
        timecardId: '1',
        date: '2024-01-15',
        totalHours: 8.5,
        hasBreakData: false
      })
    })

    it('ignores non-draft timecards', () => {
      const timecards = [
        createMockTimecard({ id: '1', total_hours: 8.5, break_duration: 0, status: 'submitted' }),
        createMockTimecard({ id: '2', total_hours: 8.5, break_duration: 0, status: 'draft' })
      ]

      const missingBreaks = validateTimecardBreaks(timecards)

      expect(missingBreaks).toHaveLength(1)
      expect(missingBreaks[0].timecardId).toBe('2')
    })

    it('returns empty array when all timecards have proper break data', () => {
      const timecards = [
        createMockTimecard({ 
          id: '1', 
          total_hours: 8.5, 
          break_start_time: '2024-01-15T12:00:00Z',
          break_end_time: '2024-01-15T12:30:00Z',
          break_duration: 30 
        })
      ]

      const missingBreaks = validateTimecardBreaks(timecards)
      expect(missingBreaks).toHaveLength(0)
    })
  })

  describe('hasTimecardMissingBreak', () => {
    it('returns true for draft timecard >6 hours without break', () => {
      const timecard = createMockTimecard({ total_hours: 8.5, break_duration: 0 })
      expect(hasTimecardMissingBreak(timecard)).toBe(true)
    })

    it('returns false for timecard ≤6 hours', () => {
      const timecard = createMockTimecard({ total_hours: 6.0, break_duration: 0 })
      expect(hasTimecardMissingBreak(timecard)).toBe(false)
    })

    it('returns false for non-draft timecard', () => {
      const timecard = createMockTimecard({ total_hours: 8.5, break_duration: 0, status: 'submitted' })
      expect(hasTimecardMissingBreak(timecard)).toBe(false)
    })

    it('returns false for timecard with break data', () => {
      const timecard = createMockTimecard({ 
        total_hours: 8.5, 
        break_start_time: '2024-01-15T12:00:00Z',
        break_end_time: '2024-01-15T12:30:00Z',
        break_duration: 30 
      })
      expect(hasTimecardMissingBreak(timecard)).toBe(false)
    })
  })

  describe('validateTimecardSubmission', () => {
    it('blocks submission when breaks are missing', () => {
      const timecards = [
        createMockTimecard({ total_hours: 8.5, break_duration: 0 })
      ]

      const result = validateTimecardSubmission(timecards)

      expect(result.canSubmit).toBe(false)
      expect(result.missingBreaks).toHaveLength(1)
      expect(result.errors).toContain('1 shift(s) longer than 6 hours are missing break information')
    })

    it('validates time sequences', () => {
      const timecards = [
        createMockTimecard({ 
          check_in_time: '2024-01-15T17:00:00Z',
          check_out_time: '2024-01-15T08:00:00Z', // Invalid: checkout before checkin
          total_hours: 6.0
        })
      ]

      const result = validateTimecardSubmission(timecards)

      expect(result.canSubmit).toBe(false)
      expect(result.errors).toContain('Invalid time sequence for 2024-01-15: check-out must be after check-in')
    })

    it('allows submission when all validations pass', () => {
      const timecards = [
        createMockTimecard({ 
          total_hours: 8.5, 
          break_start_time: '2024-01-15T12:00:00Z',
          break_end_time: '2024-01-15T12:30:00Z',
          break_duration: 30 
        })
      ]

      const result = validateTimecardSubmission(timecards)

      expect(result.canSubmit).toBe(true)
      expect(result.missingBreaks).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('resolveTimecardBreaks', () => {
    it('adds break times when resolution is add_break', () => {
      const timecards = [
        createMockTimecard({ 
          id: '1',
          check_in_time: '2024-01-15T08:00:00Z',
          check_out_time: '2024-01-15T17:00:00Z',
          total_hours: 9.0,
          pay_rate: 25,
          total_pay: 225
        })
      ]

      const resolutions = { '1': 'add_break' as const }
      const updates = resolveTimecardBreaks(timecards, resolutions)

      expect(updates).toHaveLength(1)
      expect(updates[0]).toMatchObject({
        id: '1',
        break_duration: 30,
        total_hours: 8.5, // Reduced by 0.5 hours (30 minutes)
        total_pay: 212.5  // Recalculated: 8.5 * 25
      })
      expect(updates[0].break_start_time).toBeDefined()
      expect(updates[0].break_end_time).toBeDefined()
    })

    it('sets break duration to 0 when resolution is no_break', () => {
      const timecards = [
        createMockTimecard({ 
          id: '1',
          total_hours: 9.0,
          pay_rate: 25,
          total_pay: 225
        })
      ]

      const resolutions = { '1': 'no_break' as const }
      const updates = resolveTimecardBreaks(timecards, resolutions)

      expect(updates).toHaveLength(1)
      expect(updates[0]).toMatchObject({
        id: '1',
        break_start_time: null,
        break_end_time: null,
        break_duration: 0,
        total_hours: 9.0, // Unchanged
        total_pay: 225    // Unchanged
      })
    })

    it('handles multiple timecards with different resolutions', () => {
      const timecards = [
        createMockTimecard({ 
          id: '1',
          check_in_time: '2024-01-15T08:00:00Z',
          check_out_time: '2024-01-15T17:00:00Z',
          total_hours: 9.0,
          pay_rate: 25
        }),
        createMockTimecard({ 
          id: '2',
          total_hours: 8.0,
          pay_rate: 30
        })
      ]

      const resolutions = { 
        '1': 'add_break' as const,
        '2': 'no_break' as const
      }
      const updates = resolveTimecardBreaks(timecards, resolutions)

      expect(updates).toHaveLength(2)
      
      const update1 = updates.find(u => u.id === '1')
      const update2 = updates.find(u => u.id === '2')
      
      expect(update1?.break_duration).toBe(30)
      expect(update1?.total_hours).toBe(8.5)
      
      expect(update2?.break_duration).toBe(0)
      expect(update2?.total_hours).toBe(8.0)
    })

    it('skips timecards without resolutions', () => {
      const timecards = [
        createMockTimecard({ id: '1' }),
        createMockTimecard({ id: '2' })
      ]

      const resolutions = { '1': 'add_break' as const }
      const updates = resolveTimecardBreaks(timecards, resolutions)

      expect(updates).toHaveLength(1)
      expect(updates[0].id).toBe('1')
    })
  })
})