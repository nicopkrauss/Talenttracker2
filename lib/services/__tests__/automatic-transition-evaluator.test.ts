/**
 * Tests for Automatic Transition Evaluator
 * 
 * Tests the automatic transition evaluation system including:
 * - Real-time phase evaluation
 * - Timezone-aware transition calculations
 * - Error handling and monitoring
 * - Transition execution logic
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { AutomaticTransitionEvaluator } from '../automatic-transition-evaluator'
import { ProjectPhase } from '../phase-engine'

// Mock the dependencies
vi.mock('../phase-engine')
vi.mock('../criteria-validator')
vi.mock('../timezone-service')
vi.mock('@supabase/ssr')
vi.mock('next/headers')

describe('AutomaticTransitionEvaluator', () => {
  let evaluator: AutomaticTransitionEvaluator
  let mockSupabase: any
  let mockPhaseEngine: any
  let mockCriteriaValidator: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn()
    }

    // Mock cookies
    vi.mocked(require('next/headers').cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'mock-cookie' })
    })

    // Mock createServerClient
    vi.mocked(require('@supabase/ssr').createServerClient).mockReturnValue(mockSupabase)

    // Mock PhaseEngine
    mockPhaseEngine = {
      getCurrentPhase: vi.fn(),
      evaluateTransition: vi.fn(),
      executeTransition: vi.fn()
    }
    vi.mocked(require('../phase-engine').PhaseEngine).mockImplementation(() => mockPhaseEngine)

    // Mock CriteriaValidator
    mockCriteriaValidator = {
      validatePrepCompletion: vi.fn(),
      validateStaffingCompletion: vi.fn(),
      validatePreShowReadiness: vi.fn(),
      validateTimecardCompletion: vi.fn()
    }
    vi.mocked(require('../criteria-validator').CriteriaValidator).mockImplementation(() => mockCriteriaValidator)

    // Create evaluator instance
    evaluator = new AutomaticTransitionEvaluator({
      dryRun: true,
      alertOnFailure: false
    })
  })

  describe('evaluateAllProjects', () => {
    it('should evaluate all projects with auto-transitions enabled', async () => {
      // Mock projects data
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project 1',
          status: ProjectPhase.PRE_SHOW,
          auto_transitions_enabled: true,
          rehearsal_start_date: '2024-03-15',
          timezone: 'America/New_York'
        },
        {
          id: 'project-2',
          name: 'Test Project 2',
          status: ProjectPhase.ACTIVE,
          auto_transitions_enabled: true,
          show_end_date: '2024-03-20',
          timezone: 'America/Los_Angeles'
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockProjects,
        error: null
      })

      // Mock phase engine evaluations
      mockPhaseEngine.evaluateTransition
        .mockResolvedValueOnce({
          canTransition: true,
          targetPhase: ProjectPhase.ACTIVE,
          blockers: [],
          reason: 'Rehearsal start time has arrived'
        })
        .mockResolvedValueOnce({
          canTransition: false,
          targetPhase: null,
          blockers: ['Show has not ended yet'],
          reason: 'Waiting for show end'
        })

      const result = await evaluator.evaluateAllProjects()

      expect(result.totalProjects).toBe(2)
      expect(result.evaluatedProjects).toBe(2)
      expect(result.failedTransitions).toBe(0)
      expect(mockPhaseEngine.evaluateTransition).toHaveBeenCalledTimes(2)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      await expect(evaluator.evaluateAllProjects()).rejects.toThrow('Failed to fetch projects: Database connection failed')
    })

    it('should handle empty project list', async () => {
      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await evaluator.evaluateAllProjects()

      expect(result.totalProjects).toBe(0)
      expect(result.evaluatedProjects).toBe(0)
      expect(result.successfulTransitions).toBe(0)
    })
  })

  describe('evaluateProjectTransition', () => {
    it('should evaluate time-based transition (pre-show to active)', async () => {
      const mockProject = {
        id: 'project-1',
        status: ProjectPhase.PRE_SHOW,
        rehearsal_start_date: '2024-03-15',
        timezone: 'America/New_York'
      }

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: ProjectPhase.ACTIVE,
        blockers: [],
        reason: 'Rehearsal start time has arrived'
      })

      // Mock TimezoneService
      const mockTimezoneService = require('../timezone-service').TimezoneService
      mockTimezoneService.getProjectTimezone = vi.fn().mockReturnValue('America/New_York')
      mockTimezoneService.calculateTransitionTime = vi.fn().mockReturnValue(new Date('2024-03-15T00:00:00-05:00'))
      mockTimezoneService.getCurrentTimeInTimezone = vi.fn().mockReturnValue(new Date('2024-03-15T01:00:00-05:00'))

      const evaluation = await evaluator.evaluateProjectTransition(mockProject)

      expect(evaluation.projectId).toBe('project-1')
      expect(evaluation.currentPhase).toBe(ProjectPhase.PRE_SHOW)
      expect(evaluation.shouldTransition).toBe(true)
      expect(evaluation.scheduledAt).toBeDefined()
    })

    it('should evaluate criteria-based transition (prep to staffing)', async () => {
      const mockProject = {
        id: 'project-1',
        status: ProjectPhase.PREP
      }

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: ProjectPhase.STAFFING,
        blockers: [],
        reason: 'Vital project information complete'
      })

      mockCriteriaValidator.validatePrepCompletion.mockResolvedValue({
        isComplete: true,
        completedItems: ['Project name defined', 'Roles configured'],
        pendingItems: [],
        blockers: []
      })

      const evaluation = await evaluator.evaluateProjectTransition(mockProject)

      expect(evaluation.projectId).toBe('project-1')
      expect(evaluation.currentPhase).toBe(ProjectPhase.PREP)
      expect(evaluation.shouldTransition).toBe(true)
      expect(mockCriteriaValidator.validatePrepCompletion).toHaveBeenCalledWith('project-1')
    })

    it('should handle evaluation errors', async () => {
      const mockProject = {
        id: 'project-1',
        status: ProjectPhase.PREP
      }

      mockPhaseEngine.evaluateTransition.mockRejectedValue(new Error('Phase engine error'))

      const evaluation = await evaluator.evaluateProjectTransition(mockProject)

      expect(evaluation.projectId).toBe('project-1')
      expect(evaluation.shouldTransition).toBe(false)
      expect(evaluation.error).toBe('Phase engine error')
      expect(evaluation.evaluation.blockers).toContain('Evaluation error: Phase engine error')
    })

    it('should skip phases not enabled for automatic transitions', async () => {
      const evaluatorWithLimitedPhases = new AutomaticTransitionEvaluator({
        enabledPhases: [ProjectPhase.ACTIVE], // Only active phase enabled
        dryRun: true
      })

      const mockProject = {
        id: 'project-1',
        status: ProjectPhase.PREP // Not in enabled phases
      }

      const evaluation = await evaluatorWithLimitedPhases.evaluateProjectTransition(mockProject)

      expect(evaluation.shouldTransition).toBe(false)
      expect(evaluation.evaluation.blockers).toContain('Phase not enabled for automatic transitions')
    })
  })

  describe('timezone-aware calculations', () => {
    it('should calculate correct transition time for different timezones', async () => {
      const mockProject = {
        id: 'project-1',
        status: ProjectPhase.PRE_SHOW,
        rehearsal_start_date: '2024-03-15',
        timezone: 'America/Los_Angeles'
      }

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: ProjectPhase.ACTIVE,
        blockers: []
      })

      const mockTimezoneService = require('../timezone-service').TimezoneService
      mockTimezoneService.getProjectTimezone = vi.fn().mockReturnValue('America/Los_Angeles')
      mockTimezoneService.calculateTransitionTime = vi.fn().mockReturnValue(new Date('2024-03-15T00:00:00-08:00'))

      const evaluation = await evaluator.evaluateProjectTransition(mockProject)

      expect(mockTimezoneService.getProjectTimezone).toHaveBeenCalledWith(mockProject)
      expect(mockTimezoneService.calculateTransitionTime).toHaveBeenCalledWith(
        new Date('2024-03-15'),
        '00:00',
        'America/Los_Angeles'
      )
    })

    it('should handle post-show transition with custom hour', async () => {
      const mockProject = {
        id: 'project-1',
        status: ProjectPhase.ACTIVE,
        show_end_date: '2024-03-20',
        timezone: 'America/New_York',
        project_settings: {
          post_show_transition_hour: 8 // 8 AM instead of default 6 AM
        }
      }

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: ProjectPhase.POST_SHOW,
        blockers: []
      })

      const mockTimezoneService = require('../timezone-service').TimezoneService
      mockTimezoneService.getProjectTimezone = vi.fn().mockReturnValue('America/New_York')
      mockTimezoneService.calculateTransitionTime = vi.fn().mockReturnValue(new Date('2024-03-21T08:00:00-05:00'))

      await evaluator.evaluateProjectTransition(mockProject)

      expect(mockTimezoneService.calculateTransitionTime).toHaveBeenCalledWith(
        expect.any(Date),
        '08:00',
        'America/New_York'
      )
    })
  })

  describe('error handling and monitoring', () => {
    it('should log automatic transition attempts', async () => {
      const mockProject = {
        id: 'project-1',
        status: ProjectPhase.PRE_SHOW,
        auto_transitions_enabled: true
      }

      mockSupabase.select.mockResolvedValue({
        data: [mockProject],
        error: null
      })

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: ProjectPhase.ACTIVE,
        blockers: []
      })

      mockSupabase.insert.mockResolvedValue({ error: null })

      await evaluator.evaluateAllProjects()

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'automatic_transition_attempt',
          project_id: 'project-1'
        })
      )
    })

    it('should handle transition execution failures', async () => {
      const evaluatorWithExecution = new AutomaticTransitionEvaluator({
        dryRun: false // Enable actual execution
      })

      const mockProject = {
        id: 'project-1',
        status: ProjectPhase.PRE_SHOW,
        auto_transitions_enabled: true
      }

      mockSupabase.select.mockResolvedValue({
        data: [mockProject],
        error: null
      })

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: ProjectPhase.ACTIVE,
        blockers: []
      })

      mockPhaseEngine.executeTransition.mockRejectedValue(new Error('Transition failed'))
      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await evaluatorWithExecution.evaluateAllProjects()

      expect(result.failedTransitions).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toBe('Transition failed')
    })
  })

  describe('getScheduledTransitions', () => {
    it('should return upcoming scheduled transitions', async () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now

      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project 1',
          status: ProjectPhase.PRE_SHOW,
          auto_transitions_enabled: true,
          rehearsal_start_date: futureDate.toISOString().split('T')[0],
          timezone: 'America/New_York'
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockProjects,
        error: null
      })

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: ProjectPhase.ACTIVE,
        blockers: []
      })

      const mockTimezoneService = require('../timezone-service').TimezoneService
      mockTimezoneService.getProjectTimezone = vi.fn().mockReturnValue('America/New_York')
      mockTimezoneService.calculateTransitionTime = vi.fn().mockReturnValue(futureDate)

      const scheduled = await evaluator.getScheduledTransitions(24)

      expect(scheduled).toHaveLength(1)
      expect(scheduled[0].projectId).toBe('project-1')
      expect(scheduled[0].targetPhase).toBe(ProjectPhase.ACTIVE)
      expect(scheduled[0].scheduledAt).toEqual(futureDate)
    })

    it('should filter out past transitions', async () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago

      const mockProjects = [
        {
          id: 'project-1',
          name: 'Test Project 1',
          status: ProjectPhase.PRE_SHOW,
          auto_transitions_enabled: true,
          rehearsal_start_date: pastDate.toISOString().split('T')[0],
          timezone: 'America/New_York'
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockProjects,
        error: null
      })

      mockPhaseEngine.evaluateTransition.mockResolvedValue({
        canTransition: true,
        targetPhase: ProjectPhase.ACTIVE,
        blockers: []
      })

      const mockTimezoneService = require('../timezone-service').TimezoneService
      mockTimezoneService.getProjectTimezone = vi.fn().mockReturnValue('America/New_York')
      mockTimezoneService.calculateTransitionTime = vi.fn().mockReturnValue(pastDate)

      const scheduled = await evaluator.getScheduledTransitions(24)

      expect(scheduled).toHaveLength(0)
    })
  })
})