import { describe, it, expect } from 'vitest'
import {
  getEffectiveUserRole,
  hasRole,
  hasAnyRole,
  hasAdminAccess,
  canAccessAdminFeatures,
  canManageTeam,
  canManageTalent,
  canApproveTimecards,
  canInitiateCheckout,
  getRolePermissionLevel,
  hasHigherOrEqualPermissions,
  getDefaultRouteForUser,
  needsProjectAssignment,
  getRoleDisplayName,
  getRoleDescription
} from '../role-utils'

describe('Role Utilities', () => {
  describe('getEffectiveUserRole', () => {
    it('should prioritize system role over project role', () => {
      expect(getEffectiveUserRole('admin', 'talent_escort')).toBe('admin')
      expect(getEffectiveUserRole('in_house', 'supervisor')).toBe('in_house')
    })

    it('should use project role when no system role', () => {
      expect(getEffectiveUserRole(null, 'supervisor')).toBe('supervisor')
      expect(getEffectiveUserRole(null, 'coordinator')).toBe('coordinator')
    })

    it('should default to talent_escort when no roles', () => {
      expect(getEffectiveUserRole(null, null)).toBe('talent_escort')
    })
  })

  describe('hasRole', () => {
    it('should check system role first', () => {
      expect(hasRole('admin', 'supervisor', 'admin')).toBe(true)
      expect(hasRole('admin', 'supervisor', 'supervisor')).toBe(false)
    })

    it('should check project role when no system role', () => {
      expect(hasRole(null, 'supervisor', 'supervisor')).toBe(true)
      expect(hasRole(null, 'supervisor', 'admin')).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('should check against multiple roles', () => {
      expect(hasAnyRole('admin', null, ['admin', 'supervisor'])).toBe(true)
      expect(hasAnyRole(null, 'supervisor', ['admin', 'supervisor'])).toBe(true)
      expect(hasAnyRole(null, 'talent_escort', ['admin', 'supervisor'])).toBe(false)
    })
  })

  describe('hasAdminAccess', () => {
    it('should grant access to admin and in_house', () => {
      expect(hasAdminAccess('admin')).toBe(true)
      expect(hasAdminAccess('in_house')).toBe(true)
      expect(hasAdminAccess(null)).toBe(false)
    })
  })

  describe('canAccessAdminFeatures', () => {
    it('should allow admin and in_house system roles', () => {
      expect(canAccessAdminFeatures('admin')).toBe(true)
      expect(canAccessAdminFeatures('in_house')).toBe(true)
      expect(canAccessAdminFeatures(null)).toBe(false)
    })
  })

  describe('canManageTeam', () => {
    it('should allow system roles and supervisors', () => {
      expect(canManageTeam('admin', null)).toBe(true)
      expect(canManageTeam('in_house', null)).toBe(true)
      expect(canManageTeam(null, 'supervisor')).toBe(true)
      expect(canManageTeam(null, 'talent_escort')).toBe(false)
    })
  })

  describe('canManageTalent', () => {
    it('should allow system roles and most project roles', () => {
      expect(canManageTalent('admin', null)).toBe(true)
      expect(canManageTalent('in_house', null)).toBe(true)
      expect(canManageTalent(null, 'supervisor')).toBe(true)
      expect(canManageTalent(null, 'coordinator')).toBe(true)
      expect(canManageTalent(null, 'talent_escort')).toBe(true)
      expect(canManageTalent(null, null)).toBe(false)
    })
  })

  describe('canApproveTimecards', () => {
    it('should only allow system roles', () => {
      expect(canApproveTimecards('admin')).toBe(true)
      expect(canApproveTimecards('in_house')).toBe(true)
      expect(canApproveTimecards(null)).toBe(false)
    })
  })

  describe('canInitiateCheckout', () => {
    it('should allow system roles and supervisors', () => {
      expect(canInitiateCheckout('admin', null)).toBe(true)
      expect(canInitiateCheckout('in_house', null)).toBe(true)
      expect(canInitiateCheckout(null, 'supervisor')).toBe(true)
      expect(canInitiateCheckout(null, 'talent_escort')).toBe(false)
    })
  })

  describe('getRolePermissionLevel', () => {
    it('should prioritize system role permissions', () => {
      expect(getRolePermissionLevel('admin', 'talent_escort')).toBe(100)
      expect(getRolePermissionLevel('in_house', 'supervisor')).toBe(50)
    })

    it('should use project role permissions when no system role', () => {
      expect(getRolePermissionLevel(null, 'supervisor')).toBe(30)
      expect(getRolePermissionLevel(null, 'coordinator')).toBe(20)
      expect(getRolePermissionLevel(null, 'talent_escort')).toBe(10)
    })

    it('should return 0 for no roles', () => {
      expect(getRolePermissionLevel(null, null)).toBe(0)
    })
  })

  describe('hasHigherOrEqualPermissions', () => {
    it('should compare permission levels correctly', () => {
      expect(hasHigherOrEqualPermissions('admin', null, 'in_house', null)).toBe(true)
      expect(hasHigherOrEqualPermissions('in_house', null, 'admin', null)).toBe(false)
      expect(hasHigherOrEqualPermissions('admin', null, null, 'supervisor')).toBe(true)
      expect(hasHigherOrEqualPermissions(null, 'supervisor', null, 'talent_escort')).toBe(true)
    })
  })

  describe('getDefaultRouteForUser', () => {
    it('should route admin and in_house to projects', () => {
      expect(getDefaultRouteForUser('admin', null)).toBe('/projects')
      expect(getDefaultRouteForUser('in_house', null)).toBe('/projects')
    })

    it('should route other roles to talent', () => {
      expect(getDefaultRouteForUser(null, 'supervisor')).toBe('/talent')
      expect(getDefaultRouteForUser(null, 'talent_escort')).toBe('/talent')
      expect(getDefaultRouteForUser(null, null)).toBe('/talent')
    })
  })

  describe('needsProjectAssignment', () => {
    it('should require project assignment for users without system roles', () => {
      expect(needsProjectAssignment(null)).toBe(true)
      expect(needsProjectAssignment('admin')).toBe(false)
      expect(needsProjectAssignment('in_house')).toBe(false)
    })
  })

  describe('getRoleDisplayName', () => {
    it('should return proper display names', () => {
      expect(getRoleDisplayName('admin')).toBe('Administrator')
      expect(getRoleDisplayName('in_house')).toBe('In-House Manager')
      expect(getRoleDisplayName('supervisor')).toBe('Supervisor')
      expect(getRoleDisplayName('coordinator')).toBe('Coordinator')
      expect(getRoleDisplayName('talent_escort')).toBe('Talent Escort')
    })
  })

  describe('getRoleDescription', () => {
    it('should return proper descriptions', () => {
      expect(getRoleDescription('admin')).toContain('Full system access')
      expect(getRoleDescription('in_house')).toContain('System management')
      expect(getRoleDescription('supervisor')).toContain('On-site management')
      expect(getRoleDescription('coordinator')).toContain('Informational oversight')
      expect(getRoleDescription('talent_escort')).toContain('On-the-ground operations')
    })
  })
})