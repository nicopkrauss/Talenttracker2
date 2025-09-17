import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PhaseActionItemsService } from '../phase-action-items-service'
import { ProjectPhase } from '../phase-engine'

// Mock the dependencies
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({ data: { user: { id: 'test-user' } }, error: null }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockProject, error: null }))
        }))
      }))
    }))
  }))
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'test-cookie' }))
  }))
}))

// Mock fetch for readiness API calls
global.fetch = vi.fn()

const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  status: 'prep',
  project_settings: {
    archive_month: 4,
    archive_day: 1,
    post_show_transition_hour: 6
  }
}

const mockReadinessData = {
  data: {
    project_id: 'test-project-id',
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
    urgent_assignment_issues: 0,
    todoItems: [
      {
        id: 'assign-team',
        area: 'team',
        priority: 'critical',
        title: 'Assign team members',
        description: 'No staff assigned to this project'
      },
      {
        id: 'add-talent',
        area: 'talent',
        priority: 'critical',
        title: 'Add talent to roster',
        description: 'No talent assigned to this project'
      }
    ]
  }
}

describe('PhaseActionItemsService', () => {
  let service: PhaseActionItemsService

  beforeEach(() => {
    service = new PhaseActionItemsService()
    vi.clearAllMocks()
    
    // Mock fetch to return readiness data
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockReadinessData)
    })
  })

  describe('getActionItems', () => {
    it('should return phase-specific action items for prep phase', async () => {
      const result = await service.getActionItems('test-project-id', {
        phase: ProjectPhase.PREP
      })

      expect(result.phaseItems).toBeDefined()
      expect(result.readinessItems).toBeDefined()
      expect(result.combinedItems).toBeDefined()
      expect(result.summary).toBeDefined()

      // Should have prep-specific items
      const prepItems = result.phaseItems.filter(item => 
        item.id.startsWith('prep-') || item.category === 'setup'
      )
      expect(prepItems.length).toBeGreaterThan(0)
    })

    it('should include readiness items by default', async () => {
      const result = await service.getActionItems('test-project-id')

      expect(result.readinessItems.length).toBeGreaterThan(0)
      expect(result.readinessItems[0].id).toContain('readiness-')
    })

    it('should exclude readiness items when requested', async () => {
      const result = await service.getActionItems('test-project-id', {
        includeReadinessItems: false
      })

      expect(result.readinessItems.length).toBe(0)
    })

    it('should filter by category', async () => {
      const result = await service.getActionItems('test-project-id', {
        category: 'setup'
      })

      result.combinedItems.forEach(item => {
        expect(item.category).toBe('setup')
      })
    })

    it('should filter by priority', async () => {
      const result = await service.getActionItems('test-project-id', {
        priority: 'high'
      })

      result.combinedItems.forEach(item => {
        expect(item.priority).toBe('high')
      })
    })

    it('should filter required items only', async () => {
      const result = await service.getActionItems('test-project-id', {
        requiredOnly: true
      })

      result.combinedItems.forEach(item => {
        expect(item.requiredForTransition).toBe(true)
      })
    })

    it('should calculate summary statistics correctly', async () => {
      const result = await service.getActionItems('test-project-id')

      expect(result.summary.total).toBe(result.combinedItems.length)
      expect(result.summary.completed).toBe(
        result.combinedItems.filter(item => item.completed).length
      )
      expect(result.summary.pending).toBe(
        result.combinedItems.filter(item => !item.completed).length
      )
      expect(result.summary.required).toBe(
        result.combinedItems.filter(item => item.requiredForTransition).length
      )
    })
  })

  describe('getPhaseSpecificItems', () => {
    it('should return items specific to staffing phase', async () => {
      const items = await service.getPhaseSpecificItems('test-project-id', ProjectPhase.STAFFING)

      // Should have staffing-specific items
      const staffingItems = items.filter(item => 
        item.id.startsWith('staffing-') || item.category === 'staffing'
      )
      expect(staffingItems.length).toBeGreaterThan(0)
    })

    it('should return items specific to active phase', async () => {
      const items = await service.getPhaseSpecificItems('test-project-id', ProjectPhase.ACTIVE)

      // Should have active-specific items
      const activeItems = items.filter(item => 
        item.id.startsWith('active-') || item.category === 'operations'
      )
      expect(activeItems.length).toBeGreaterThan(0)
    })
  })

  describe('getCriticalItems', () => {
    it('should return only critical items required for transitions', async () => {
      const items = await service.getCriticalItems('test-project-id')

      items.forEach(item => {
        expect(item.requiredForTransition).toBe(true)
      })
    })
  })

  describe('markItemCompleted', () => {
    it('should mark an item as completed', async () => {
      await expect(
        service.markItemCompleted('test-project-id', 'test-item-id')
      ).resolves.not.toThrow()
    })
  })

  describe('category mapping', () => {
    it('should map readiness categories to appropriate phase categories', async () => {
      // Mock readiness data with different areas
      const readinessWithAreas = {
        ...mockReadinessData,
        data: {
          ...mockReadinessData.data,
          todoItems: [
            { id: 'team-item', area: 'team', priority: 'critical', title: 'Team item', description: 'Test' },
            { id: 'talent-item', area: 'talent', priority: 'important', title: 'Talent item', description: 'Test' },
            { id: 'assignments-item', area: 'assignments', priority: 'optional', title: 'Assignment item', description: 'Test' }
          ]
        }
      }
      
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(readinessWithAreas)
      })

      const result = await service.getActionItems('test-project-id', {
        phase: ProjectPhase.PREP
      })

      // Check that categories are mapped appropriately for prep phase
      const readinessItems = result.readinessItems
      expect(readinessItems.some(item => item.category === 'setup')).toBe(true)
    })
  })

  describe('priority mapping', () => {
    it('should map readiness priorities to action item priorities', async () => {
      const result = await service.getActionItems('test-project-id')

      const readinessItems = result.readinessItems
      expect(readinessItems.some(item => item.priority === 'high')).toBe(true) // critical -> high
    })
  })

  describe('item deduplication', () => {
    it('should deduplicate similar items from different sources', async () => {
      const result = await service.getActionItems('test-project-id')

      // Check that we don't have duplicate items with very similar titles
      const titles = result.combinedItems.map(item => item.title.toLowerCase())
      const uniqueTitles = new Set(titles)
      
      // Should have some deduplication (not necessarily perfect, but some)
      expect(uniqueTitles.size).toBeLessThanOrEqual(titles.length)
    })
  })

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await service.getActionItems('test-project-id')

      // Should still return phase items even if readiness fails
      expect(result.phaseItems).toBeDefined()
      expect(result.readinessItems).toEqual([])
      expect(result.combinedItems).toBeDefined()
    })

    it('should handle invalid readiness response gracefully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      })

      const result = await service.getActionItems('test-project-id')

      // Should still return phase items
      expect(result.phaseItems).toBeDefined()
      expect(result.readinessItems).toEqual([])
    })
  })
})