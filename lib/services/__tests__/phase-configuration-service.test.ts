import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PhaseConfigurationService } from '../phase-configuration-service'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' })),
  })),
}))

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
    upsert: vi.fn(),
    insert: vi.fn(),
  })),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

describe('PhaseConfigurationService', () => {
  let service: PhaseConfigurationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PhaseConfigurationService()
  })

  describe('getDefaults', () => {
    it('should return default configuration values', () => {
      const defaults = PhaseConfigurationService.getDefaults()
      
      expect(defaults).toEqual({
        autoTransitionsEnabled: true,
        archiveMonth: 4,
        archiveDay: 1,
        postShowTransitionHour: 6,
      })
    })
  })

  describe('getConfiguration', () => {
    it('should return configuration with project and settings data', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        auto_transitions_enabled: true,
        timezone: 'America/New_York',
        rehearsal_start_date: '2024-03-15',
        show_end_date: '2024-03-20',
        phase_updated_at: '2024-03-01T10:00:00Z'
      }
      const mockSettings = {
        auto_transitions_enabled: true,
        archive_month: 6,
        archive_day: 15,
        post_show_transition_hour: 8
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockSettings, error: null })
          }))
        }))
      })

      const config = await service.getConfiguration('project-1')

      expect(config).toEqual({
        currentPhase: 'prep',
        phaseUpdatedAt: '2024-03-01T10:00:00Z',
        autoTransitionsEnabled: true,
        timezone: 'America/New_York',
        rehearsalStartDate: '2024-03-15',
        showEndDate: '2024-03-20',
        archiveMonth: 6,
        archiveDay: 15,
        postShowTransitionHour: 8
      })
    })

    it('should use defaults when settings not found', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        status: 'prep',
        auto_transitions_enabled: null,
        timezone: null,
        rehearsal_start_date: null,
        show_end_date: null,
        phase_updated_at: '2024-03-01T10:00:00Z'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          }))
        }))
      })

      const config = await service.getConfiguration('project-1')

      expect(config).toEqual({
        currentPhase: 'prep',
        phaseUpdatedAt: '2024-03-01T10:00:00Z',
        autoTransitionsEnabled: true,
        timezone: null,
        rehearsalStartDate: null,
        showEndDate: null,
        archiveMonth: 4,
        archiveDay: 1,
        postShowTransitionHour: 6
      })
    })

    it('should throw error when project not found', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
          }))
        }))
      })

      await expect(service.getConfiguration('nonexistent')).rejects.toThrow('Project not found: nonexistent')
    })
  })

  describe('updateConfiguration', () => {
    it('should update both project and settings data', async () => {
      const mockProject = { id: 'project-1', name: 'Test Project', status: 'prep' }
      const updates = {
        autoTransitionsEnabled: false,
        timezone: 'America/Los_Angeles',
        archiveMonth: 6,
        postShowTransitionHour: 8
      }

      // Mock project existence check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      })

      // Mock project update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      })

      // Mock settings upsert
      mockSupabase.from.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null })
      })

      // Mock audit log insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      })

      // Mock getConfiguration call for return value
      const mockFinalProject = {
        ...mockProject,
        auto_transitions_enabled: false,
        timezone: 'America/Los_Angeles'
      }
      const mockFinalSettings = {
        auto_transitions_enabled: false,
        archive_month: 6,
        archive_day: 1,
        post_show_transition_hour: 8
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockFinalProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockFinalSettings, error: null })
          }))
        }))
      })

      const result = await service.updateConfiguration('project-1', updates, 'user-1')

      expect(result.autoTransitionsEnabled).toBe(false)
      expect(result.timezone).toBe('America/Los_Angeles')
      expect(result.archiveMonth).toBe(6)
      expect(result.postShowTransitionHour).toBe(8)
    })

    it('should validate configuration before updating', async () => {
      const invalidUpdates = {
        archiveMonth: 2,
        archiveDay: 31 // Invalid: February 31st
      }

      await expect(service.updateConfiguration('project-1', invalidUpdates, 'user-1'))
        .rejects.toThrow('Invalid archive date combination')
    })

    it('should validate timezone format', async () => {
      const invalidUpdates = {
        timezone: 'Invalid/Timezone'
      }

      await expect(service.updateConfiguration('project-1', invalidUpdates, 'user-1'))
        .rejects.toThrow('Invalid timezone identifier')
    })

    it('should validate date string format', async () => {
      const invalidUpdates = {
        rehearsalStartDate: 'invalid-date'
      }

      await expect(service.updateConfiguration('project-1', invalidUpdates, 'user-1'))
        .rejects.toThrow('Invalid rehearsal start date format')
    })

    it('should validate numeric ranges', async () => {
      const invalidUpdates = {
        archiveMonth: 13
      }

      await expect(service.updateConfiguration('project-1', invalidUpdates, 'user-1'))
        .rejects.toThrow('Archive month must be between 1 and 12')
    })
  })

  describe('isAutoTransitionsEnabled', () => {
    it('should return auto transitions status', async () => {
      const mockProject = {
        id: 'project-1',
        status: 'prep',
        auto_transitions_enabled: false,
        timezone: null,
        rehearsal_start_date: null,
        show_end_date: null,
        phase_updated_at: '2024-03-01T10:00:00Z'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          }))
        }))
      })

      const result = await service.isAutoTransitionsEnabled('project-1')
      expect(result).toBe(false)
    })
  })

  describe('getNextTransitionTime', () => {
    it('should return null when auto transitions disabled', async () => {
      const mockProject = {
        id: 'project-1',
        status: 'prep',
        auto_transitions_enabled: false,
        timezone: null,
        rehearsal_start_date: null,
        show_end_date: null,
        phase_updated_at: '2024-03-01T10:00:00Z'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          }))
        }))
      })

      const result = await service.getNextTransitionTime('project-1')
      expect(result).toBeNull()
    })

    it('should calculate transition time for pre_show phase', async () => {
      const mockProject = {
        id: 'project-1',
        status: 'pre_show',
        auto_transitions_enabled: true,
        timezone: 'America/New_York',
        rehearsal_start_date: '2024-03-15',
        show_end_date: null,
        phase_updated_at: '2024-03-01T10:00:00Z'
      }
      const mockSettings = {
        archive_month: 4,
        archive_day: 1,
        post_show_transition_hour: 6
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockSettings, error: null })
          }))
        }))
      })

      const result = await service.getNextTransitionTime('project-1')
      expect(result).toBeInstanceOf(Date)
    })

    it('should return null for phases without automatic transitions', async () => {
      const mockProject = {
        id: 'project-1',
        status: 'prep',
        auto_transitions_enabled: true,
        timezone: null,
        rehearsal_start_date: null,
        show_end_date: null,
        phase_updated_at: '2024-03-01T10:00:00Z'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          }))
        }))
      })

      const result = await service.getNextTransitionTime('project-1')
      expect(result).toBeNull()
    })
  })

  describe('applyDefaultsToProject', () => {
    it('should insert default settings for new project', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      })

      await service.applyDefaultsToProject('project-1', 'user-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('project_settings')
    })

    it('should not throw on insert error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') })
      })

      // Should not throw
      await expect(service.applyDefaultsToProject('project-1', 'user-1')).resolves.toBeUndefined()
    })
  })
})