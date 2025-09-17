import { describe, it, expect } from 'vitest'
import { PhaseEngine, ProjectPhase } from '../phase-engine'

describe('Phase Action Items Integration', () => {
  describe('Action Item Generation Logic', () => {
    it('should generate prep phase action items with default readiness data', () => {
      const phaseEngine = new PhaseEngine()
      
      // Test the private method logic by creating a minimal readiness object
      const readiness = {
        roles_status: 'default-only',
        locations_status: 'default-only',
        total_staff_assigned: 0,
        total_talent: 0,
        escort_count: 0,
        supervisor_count: 0,
        coordinator_count: 0,
        team_finalized: false,
        talent_finalized: false,
        roles_finalized: false,
        locations_finalized: false,
        overall_status: 'getting-started',
        urgent_assignment_issues: 0
      }

      const project = {
        name: 'Test Project',
        status: 'prep',
        rehearsal_start_date: null,
        show_end_date: null
      }

      // Access the private method for testing (this is a workaround for testing)
      const items = (phaseEngine as any).generatePrepActionItems('test-project', readiness, project)
      
      expect(items).resolves.toBeDefined()
      expect(items).resolves.toBeInstanceOf(Array)
    })

    it('should generate staffing phase action items', () => {
      const phaseEngine = new PhaseEngine()
      
      const readiness = {
        roles_status: 'configured',
        locations_status: 'configured',
        total_staff_assigned: 0,
        total_talent: 0,
        escort_count: 0,
        supervisor_count: 0,
        coordinator_count: 0,
        team_finalized: false,
        talent_finalized: false,
        roles_finalized: true,
        locations_finalized: true,
        overall_status: 'getting-started',
        urgent_assignment_issues: 0
      }

      const project = {
        name: 'Test Project',
        status: 'staffing'
      }

      const items = (phaseEngine as any).generateStaffingActionItems('test-project', readiness, project)
      
      expect(items).resolves.toBeDefined()
      expect(items).resolves.toBeInstanceOf(Array)
    })

    it('should generate active phase action items', () => {
      const phaseEngine = new PhaseEngine()
      
      const readiness = {
        total_staff_assigned: 3,
        total_talent: 5,
        escort_count: 2,
        supervisor_count: 1,
        coordinator_count: 0,
        urgent_assignment_issues: 1
      }

      const project = {
        name: 'Test Project',
        status: 'active'
      }

      const items = (phaseEngine as any).generateActiveActionItems('test-project', readiness, project)
      
      expect(items).resolves.toBeDefined()
      expect(items).resolves.toBeInstanceOf(Array)
    })

    it('should generate complete phase action items', () => {
      const phaseEngine = new PhaseEngine()
      
      const readiness = {
        total_staff_assigned: 3,
        total_talent: 5
      }

      const project = {
        name: 'Test Project',
        status: 'complete',
        project_settings: {
          archive_month: 4,
          archive_day: 1
        }
      }

      const items = (phaseEngine as any).generateCompleteActionItems('test-project', readiness, project)
      
      expect(items).resolves.toBeDefined()
      expect(items).resolves.toBeInstanceOf(Array)
    })
  })

  describe('Phase-specific filtering', () => {
    it('should return different action items for different phases', async () => {
      const phaseEngine = new PhaseEngine()
      
      const readiness = {
        roles_status: 'default-only',
        locations_status: 'default-only',
        total_staff_assigned: 0,
        total_talent: 0,
        escort_count: 0,
        supervisor_count: 0,
        coordinator_count: 0,
        team_finalized: false,
        talent_finalized: false,
        roles_finalized: false,
        locations_finalized: false,
        overall_status: 'getting-started',
        urgent_assignment_issues: 0
      }

      const project = { name: 'Test Project', status: 'prep' }

      // Test prep phase items
      const prepItems = await (phaseEngine as any).generatePrepActionItems('test-project', readiness, project)
      expect(prepItems.length).toBeGreaterThan(0)
      expect(prepItems.some((item: any) => item.category === 'setup')).toBe(true)

      // Test staffing phase items
      const staffingItems = await (phaseEngine as any).generateStaffingActionItems('test-project', readiness, project)
      expect(staffingItems.length).toBeGreaterThan(0)
      expect(staffingItems.some((item: any) => item.category === 'staffing')).toBe(true)

      // Items should be different between phases
      expect(prepItems[0].id).not.toBe(staffingItems[0].id)
    })
  })

  describe('Action item properties', () => {
    it('should generate action items with required properties', async () => {
      const phaseEngine = new PhaseEngine()
      
      const readiness = {
        roles_status: 'default-only',
        locations_status: 'default-only',
        total_staff_assigned: 0,
        total_talent: 0,
        escort_count: 0,
        supervisor_count: 0,
        coordinator_count: 0,
        team_finalized: false,
        talent_finalized: false,
        roles_finalized: false,
        locations_finalized: false,
        overall_status: 'getting-started',
        urgent_assignment_issues: 0
      }

      const project = { name: 'Test Project', status: 'prep' }

      const items = await (phaseEngine as any).generatePrepActionItems('test-project', readiness, project)
      
      expect(items.length).toBeGreaterThan(0)
      
      items.forEach((item: any) => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('description')
        expect(item).toHaveProperty('category')
        expect(item).toHaveProperty('priority')
        expect(item).toHaveProperty('completed')
        expect(item).toHaveProperty('requiredForTransition')
        
        expect(typeof item.id).toBe('string')
        expect(typeof item.title).toBe('string')
        expect(typeof item.description).toBe('string')
        expect(typeof item.category).toBe('string')
        expect(['high', 'medium', 'low']).toContain(item.priority)
        expect(typeof item.completed).toBe('boolean')
        expect(typeof item.requiredForTransition).toBe('boolean')
      })
    })

    it('should mark critical items as required for transition', async () => {
      const phaseEngine = new PhaseEngine()
      
      const readiness = {
        roles_status: 'default-only',
        locations_status: 'default-only',
        total_staff_assigned: 0,
        total_talent: 0,
        escort_count: 0,
        supervisor_count: 0,
        coordinator_count: 0,
        team_finalized: false,
        talent_finalized: false,
        roles_finalized: false,
        locations_finalized: false,
        overall_status: 'getting-started',
        urgent_assignment_issues: 0
      }

      const project = { name: 'Test Project', status: 'prep' }

      const items = await (phaseEngine as any).generatePrepActionItems('test-project', readiness, project)
      
      // Should have some required items for prep phase
      const requiredItems = items.filter((item: any) => item.requiredForTransition)
      expect(requiredItems.length).toBeGreaterThan(0)
      
      // Required items should typically be high priority
      requiredItems.forEach((item: any) => {
        expect(['high', 'medium']).toContain(item.priority)
      })
    })
  })

  describe('Default readiness data', () => {
    it('should provide sensible defaults when readiness data is unavailable', () => {
      const phaseEngine = new PhaseEngine()
      
      const defaultData = (phaseEngine as any).getDefaultReadinessData('test-project')
      
      expect(defaultData).toHaveProperty('project_id', 'test-project')
      expect(defaultData).toHaveProperty('roles_status', 'default-only')
      expect(defaultData).toHaveProperty('locations_status', 'default-only')
      expect(defaultData).toHaveProperty('total_staff_assigned', 0)
      expect(defaultData).toHaveProperty('total_talent', 0)
      expect(defaultData).toHaveProperty('escort_count', 0)
      expect(defaultData).toHaveProperty('supervisor_count', 0)
      expect(defaultData).toHaveProperty('coordinator_count', 0)
      expect(defaultData).toHaveProperty('team_finalized', false)
      expect(defaultData).toHaveProperty('talent_finalized', false)
      expect(defaultData).toHaveProperty('roles_finalized', false)
      expect(defaultData).toHaveProperty('locations_finalized', false)
      expect(defaultData).toHaveProperty('overall_status', 'getting-started')
      expect(defaultData).toHaveProperty('urgent_assignment_issues', 0)
    })
  })
})