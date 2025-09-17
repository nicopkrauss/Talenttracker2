import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CriteriaValidator, ValidationResult, CriteriaValidationError } from '../criteria-validator'

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn().mockReturnValue({ value: 'mock-cookie' })
  })
}))

describe('CriteriaValidator', () => {
  let validator: CriteriaValidator
  let mockSupabaseClient: any
  const mockProjectId = 'test-project-id'

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }
    
    validator = new CriteriaValidator(mockSupabaseClient)
  })

  describe('validatePrepCompletion', () => {
    it('should validate project basic information correctly', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            name: 'Test Project',
            description: 'Test Description',
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            timezone: 'America/New_York',
            rehearsal_start_date: '2024-01-15',
            show_end_date: '2024-01-30'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: [], // Empty locations
          error: null
        })
        .mockResolvedValueOnce({
          data: [], // Empty role templates
          error: null
        })

      const result = await validator.validatePrepCompletion(mockProjectId)

      expect(result.completedItems).toContain('Project name defined')
      expect(result.completedItems).toContain('Project description provided')
      expect(result.completedItems).toContain('Project start date set')
      expect(result.completedItems).toContain('Project end date set')
      expect(result.completedItems).toContain('Project timezone configured')
      expect(result.blockers).toContain('At least one project location must be defined')
      expect(result.blockers).toContain('At least one role template must be defined')
      expect(result.isComplete).toBe(false)
    })

    it('should return incomplete validation when project name is missing', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            name: '',
            description: 'Test Description',
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            timezone: 'America/New_York'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ id: 'loc1' }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ id: 'role1' }],
          error: null
        })

      const result = await validator.validatePrepCompletion(mockProjectId)

      expect(result.isComplete).toBe(false)
      expect(result.pendingItems).toContain('Project name required')
    })

    it('should return blockers when critical fields are missing', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            name: 'Test Project',
            description: 'Test Description',
            start_date: null,
            end_date: null,
            timezone: null
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: [],
          error: null
        })
        .mockResolvedValueOnce({
          data: [],
          error: null
        })

      const result = await validator.validatePrepCompletion(mockProjectId)

      expect(result.isComplete).toBe(false)
      expect(result.blockers).toContain('Start date is required for scheduling')
      expect(result.blockers).toContain('End date is required for scheduling')
      expect(result.blockers).toContain('Timezone is required for phase transitions')
      expect(result.blockers).toContain('At least one project location must be defined')
      expect(result.blockers).toContain('At least one role template must be defined')
    })

    it('should throw validation error when database query fails', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(validator.validatePrepCompletion(mockProjectId))
        .rejects.toThrow('Failed to fetch project data')
    })
  })

  describe('validateStaffingCompletion', () => {
    it('should validate team assignments correctly', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: [
            { id: 'team1', role: 'supervisor', user_id: 'user1', profiles: { full_name: 'John Doe' } },
            { id: 'team2', role: 'coordinator', user_id: 'user2', profiles: { full_name: 'Jane Smith' } }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            { id: 'talent1', talent_id: 'tal1', talent: { first_name: 'Actor', last_name: 'One' } }
          ],
          error: null
        })

      const result = await validator.validateStaffingCompletion(mockProjectId)

      expect(result.completedItems).toContain('2 team members assigned')
      expect(result.completedItems).toContain('1 talent assigned to project')
      expect(result.completedItems).toContain('Essential roles (supervisor, coordinator) assigned')
      expect(result.blockers).toHaveLength(0)
      expect(result.isComplete).toBe(true)
    })

    it('should return incomplete when no team members are assigned', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: [],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ id: 'talent1' }],
          error: null
        })

      const result = await validator.validateStaffingCompletion(mockProjectId)

      expect(result.isComplete).toBe(false)
      expect(result.blockers).toContain('At least one team member must be assigned')
      expect(result.blockers).toContain('Supervisor and coordinator roles must be assigned')
    })
  })

  describe('validatePreShowReadiness', () => {
    it('should validate checklist completion', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            roles_finalized: true,
            locations_finalized: true,
            talent_roster_finalized: true,
            team_assignments_finalized: true
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            rehearsal_start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            timezone: 'America/New_York'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            { id: 'escort1', assigned_escort_id: 'user1' },
            { id: 'escort2', assigned_escort_id: 'user2' },
            { id: 'escort3', assigned_escort_id: 'user3' },
            { id: 'escort4', assigned_escort_id: 'user4' }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            { id: 'talent1' },
            { id: 'talent2' },
            { id: 'talent3' },
            { id: 'talent4' },
            { id: 'talent5' }
          ],
          error: null
        })

      const result = await validator.validatePreShowReadiness(mockProjectId)

      expect(result.completedItems).toContain('Project roles finalized')
      expect(result.completedItems).toContain('Rehearsal start date configured')
      expect(result.completedItems).toContain('80% of talent have assigned escorts')
      expect(result.isComplete).toBe(true)
    })

    it('should handle missing checklist gracefully', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' } // No rows returned
        })
        .mockResolvedValueOnce({
          data: { rehearsal_start_date: '2024-01-15', timezone: 'America/New_York' },
          error: null
        })
        .mockResolvedValueOnce({
          data: [],
          error: null
        })
        .mockResolvedValueOnce({
          data: [],
          error: null
        })

      const result = await validator.validatePreShowReadiness(mockProjectId)

      expect(result.isComplete).toBe(false)
      expect(result.blockers).toContain('Setup checklist must be completed')
    })
  })

  describe('validateTimecardCompletion', () => {
    it('should validate timecard status correctly', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: [
            { id: 'tc1', status: 'paid', user_id: 'user1', profiles: { full_name: 'John Doe' } },
            { id: 'tc2', status: 'paid', user_id: 'user2', profiles: { full_name: 'Jane Smith' } }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            { user_id: 'user1', profiles: { full_name: 'John Doe' } },
            { user_id: 'user2', profiles: { full_name: 'Jane Smith' } }
          ],
          error: null
        })

      const result = await validator.validateTimecardCompletion(mockProjectId)

      expect(result.completedItems).toContain('2 timecards paid')
      expect(result.completedItems).toContain('All timecards have been paid')
      expect(result.completedItems).toContain('All team members have submitted timecards')
      expect(result.isComplete).toBe(true)
    })

    it('should return incomplete when no timecards are submitted', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await validator.validateTimecardCompletion(mockProjectId)

      expect(result.isComplete).toBe(false)
      expect(result.pendingItems).toContain('No timecards submitted')
      expect(result.blockers).toContain('Timecards must be submitted before project completion')
    })

    it('should identify missing timecard submissions', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: [
            { id: 'tc1', status: 'paid', user_id: 'user1', profiles: { full_name: 'John Doe' } }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            { user_id: 'user1', profiles: { full_name: 'John Doe' } },
            { user_id: 'user2', profiles: { full_name: 'Jane Smith' } },
            { user_id: 'user3', profiles: { full_name: 'Bob Johnson' } }
          ],
          error: null
        })

      const result = await validator.validateTimecardCompletion(mockProjectId)

      expect(result.isComplete).toBe(false)
      expect(result.pendingItems).toContain('Missing timecard submissions from: Jane Smith, Bob Johnson')
      expect(result.blockers).toContain('All team members must submit timecards')
    })
  })

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockSupabaseClient.single.mockRejectedValueOnce(new Error('Unexpected error'))

      try {
        await validator.validatePrepCompletion(mockProjectId)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const validationError = error as CriteriaValidationError
        expect(validationError.code).toBe('VALIDATION_ERROR')
        expect(validationError.message).toBe('Failed to validate prep completion')
      }
    })

    it('should create proper validation errors', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' }
      })

      try {
        await validator.validatePrepCompletion(mockProjectId)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const validationError = error as CriteriaValidationError
        expect(validationError.code).toBe('DATABASE_ERROR')
        expect(validationError.message).toBe('Failed to fetch project data')
        expect(validationError.details).toBeDefined()
      }
    })
  })
})