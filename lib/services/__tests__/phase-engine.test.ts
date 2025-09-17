import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PhaseEngine, ProjectPhase, TransitionTrigger } from '../phase-engine'

// Create a simple mock that can be easily controlled
const createMockSupabaseClient = () => {
  const mockClient = {
    from: vi.fn(() => mockClient),
    select: vi.fn(() => mockClient),
    eq: vi.fn(() => mockClient),
    single: vi.fn(),
    neq: vi.fn(),
    update: vi.fn(() => mockClient),
    insert: vi.fn()
  }
  
  // Ensure eq returns an object with single method for chaining
  mockClient.eq.mockImplementation(() => ({
    single: mockClient.single,
    neq: mockClient.neq
  }))
  
  return mockClient
}

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' }))
  }))
}))

// Mock Supabase client creation
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient)
}))

describe('PhaseEngine', () => {
  let phaseEngine: PhaseEngine

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient()
    phaseEngine = new PhaseEngine()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getCurrentPhase', () => {
    it('should return current project phase', async () => {
      const mockProject = {
        status: 'prep',
        phase_updated_at: new Date().toISOString(),
        auto_transitions_enabled: true
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProject,
        error: null
      })

      const phase = await phaseEngine.getCurrentPhase('project-1')
      expect(phase).toBe(ProjectPhase.PREP)
    })

    it('should throw error when project not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null
      })

      await expect(phaseEngine.getCurrentPhase('nonexistent')).rejects.toThrow('Project nonexistent not found')
    })

    it('should throw error on database error', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(phaseEngine.getCurrentPhase('project-1')).rejects.toThrow('Failed to get project phase: Database error')
    })
  })

  describe('evaluateTransition', () => {
    it('should evaluate prep to staffing transition', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        project_setup_checklist: {
          roles_finalized: true,
          locations_finalized: true
        },
        project_settings: {}
      }

      // Mock getCurrentPhase call and project fetch
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      const result = await phaseEngine.evaluateTransition('project-1')
      
      expect(result.canTransition).toBe(true)
      expect(result.targetPhase).toBe(ProjectPhase.STAFFING)
      expect(result.blockers).toHaveLength(0)
    })

    it('should block prep to staffing when roles not finalized', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        project_setup_checklist: {
          roles_finalized: false,
          locations_finalized: true
        },
        project_settings: {}
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      const result = await phaseEngine.evaluateTransition('project-1')
      
      expect(result.canTransition).toBe(false)
      expect(result.targetPhase).toBe(null)
      expect(result.blockers).toContain('Project roles must be finalized')
    })

    it('should evaluate staffing to pre-show transition', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'staffing',
        project_setup_checklist: {
          team_assignments_finalized: true,
          talent_roster_finalized: true
        },
        project_settings: {}
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'staffing' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      const result = await phaseEngine.evaluateTransition('project-1')
      
      expect(result.canTransition).toBe(true)
      expect(result.targetPhase).toBe(ProjectPhase.PRE_SHOW)
    })

    it('should evaluate pre-show to active with scheduled transition', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7) // Set to next week to ensure it's definitely in the future
      
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'pre_show',
        rehearsal_start_date: futureDate.toISOString().split('T')[0],
        project_setup_checklist: {},
        project_settings: {}
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'pre_show' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      const result = await phaseEngine.evaluateTransition('project-1')
      
      expect(result.canTransition).toBe(false)
      expect(result.targetPhase).toBe(ProjectPhase.ACTIVE)
      expect(result.scheduledAt).toBeDefined()
      expect(result.blockers[0]).toContain('Scheduled to activate at')
    })

    it('should evaluate pre-show to active when rehearsal date has passed', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'pre_show',
        rehearsal_start_date: pastDate.toISOString().split('T')[0],
        project_setup_checklist: {},
        project_settings: {}
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'pre_show' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      const result = await phaseEngine.evaluateTransition('project-1')
      
      expect(result.canTransition).toBe(true)
      expect(result.targetPhase).toBe(ProjectPhase.ACTIVE)
    })

    it('should evaluate post-show to complete when timecards approved', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'post_show',
        project_setup_checklist: {},
        project_settings: {}
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'post_show' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      // Mock no pending timecards
      mockSupabaseClient.neq.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await phaseEngine.evaluateTransition('project-1')
      
      expect(result.canTransition).toBe(true)
      expect(result.targetPhase).toBe(ProjectPhase.COMPLETE)
    })

    it('should block post-show to complete when timecards pending', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'post_show',
        project_setup_checklist: {},
        project_settings: {}
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'post_show' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      // Mock pending timecards
      mockSupabaseClient.neq.mockResolvedValue({
        data: [{ id: 'timecard-1' }, { id: 'timecard-2' }],
        error: null
      })

      const result = await phaseEngine.evaluateTransition('project-1')
      
      expect(result.canTransition).toBe(false)
      expect(result.blockers).toContain('2 timecards pending approval')
    })
  })

  describe('executeTransition', () => {
    it('should execute valid transition successfully', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        project_setup_checklist: {
          roles_finalized: true,
          locations_finalized: true
        },
        project_settings: {}
      }

      // Mock getCurrentPhase calls and project fetch for evaluation
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null }) // getCurrentPhase in executeTransition
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null }) // getCurrentPhase in evaluateTransition
        .mockResolvedValueOnce({ data: mockProject, error: null }) // project fetch in evaluateTransition

      // Mock successful update - need to mock the eq method that comes after update
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })

      // Mock successful audit log insert
      mockSupabaseClient.insert.mockResolvedValue({
        error: null
      })

      await expect(
        phaseEngine.executeTransition('project-1', ProjectPhase.STAFFING, TransitionTrigger.MANUAL, 'user-1')
      ).resolves.not.toThrow()

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: ProjectPhase.STAFFING,
        phase_updated_at: expect.any(String),
        updated_at: expect.any(String)
      })
    })

    it('should throw error when transition not allowed', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        project_setup_checklist: {
          roles_finalized: false,
          locations_finalized: true
        },
        project_settings: {}
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null })
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      await expect(
        phaseEngine.executeTransition('project-1', ProjectPhase.STAFFING, TransitionTrigger.MANUAL)
      ).rejects.toThrow('Transition not allowed')
    })

    it('should throw error on database update failure', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        project_setup_checklist: {
          roles_finalized: true,
          locations_finalized: true
        },
        project_settings: {}
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null })
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null })
        .mockResolvedValueOnce({ data: mockProject, error: null })

      // Mock database update failure
      mockSupabaseClient.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' }
        })
      })

      await expect(
        phaseEngine.executeTransition('project-1', ProjectPhase.STAFFING, TransitionTrigger.MANUAL)
      ).rejects.toThrow('Failed to update project phase: Update failed')
    })
  })

  describe('getPhaseActionItems', () => {
    it('should return prep phase action items', async () => {
      const mockReadiness = {
        roles_finalized: false,
        locations_finalized: true,
        basic_info_complete: false
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'prep' }, error: null })
        .mockResolvedValueOnce({ data: mockReadiness, error: null })

      const items = await phaseEngine.getPhaseActionItems('project-1')
      
      expect(items).toHaveLength(2) // roles + basic info (locations already complete)
      expect(items.find(item => item.id === 'prep-roles')).toBeDefined()
      expect(items.find(item => item.id === 'prep-basic-info')).toBeDefined()
    })

    it('should return staffing phase action items', async () => {
      const mockReadiness = {
        team_assignments_finalized: false,
        talent_roster_finalized: false,
        hiring_complete: true
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'staffing' }, error: null })
        .mockResolvedValueOnce({ data: mockReadiness, error: null })

      const items = await phaseEngine.getPhaseActionItems('project-1')
      
      expect(items).toHaveLength(3)
      expect(items.find(item => item.id === 'staffing-team')).toBeDefined()
      expect(items.find(item => item.id === 'staffing-talent')).toBeDefined()
      expect(items.find(item => item.id === 'staffing-hiring')).toBeDefined()
    })

    it('should return post-show action items with pending timecards', async () => {
      const mockReadiness = {
        payroll_complete: false,
        wrap_up_complete: false
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'post_show' }, error: null })
        .mockResolvedValueOnce({ data: mockReadiness, error: null })

      // Mock pending timecards
      mockSupabaseClient.neq.mockResolvedValue({
        data: [{ id: 'timecard-1' }, { id: 'timecard-2' }],
        error: null
      })

      const items = await phaseEngine.getPhaseActionItems('project-1')
      
      expect(items).toHaveLength(3)
      expect(items.find(item => item.id === 'postshow-timecards')).toBeDefined()
      expect(items.find(item => item.id === 'postshow-payroll')).toBeDefined()
      expect(items.find(item => item.id === 'postshow-wrap-up')).toBeDefined()
    })

    it('should return empty array for archived projects', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { status: 'archived' }, error: null })

      const items = await phaseEngine.getPhaseActionItems('project-1')
      
      expect(items).toHaveLength(0)
    })

    it('should handle errors gracefully and return empty array', async () => {
      mockSupabaseClient.single
        .mockRejectedValue(new Error('Database error'))

      const items = await phaseEngine.getPhaseActionItems('project-1')
      
      expect(items).toHaveLength(0)
    })
  })
})