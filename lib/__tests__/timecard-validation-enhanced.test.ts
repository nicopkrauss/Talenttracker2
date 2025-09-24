import { describe, it, expect } from 'vitest'
import { 
  validateTimecardSubmission, 
  canEditTimecard, 
  getTimecardEditRestrictionMessage 
} from '../timecard-validation'
import type { Timecard } from '../types'

describe('Enhanced Timecard Validation', () => {
  const mockTimecard: Timecard = {
    id: '1',
    user_id: 'user1',
    project_id: 'project1',
    date: '2024-01-15',
    check_in_time: '2024-01-15T09:00:00Z',
    check_out_time: '2024-01-15T17:00:00Z',
    break_start_time: '2024-01-15T12:00:00Z',
    break_end_time: '2024-01-15T12:30:00Z',
    total_hours: 8,
    break_duration: 30,
    pay_rate: 25,
    total_pay: 200,
    status: 'draft',
    manually_edited: false,
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z'
  }

  describe('Show Day Submission Timing Validation (Requirement 7.5)', () => {
    it('should allow submission when show day has begun', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const projectStartDate = yesterday.toISOString().split('T')[0]

      const result = validateTimecardSubmission([mockTimecard], projectStartDate)
      
      expect(result.canSubmit).toBe(true)
      expect(result.errors).not.toContain(expect.stringContaining('Timecard submission is not available until show day begins'))
    })

    it('should block submission when show day has not begun', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const projectStartDate = tomorrow.toISOString().split('T')[0]

      const result = validateTimecardSubmission([mockTimecard], projectStartDate)
      
      expect(result.canSubmit).toBe(false)
      expect(result.errors.some(error => error.includes('Timecard submission is not available until show day begins'))).toBe(true)
    })

    it('should allow submission on the exact show day', () => {
      const today = new Date()
      const projectStartDate = today.toISOString().split('T')[0]

      const result = validateTimecardSubmission([mockTimecard], projectStartDate)
      
      expect(result.canSubmit).toBe(true)
      expect(result.errors).not.toContain(expect.stringContaining('Timecard submission is not available until show day begins'))
    })

    it('should work without project start date (no show day validation)', () => {
      const result = validateTimecardSubmission([mockTimecard])
      
      expect(result.canSubmit).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Post-Submission View Restrictions (Requirement 4.8)', () => {
    describe('canEditTimecard', () => {
      it('should allow editing draft timecards', () => {
        const draftTimecard = { ...mockTimecard, status: 'draft' as const }
        expect(canEditTimecard(draftTimecard)).toBe(true)
      })

      it('should not allow editing submitted timecards', () => {
        const submittedTimecard = { ...mockTimecard, status: 'submitted' as const }
        expect(canEditTimecard(submittedTimecard)).toBe(false)
      })

      it('should not allow editing approved timecards', () => {
        const approvedTimecard = { ...mockTimecard, status: 'approved' as const }
        expect(canEditTimecard(approvedTimecard)).toBe(false)
      })

      it('should not allow editing rejected timecards initially', () => {
        const rejectedTimecard = { ...mockTimecard, status: 'rejected' as const }
        expect(canEditTimecard(rejectedTimecard)).toBe(false)
      })
    })

    describe('getTimecardEditRestrictionMessage', () => {
      it('should return null for draft timecards (no restriction)', () => {
        const draftTimecard = { ...mockTimecard, status: 'draft' as const }
        expect(getTimecardEditRestrictionMessage(draftTimecard)).toBeNull()
      })

      it('should return appropriate message for submitted timecards', () => {
        const submittedTimecard = { ...mockTimecard, status: 'submitted' as const }
        const message = getTimecardEditRestrictionMessage(submittedTimecard)
        
        expect(message).toContain('submitted and cannot be edited')
        expect(message).toContain('Contact your supervisor')
      })

      it('should return appropriate message for approved timecards', () => {
        const approvedTimecard = { ...mockTimecard, status: 'approved' as const }
        const message = getTimecardEditRestrictionMessage(approvedTimecard)
        
        expect(message).toContain('approved and cannot be edited')
      })

      it('should return appropriate message for rejected timecards', () => {
        const rejectedTimecard = { ...mockTimecard, status: 'rejected' as const }
        const message = getTimecardEditRestrictionMessage(rejectedTimecard)
        
        expect(message).toContain('rejected')
        expect(message).toContain('make corrections and resubmit')
      })
    })
  })

  describe('Combined Validation Scenarios', () => {
    it('should handle multiple validation issues (missing breaks + show day)', () => {
      const longShiftTimecard: Timecard = {
        ...mockTimecard,
        total_hours: 8,
        break_start_time: undefined,
        break_end_time: undefined,
        break_duration: 0
      }

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const projectStartDate = tomorrow.toISOString().split('T')[0]

      const result = validateTimecardSubmission([longShiftTimecard], projectStartDate)
      
      expect(result.canSubmit).toBe(false)
      expect(result.errors.some(error => error.includes('missing break information'))).toBe(true)
      expect(result.errors.some(error => error.includes('Timecard submission is not available until show day begins'))).toBe(true)
      expect(result.missingBreaks).toHaveLength(1)
    })

    it('should pass validation when all requirements are met', () => {
      const validTimecard = {
        ...mockTimecard,
        break_start_time: '2024-01-15T12:00:00Z',
        break_end_time: '2024-01-15T12:30:00Z',
        break_duration: 30
      }

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const projectStartDate = yesterday.toISOString().split('T')[0]

      const result = validateTimecardSubmission([validTimecard], projectStartDate)
      
      expect(result.canSubmit).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.missingBreaks).toHaveLength(0)
    })
  })
})