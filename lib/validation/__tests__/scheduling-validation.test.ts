import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDateValidationSchema,
  createDateArrayValidationSchema,
  createStaffAvailabilityValidationSchema,
  createTalentSchedulingValidationSchema,
  createTalentGroupValidationSchema,
  createAssignmentValidationSchema,
  validateScheduleConsistency,
  validateAvailabilityConsistency,
  validateGroupMemberIntegrity,
  formatValidationErrors
} from '../scheduling-validation'
import { ProjectSchedule } from '@/lib/types'
import { z } from 'zod'

describe('Scheduling Validation', () => {
  let mockProjectSchedule: ProjectSchedule

  beforeEach(() => {
    mockProjectSchedule = {
      startDate: new Date('2024-01-15T00:00:00'),
      endDate: new Date('2024-01-17T00:00:00'),
      rehearsalDates: [
        new Date('2024-01-15T00:00:00'),
        new Date('2024-01-16T00:00:00')
      ],
      showDates: [new Date('2024-01-17T00:00:00')],
      allDates: [
        new Date('2024-01-15T00:00:00'),
        new Date('2024-01-16T00:00:00'),
        new Date('2024-01-17T00:00:00')
      ],
      isSingleDay: false
    }
  })

  describe('Date Validation', () => {
    it('should validate correct date format', () => {
      const schema = createDateValidationSchema(mockProjectSchedule)
      
      expect(() => schema.parse('2024-01-16')).not.toThrow()
    })

    it('should reject invalid date format', () => {
      const schema = createDateValidationSchema(mockProjectSchedule)
      
      expect(() => schema.parse('2024/01/16')).toThrow()
      expect(() => schema.parse('invalid-date')).toThrow()
      expect(() => schema.parse('2024-13-01')).toThrow()
    })

    it('should reject dates outside project range', () => {
      const schema = createDateValidationSchema(mockProjectSchedule)
      
      expect(() => schema.parse('2024-01-14')).toThrow() // Before start
      expect(() => schema.parse('2024-01-18')).toThrow() // After end
    })

    it('should accept dates within project range', () => {
      const schema = createDateValidationSchema(mockProjectSchedule)
      
      expect(() => schema.parse('2024-01-15')).not.toThrow() // Start date
      expect(() => schema.parse('2024-01-16')).not.toThrow() // Middle date
      expect(() => schema.parse('2024-01-17')).not.toThrow() // End date
    })
  })

  describe('Date Array Validation', () => {
    it('should validate correct date arrays', () => {
      const schema = createDateArrayValidationSchema(mockProjectSchedule)
      
      expect(() => schema.parse(['2024-01-15', '2024-01-16'])).not.toThrow()
    })

    it('should reject empty date arrays', () => {
      const schema = createDateArrayValidationSchema(mockProjectSchedule)
      
      expect(() => schema.parse([])).toThrow()
    })

    it('should reject duplicate dates', () => {
      const schema = createDateArrayValidationSchema(mockProjectSchedule)
      
      expect(() => schema.parse(['2024-01-15', '2024-01-15'])).toThrow()
    })

    it('should reject non-chronological dates', () => {
      const schema = createDateArrayValidationSchema(mockProjectSchedule)
      
      expect(() => schema.parse(['2024-01-16', '2024-01-15'])).toThrow()
    })
  })

  describe('Staff Availability Validation', () => {
    it('should validate correct staff availability', () => {
      const schema = createStaffAvailabilityValidationSchema(mockProjectSchedule)
      
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        availableDates: ['2024-01-15', '2024-01-16']
      }
      
      expect(() => schema.parse(validData)).not.toThrow()
    })

    it('should reject invalid UUIDs', () => {
      const schema = createStaffAvailabilityValidationSchema(mockProjectSchedule)
      
      const invalidData = {
        userId: 'invalid-uuid',
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        availableDates: ['2024-01-15']
      }
      
      expect(() => schema.parse(invalidData)).toThrow()
    })

    it('should reject availability for too many dates', () => {
      const schema = createStaffAvailabilityValidationSchema(mockProjectSchedule)
      
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        availableDates: ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18'] // More than project duration
      }
      
      expect(() => schema.parse(invalidData)).toThrow()
    })
  })

  describe('Talent Group Validation', () => {
    it('should validate correct talent group', () => {
      const schema = createTalentGroupValidationSchema(mockProjectSchedule)
      
      const validData = {
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        groupName: 'The Band',
        members: [
          { name: 'John Doe', role: 'Lead Guitar' },
          { name: 'Jane Smith', role: 'Vocals' }
        ],
        scheduledDates: ['2024-01-15', '2024-01-17'],
        pointOfContactName: 'Manager Name',
        pointOfContactPhone: '555-123-4567'
      }
      
      expect(() => schema.parse(validData)).not.toThrow()
    })

    it('should reject invalid group names', () => {
      const schema = createTalentGroupValidationSchema(mockProjectSchedule)
      
      const invalidData = {
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        groupName: '', // Empty name
        members: [{ name: 'John Doe', role: 'Guitar' }]
      }
      
      expect(() => schema.parse(invalidData)).toThrow()
    })

    it('should reject groups with no members', () => {
      const schema = createTalentGroupValidationSchema(mockProjectSchedule)
      
      const invalidData = {
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        groupName: 'Empty Group',
        members: []
      }
      
      expect(() => schema.parse(invalidData)).toThrow()
    })

    it('should reject groups with too many members', () => {
      const schema = createTalentGroupValidationSchema(mockProjectSchedule)
      
      const members = Array.from({ length: 21 }, (_, i) => ({
        name: `Member ${i + 1}`,
        role: 'Performer'
      }))
      
      const invalidData = {
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        groupName: 'Large Group',
        members
      }
      
      expect(() => schema.parse(invalidData)).toThrow()
    })
  })

  describe('Assignment Validation', () => {
    it('should validate correct assignments', () => {
      const schema = createAssignmentValidationSchema(mockProjectSchedule)
      
      const validData = {
        date: '2024-01-16',
        talents: [{
          talentId: '123e4567-e89b-12d3-a456-426614174000',
          escortIds: ['123e4567-e89b-12d3-a456-426614174001']
        }],
        groups: [{
          groupId: '123e4567-e89b-12d3-a456-426614174002',
          escortIds: ['123e4567-e89b-12d3-a456-426614174003']
        }]
      }
      
      expect(() => schema.parse(validData)).not.toThrow()
    })

    it('should reject escort double-booking', () => {
      const schema = createAssignmentValidationSchema(mockProjectSchedule)
      
      const sameEscortId = '123e4567-e89b-12d3-a456-426614174001'
      const invalidData = {
        date: '2024-01-16',
        talents: [{
          talentId: '123e4567-e89b-12d3-a456-426614174000',
          escortIds: [sameEscortId]
        }],
        groups: [{
          groupId: '123e4567-e89b-12d3-a456-426614174002',
          escortIds: [sameEscortId] // Same escort assigned to both
        }]
      }
      
      expect(() => schema.parse(invalidData)).toThrow()
    })

    it('should reject too many escorts for talent', () => {
      const schema = createAssignmentValidationSchema(mockProjectSchedule)
      
      const tooManyEscorts = Array.from({ length: 6 }, (_, i) => 
        `123e4567-e89b-12d3-a456-42661417400${i}`
      )
      
      const invalidData = {
        date: '2024-01-16',
        talents: [{
          talentId: '123e4567-e89b-12d3-a456-426614174000',
          escortIds: tooManyEscorts
        }],
        groups: []
      }
      
      expect(() => schema.parse(invalidData)).toThrow()
    })
  })

  describe('Schedule Consistency Validation', () => {
    it('should validate consistent schedules', () => {
      const talentScheduledDates = ['2024-01-15', '2024-01-16']
      const assignmentDate = '2024-01-16'
      
      const result = validateScheduleConsistency(
        talentScheduledDates,
        assignmentDate,
        mockProjectSchedule
      )
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject assignment on unscheduled date', () => {
      const talentScheduledDates = ['2024-01-15']
      const assignmentDate = '2024-01-16' // Not in scheduled dates
      
      const result = validateScheduleConsistency(
        talentScheduledDates,
        assignmentDate,
        mockProjectSchedule
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Cannot assign escort to talent on a day they are not scheduled')
    })

    it('should reject assignment outside project range', () => {
      const talentScheduledDates = ['2024-01-15']
      const assignmentDate = '2024-01-18' // Outside project range
      
      const result = validateScheduleConsistency(
        talentScheduledDates,
        assignmentDate,
        mockProjectSchedule
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Assignment date is outside project date range')
    })
  })

  describe('Availability Consistency Validation', () => {
    it('should validate consistent availability', () => {
      const escortAvailableDates = ['2024-01-15', '2024-01-16']
      const assignmentDate = '2024-01-16'
      
      const result = validateAvailabilityConsistency(
        escortAvailableDates,
        assignmentDate
      )
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject assignment when escort not available', () => {
      const escortAvailableDates = ['2024-01-15']
      const assignmentDate = '2024-01-16' // Not in available dates
      
      const result = validateAvailabilityConsistency(
        escortAvailableDates,
        assignmentDate
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Cannot assign escort who is not available on this date')
    })
  })

  describe('Group Member Integrity Validation', () => {
    it('should validate correct group members', () => {
      const members = [
        { name: 'John Doe', role: 'Lead Guitar' },
        { name: 'Jane Smith', role: 'Vocals' }
      ]
      
      const result = validateGroupMemberIntegrity(members)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty member names', () => {
      const members = [
        { name: '', role: 'Guitar' },
        { name: 'Jane Smith', role: 'Vocals' }
      ]
      
      const result = validateGroupMemberIntegrity(members)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('All group members must have a name')
    })

    it('should reject duplicate member names', () => {
      const members = [
        { name: 'John Doe', role: 'Guitar' },
        { name: 'john doe', role: 'Vocals' } // Case-insensitive duplicate
      ]
      
      const result = validateGroupMemberIntegrity(members)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Group members must have unique names')
    })

    it('should reject invalid characters in names', () => {
      const members = [
        { name: 'John123', role: 'Guitar' } // Numbers not allowed
      ]
      
      const result = validateGroupMemberIntegrity(members)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Member names can only contain letters, spaces, hyphens, and apostrophes')
    })

    it('should reject excessively long names', () => {
      const longName = 'a'.repeat(101)
      const members = [
        { name: longName, role: 'Guitar' }
      ]
      
      const result = validateGroupMemberIntegrity(members)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Member names cannot exceed 100 characters')
    })
  })

  describe('Validation Error Formatting', () => {
    it('should format validation errors correctly', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email')
      })
      
      try {
        schema.parse({ name: '', email: 'invalid' })
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatValidationErrors(error)
          
          expect(formatted).toHaveLength(2)
          expect(formatted[0]).toEqual({
            field: 'name',
            message: 'Name is required',
            code: 'too_small'
          })
          expect(formatted[1]).toEqual({
            field: 'email',
            message: 'Invalid email',
            code: 'invalid_string'
          })
        }
      }
    })
  })
})