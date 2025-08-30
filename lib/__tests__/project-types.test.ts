import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  Project,
  ProjectSetupChecklist,
  ProjectRoleConfig,
  ProjectLocation,
  ProjectFormData,
  CreateProjectData,
  UpdateProjectData,
  ProjectDetails,
  projectFormSchema,
  projectRoleFormSchema,
  projectLocationFormSchema,
  type ProjectStatus
} from '../types'

describe('Project Management Types', () => {
  describe('Project interface', () => {
    it('should define a valid Project object', () => {
      const project: Project = {
        id: 'proj-123',
        name: 'Test Production',
        description: 'A test production project',
        production_company: 'Test Studios',
        hiring_contact: 'John Doe',
        project_location: 'Los Angeles, CA',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'prep',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-123'
      }

      expect(project.id).toBe('proj-123')
      expect(project.name).toBe('Test Production')
      expect(project.status).toBe('prep')
    })

    it('should allow optional fields to be undefined', () => {
      const minimalProject: Project = {
        id: 'proj-123',
        name: 'Minimal Project',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-123'
      }

      expect(minimalProject.description).toBeUndefined()
      expect(minimalProject.production_company).toBeUndefined()
    })
  })

  describe('ProjectSetupChecklist interface', () => {
    it('should define a valid ProjectSetupChecklist object', () => {
      const checklist: ProjectSetupChecklist = {
        project_id: 'proj-123',
        roles_and_pay_completed: true,
        talent_roster_completed: false,
        team_assignments_completed: false,
        locations_completed: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(checklist.project_id).toBe('proj-123')
      expect(checklist.roles_and_pay_completed).toBe(true)
      expect(checklist.completed_at).toBeUndefined()
    })
  })

  describe('ProjectRoleConfig interface', () => {
    it('should define a valid ProjectRoleConfig object', () => {
      const roleConfig: ProjectRoleConfig = {
        id: 'role-123',
        project_id: 'proj-123',
        role_name: 'supervisor',
        base_pay_rate: 25.50,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(roleConfig.role_name).toBe('supervisor')
      expect(roleConfig.base_pay_rate).toBe(25.50)
      expect(roleConfig.is_active).toBe(true)
    })

    it('should allow base_pay_rate to be undefined', () => {
      const roleConfig: ProjectRoleConfig = {
        id: 'role-123',
        project_id: 'proj-123',
        role_name: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(roleConfig.base_pay_rate).toBeUndefined()
    })
  })

  describe('ProjectLocation interface', () => {
    it('should define a valid ProjectLocation object', () => {
      const location: ProjectLocation = {
        id: 'loc-123',
        project_id: 'proj-123',
        name: 'Stage A',
        is_default: true,
        sort_order: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(location.name).toBe('Stage A')
      expect(location.is_default).toBe(true)
      expect(location.sort_order).toBe(1)
    })
  })

  describe('Form data interfaces', () => {
    it('should define valid CreateProjectData', () => {
      const createData: CreateProjectData = {
        name: 'New Project',
        description: 'A new project',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }

      expect(createData.name).toBe('New Project')
      expect(createData.start_date).toBe('2024-01-01')
    })

    it('should define valid UpdateProjectData with partial fields', () => {
      const updateData: UpdateProjectData = {
        name: 'Updated Project Name'
      }

      expect(updateData.name).toBe('Updated Project Name')
      expect(updateData.description).toBeUndefined()
    })

    it('should define valid ProjectFormData', () => {
      const formData: ProjectFormData = {
        name: 'Form Project',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }

      expect(formData.name).toBe('Form Project')
    })
  })

  describe('ProjectDetails interface', () => {
    it('should extend Project with additional properties', () => {
      const projectDetails: ProjectDetails = {
        id: 'proj-123',
        name: 'Detailed Project',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-123',
        project_setup_checklist: {
          project_id: 'proj-123',
          roles_and_pay_completed: true,
          talent_roster_completed: true,
          team_assignments_completed: true,
          locations_completed: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        project_roles: [],
        project_locations: [],
        setup_progress: 100,
        is_setup_complete: true,
        can_activate: true
      }

      expect(projectDetails.setup_progress).toBe(100)
      expect(projectDetails.is_setup_complete).toBe(true)
      expect(projectDetails.can_activate).toBe(true)
    })
  })

  describe('ProjectStatus type', () => {
    it('should accept valid status values', () => {
      const prepStatus: ProjectStatus = 'prep'
      const activeStatus: ProjectStatus = 'active'
      const archivedStatus: ProjectStatus = 'archived'

      expect(prepStatus).toBe('prep')
      expect(activeStatus).toBe('active')
      expect(archivedStatus).toBe('archived')
    })
  })
})

describe('Project Validation Schemas', () => {
  describe('projectFormSchema', () => {
    it('should validate a valid project form', () => {
      const validData = {
        name: 'Test Project',
        description: 'A test project',
        production_company: 'Test Studios',
        hiring_contact: 'John Doe',
        project_location: 'Los Angeles',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }

      const result = projectFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require name, start_date, and end_date', () => {
      const invalidData = {
        description: 'Missing required fields'
      }

      const result = projectFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.issues.map(issue => issue.path[0])
        expect(errors).toContain('name')
        expect(errors).toContain('start_date')
        expect(errors).toContain('end_date')
      }
    })

    it('should validate that end_date is after start_date', () => {
      const invalidData = {
        name: 'Test Project',
        start_date: '2024-01-31',
        end_date: '2024-01-01'
      }

      const result = projectFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('End date must be after start date')
      }
    })

    it('should validate date format', () => {
      const invalidData = {
        name: 'Test Project',
        start_date: 'invalid-date',
        end_date: '2024-01-31'
      }

      const result = projectFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('projectRoleFormSchema', () => {
    it('should validate a valid role form', () => {
      const validData = {
        role_name: 'supervisor' as const,
        base_pay_rate: 25.50
      }

      const result = projectRoleFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require valid role_name', () => {
      const invalidData = {
        role_name: 'invalid_role',
        base_pay_rate: 25.50
      }

      const result = projectRoleFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate positive pay rate', () => {
      const invalidData = {
        role_name: 'supervisor' as const,
        base_pay_rate: -10
      }

      const result = projectRoleFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should allow undefined pay rate', () => {
      const validData = {
        role_name: 'admin' as const
      }

      const result = projectRoleFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('projectLocationFormSchema', () => {
    it('should validate a valid location form', () => {
      const validData = {
        name: 'Stage A',
        is_default: true,
        sort_order: 1
      }

      const result = projectLocationFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require name', () => {
      const invalidData = {
        is_default: true
      }

      const result = projectLocationFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate sort_order is non-negative integer', () => {
      const invalidData = {
        name: 'Stage A',
        sort_order: -1
      }

      const result = projectLocationFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should default is_default to false', () => {
      const validData = {
        name: 'Stage A'
      }

      const result = projectLocationFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_default).toBe(false)
      }
    })
  })
})