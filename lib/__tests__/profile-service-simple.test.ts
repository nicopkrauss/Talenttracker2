/**
 * Profile Service Simple Tests
 * Authentication System Overhaul - Task 2.2
 * Focus on validation and business logic without database mocking
 */

import { describe, it, expect } from 'vitest';
import { UserStatus, SystemRole } from '../auth-types';
import UserStatusManager from '../user-status-utils';

describe('Profile Service Utilities', () => {
  
  describe('UserStatusManager', () => {
    
    describe('isValidTransition', () => {
      it('should allow valid status transitions', () => {
        expect(UserStatusManager.isValidTransition('pending', 'active')).toBe(true);
        expect(UserStatusManager.isValidTransition('pending', 'inactive')).toBe(true);
        expect(UserStatusManager.isValidTransition('active', 'inactive')).toBe(true);
        expect(UserStatusManager.isValidTransition('inactive', 'active')).toBe(true);
      });

      it('should reject invalid status transitions', () => {
        expect(UserStatusManager.isValidTransition('pending', 'pending')).toBe(false);
        expect(UserStatusManager.isValidTransition('active', 'pending')).toBe(false);
        expect(UserStatusManager.isValidTransition('inactive', 'pending')).toBe(false);
      });
    });

    describe('requiresAdminPrivileges', () => {
      it('should require admin privileges for all status changes', () => {
        expect(UserStatusManager.requiresAdminPrivileges('pending', 'active')).toBe(true);
        expect(UserStatusManager.requiresAdminPrivileges('pending', 'inactive')).toBe(true);
        expect(UserStatusManager.requiresAdminPrivileges('active', 'inactive')).toBe(true);
        expect(UserStatusManager.requiresAdminPrivileges('inactive', 'active')).toBe(true);
      });
    });

    describe('canPerformStatusChange', () => {
      it('should allow admin to perform valid status changes', () => {
        expect(UserStatusManager.canPerformStatusChange('admin', 'active', 'pending')).toBe(true);
        expect(UserStatusManager.canPerformStatusChange('admin', 'inactive', 'active')).toBe(true);
      });

      it('should allow in_house to perform valid status changes', () => {
        expect(UserStatusManager.canPerformStatusChange('in_house', 'active', 'pending')).toBe(true);
        expect(UserStatusManager.canPerformStatusChange('in_house', 'inactive', 'active')).toBe(true);
      });

      it('should reject status changes for non-admin users', () => {
        expect(UserStatusManager.canPerformStatusChange(null, 'active', 'pending')).toBe(false);
      });

      it('should reject invalid status transitions even for admins', () => {
        expect(UserStatusManager.canPerformStatusChange('admin', 'pending', 'active')).toBe(false);
      });
    });

    describe('getStatusInfo', () => {
      it('should return correct status information', () => {
        const pendingInfo = UserStatusManager.getStatusInfo('pending');
        expect(pendingInfo.label).toBe('Pending Approval');
        expect(pendingInfo.color).toBe('yellow');

        const activeInfo = UserStatusManager.getStatusInfo('active');
        expect(activeInfo.label).toBe('Active');
        expect(activeInfo.color).toBe('green');

        const inactiveInfo = UserStatusManager.getStatusInfo('inactive');
        expect(inactiveInfo.label).toBe('Inactive');
        expect(inactiveInfo.color).toBe('red');
      });
    });

    describe('getAvailableActions', () => {
      it('should return correct actions for pending status', () => {
        const actions = UserStatusManager.getAvailableActions('pending');
        expect(actions).toHaveLength(2);
        expect(actions.find(a => a.action === 'approve')).toBeDefined();
        expect(actions.find(a => a.action === 'deactivate')).toBeDefined();
      });

      it('should return correct actions for active status', () => {
        const actions = UserStatusManager.getAvailableActions('active');
        expect(actions).toHaveLength(1);
        expect(actions.find(a => a.action === 'deactivate')).toBeDefined();
      });

      it('should return correct actions for inactive status', () => {
        const actions = UserStatusManager.getAvailableActions('inactive');
        expect(actions).toHaveLength(1);
        expect(actions.find(a => a.action === 'approve')).toBeDefined();
      });
    });

    describe('user access helpers', () => {
      const mockUser = {
        id: 'test-id',
        full_name: 'Test User',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      it('should correctly identify users needing onboarding', () => {
        expect(UserStatusManager.needsOnboarding({ ...mockUser, status: 'pending' })).toBe(true);
        expect(UserStatusManager.needsOnboarding({ ...mockUser, status: 'active' })).toBe(false);
        expect(UserStatusManager.needsOnboarding({ ...mockUser, status: 'inactive' })).toBe(false);
      });

      it('should correctly identify users with full access', () => {
        expect(UserStatusManager.hasFullAccess({ ...mockUser, status: 'pending' })).toBe(false);
        expect(UserStatusManager.hasFullAccess({ ...mockUser, status: 'active' })).toBe(true);
        expect(UserStatusManager.hasFullAccess({ ...mockUser, status: 'inactive' })).toBe(false);
      });

      it('should correctly identify blocked users', () => {
        expect(UserStatusManager.isBlocked({ ...mockUser, status: 'pending' })).toBe(false);
        expect(UserStatusManager.isBlocked({ ...mockUser, status: 'active' })).toBe(false);
        expect(UserStatusManager.isBlocked({ ...mockUser, status: 'inactive' })).toBe(true);
      });
    });

    describe('getRedirectUrl', () => {
      const mockUser = {
        id: 'test-id',
        full_name: 'Test User',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      it('should return correct redirect URLs based on status', () => {
        expect(UserStatusManager.getRedirectUrl({ ...mockUser, status: 'pending' })).toBe('/pending-approval');
        expect(UserStatusManager.getRedirectUrl({ ...mockUser, status: 'inactive' })).toBe('/account-suspended');
      });

      it('should return admin dashboard for admin users', () => {
        expect(UserStatusManager.getRedirectUrl({ 
          ...mockUser, 
          status: 'active', 
          role: 'admin' 
        })).toBe('/admin/dashboard');
      });

      it('should return regular dashboard for non-admin active users', () => {
        expect(UserStatusManager.getRedirectUrl({ 
          ...mockUser, 
          status: 'active', 
          role: 'in_house' 
        })).toBe('/dashboard');
      });
    });

    describe('getBulkOperationSummary', () => {
      it('should return success summary when all operations succeed', () => {
        const summary = UserStatusManager.getBulkOperationSummary('approve', 5, 0, 5);
        expect(summary.type).toBe('success');
        expect(summary.title).toBe('Operation Completed Successfully');
        expect(summary.message).toContain('All 5 users were approved successfully');
      });

      it('should return error summary when all operations fail', () => {
        const summary = UserStatusManager.getBulkOperationSummary('approve', 0, 5, 5);
        expect(summary.type).toBe('error');
        expect(summary.title).toBe('Operation Failed');
        expect(summary.message).toContain('Failed to approve any of the 5 selected users');
      });

      it('should return warning summary for partial success', () => {
        const summary = UserStatusManager.getBulkOperationSummary('approve', 3, 2, 5);
        expect(summary.type).toBe('warning');
        expect(summary.title).toBe('Operation Partially Completed');
        expect(summary.message).toContain('3 users were approved successfully, but 2 failed');
      });
    });

    describe('getStatusChangeNotification', () => {
      const mockUser = {
        id: 'test-id',
        full_name: 'John Doe',
        email: 'john@example.com',
        status: 'active' as UserStatus,
        created_at: new Date(),
        updated_at: new Date()
      };

      it('should return correct notification for user approval', () => {
        const notification = UserStatusManager.getStatusChangeNotification(
          mockUser, 'pending', 'active', 'admin-id'
        );
        expect(notification.type).toBe('user_approved');
        expect(notification.subject).toBe('Your account has been approved');
        expect(notification.template).toBe('user_approval');
        expect(notification.data.user_name).toBe('John Doe');
      });

      it('should return correct notification for user rejection', () => {
        const notification = UserStatusManager.getStatusChangeNotification(
          mockUser, 'pending', 'inactive', 'admin-id'
        );
        expect(notification.type).toBe('user_rejected');
        expect(notification.subject).toBe('Your account registration was not approved');
        expect(notification.template).toBe('user_rejection');
      });

      it('should return correct notification for user deactivation', () => {
        const notification = UserStatusManager.getStatusChangeNotification(
          mockUser, 'active', 'inactive', 'admin-id'
        );
        expect(notification.type).toBe('user_deactivated');
        expect(notification.subject).toBe('Your account has been deactivated');
        expect(notification.template).toBe('user_deactivation');
      });

      it('should return correct notification for user reactivation', () => {
        const notification = UserStatusManager.getStatusChangeNotification(
          mockUser, 'inactive', 'active', 'admin-id'
        );
        expect(notification.type).toBe('user_reactivated');
        expect(notification.subject).toBe('Your account has been reactivated');
        expect(notification.template).toBe('user_reactivation');
      });
    });

    describe('getAuditMessage', () => {
      it('should create audit message without reason', () => {
        const message = UserStatusManager.getAuditMessage('pending', 'active', 'admin-user');
        expect(message).toBe('Status changed from pending to active by admin-user');
      });

      it('should create audit message with reason', () => {
        const message = UserStatusManager.getAuditMessage(
          'active', 'inactive', 'admin-user', 'Policy violation'
        );
        expect(message).toBe('Status changed from active to inactive by admin-user. Reason: Policy violation');
      });
    });
  });
});