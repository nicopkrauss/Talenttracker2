/**
 * User Status Management Utilities
 * Authentication System Overhaul - Task 2.2
 */

import { UserStatus, SystemRole, UserProfile, StatusTransition } from './auth-types';

/**
 * User Status Management Class
 * Handles status transitions, validations, and business logic
 */
export class UserStatusManager {

  /**
   * Get all possible status transitions for a user
   */
  static getValidTransitions(currentStatus: UserStatus): StatusTransition[] {
    const transitions: Record<UserStatus, StatusTransition[]> = {
      'pending': [
        {
          from: 'pending',
          to: 'active',
          allowed: true,
          requires_admin: true
        },
        {
          from: 'pending',
          to: 'inactive',
          allowed: true,
          requires_admin: true
        }
      ],
      'active': [
        {
          from: 'active',
          to: 'inactive',
          allowed: true,
          requires_admin: true
        }
      ],
      'inactive': [
        {
          from: 'inactive',
          to: 'active',
          allowed: true,
          requires_admin: true
        }
      ]
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Check if a status transition is valid
   */
  static isValidTransition(from: UserStatus, to: UserStatus): boolean {
    const validTransitions = this.getValidTransitions(from);
    return validTransitions.some(transition => transition.to === to && transition.allowed);
  }

  /**
   * Check if a status transition requires admin privileges
   */
  static requiresAdminPrivileges(from: UserStatus, to: UserStatus): boolean {
    const validTransitions = this.getValidTransitions(from);
    const transition = validTransitions.find(t => t.to === to);
    return transition?.requires_admin || false;
  }

  /**
   * Get user status display information
   */
  static getStatusInfo(status: UserStatus): {
    label: string;
    description: string;
    color: string;
    icon: string;
  } {
    const statusInfo = {
      'pending': {
        label: 'Pending Approval',
        description: 'Account is awaiting admin approval',
        color: 'yellow',
        icon: 'clock'
      },
      'active': {
        label: 'Active',
        description: 'Account is active and has full access',
        color: 'green',
        icon: 'check-circle'
      },
      'inactive': {
        label: 'Inactive',
        description: 'Account has been deactivated',
        color: 'red',
        icon: 'x-circle'
      }
    };

    return statusInfo[status];
  }

  /**
   * Get next possible actions for a user status
   */
  static getAvailableActions(
    currentStatus: UserStatus,
    userRole?: SystemRole
  ): Array<{
    action: string;
    label: string;
    targetStatus: UserStatus;
    requiresConfirmation: boolean;
    description: string;
  }> {
    const actions: Array<{
      action: string;
      label: string;
      targetStatus: UserStatus;
      requiresConfirmation: boolean;
      description: string;
    }> = [];

    const validTransitions = this.getValidTransitions(currentStatus);

    validTransitions.forEach(transition => {
      switch (transition.to) {
        case 'active':
          actions.push({
            action: 'approve',
            label: 'Approve User',
            targetStatus: 'active',
            requiresConfirmation: true,
            description: 'Grant user access to the system'
          });
          break;
        case 'inactive':
          actions.push({
            action: 'deactivate',
            label: currentStatus === 'pending' ? 'Reject User' : 'Deactivate User',
            targetStatus: 'inactive',
            requiresConfirmation: true,
            description: currentStatus === 'pending' 
              ? 'Reject user registration request'
              : 'Suspend user access to the system'
          });
          break;
      }
    });

    return actions;
  }

  /**
   * Validate if user can perform action based on their role
   */
  static canPerformStatusChange(
    performerRole: SystemRole | null,
    targetStatus: UserStatus,
    currentStatus: UserStatus
  ): boolean {
    // Only admins and in_house users can change status
    if (!performerRole || !['admin', 'in_house'].includes(performerRole)) {
      return false;
    }

    // Check if transition is valid
    return this.isValidTransition(currentStatus, targetStatus);
  }

  /**
   * Get status change notification data
   */
  static getStatusChangeNotification(
    user: UserProfile,
    oldStatus: UserStatus,
    newStatus: UserStatus,
    changedBy: string
  ): {
    type: string;
    subject: string;
    template: string;
    data: Record<string, any>;
  } {
    const notifications = {
      'pending_to_active': {
        type: 'user_approved',
        subject: 'Your account has been approved',
        template: 'user_approval',
        data: {
          user_name: user.full_name,
          login_url: process.env.NEXT_PUBLIC_APP_URL || 'https://app.talenttracker.com'
        }
      },
      'pending_to_inactive': {
        type: 'user_rejected',
        subject: 'Your account registration was not approved',
        template: 'user_rejection',
        data: {
          user_name: user.full_name,
          contact_email: process.env.SUPPORT_EMAIL || 'support@talenttracker.com'
        }
      },
      'active_to_inactive': {
        type: 'user_deactivated',
        subject: 'Your account has been deactivated',
        template: 'user_deactivation',
        data: {
          user_name: user.full_name,
          contact_email: process.env.SUPPORT_EMAIL || 'support@talenttracker.com'
        }
      },
      'inactive_to_active': {
        type: 'user_reactivated',
        subject: 'Your account has been reactivated',
        template: 'user_reactivation',
        data: {
          user_name: user.full_name,
          login_url: process.env.NEXT_PUBLIC_APP_URL || 'https://app.talenttracker.com'
        }
      }
    };

    const key = `${oldStatus}_to_${newStatus}` as keyof typeof notifications;
    return notifications[key] || {
      type: 'status_change',
      subject: 'Account status updated',
      template: 'generic_status_change',
      data: {
        user_name: user.full_name,
        old_status: oldStatus,
        new_status: newStatus
      }
    };
  }

  /**
   * Get bulk operation summary
   */
  static getBulkOperationSummary(
    operation: 'approve' | 'reject' | 'deactivate' | 'reactivate',
    successful: number,
    failed: number,
    total: number
  ): {
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } {
    const operationLabels = {
      approve: 'approved',
      reject: 'rejected',
      deactivate: 'deactivated',
      reactivate: 'reactivated'
    };

    const label = operationLabels[operation];

    if (failed === 0) {
      return {
        title: 'Operation Completed Successfully',
        message: `All ${total} users were ${label} successfully.`,
        type: 'success'
      };
    } else if (successful === 0) {
      return {
        title: 'Operation Failed',
        message: `Failed to ${operation} any of the ${total} selected users.`,
        type: 'error'
      };
    } else {
      return {
        title: 'Operation Partially Completed',
        message: `${successful} users were ${label} successfully, but ${failed} failed.`,
        type: 'warning'
      };
    }
  }

  /**
   * Check if user needs onboarding based on status
   */
  static needsOnboarding(user: UserProfile): boolean {
    return user.status === 'pending';
  }

  /**
   * Check if user has full access
   */
  static hasFullAccess(user: UserProfile): boolean {
    return user.status === 'active';
  }

  /**
   * Check if user is blocked from access
   */
  static isBlocked(user: UserProfile): boolean {
    return user.status === 'inactive';
  }

  /**
   * Get status-based redirect URL
   */
  static getRedirectUrl(user: UserProfile): string {
    switch (user.status) {
      case 'pending':
        return '/pending-approval';
      case 'active':
        return user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      case 'inactive':
        return '/account-suspended';
      default:
        return '/login';
    }
  }

  /**
   * Get status change audit message
   */
  static getAuditMessage(
    oldStatus: UserStatus,
    newStatus: UserStatus,
    changedBy: string,
    reason?: string
  ): string {
    const baseMessage = `Status changed from ${oldStatus} to ${newStatus} by ${changedBy}`;
    return reason ? `${baseMessage}. Reason: ${reason}` : baseMessage;
  }
}

/**
 * Convenience functions for common status operations
 */

// Status validation functions
export const isValidStatusTransition = UserStatusManager.isValidTransition.bind(UserStatusManager);
export const requiresAdminPrivileges = UserStatusManager.requiresAdminPrivileges.bind(UserStatusManager);
export const canPerformStatusChange = UserStatusManager.canPerformStatusChange.bind(UserStatusManager);

// Status information functions
export const getStatusInfo = UserStatusManager.getStatusInfo.bind(UserStatusManager);
export const getAvailableActions = UserStatusManager.getAvailableActions.bind(UserStatusManager);
export const getStatusChangeNotification = UserStatusManager.getStatusChangeNotification.bind(UserStatusManager);

// User access functions
export const needsOnboarding = UserStatusManager.needsOnboarding.bind(UserStatusManager);
export const hasFullAccess = UserStatusManager.hasFullAccess.bind(UserStatusManager);
export const isBlocked = UserStatusManager.isBlocked.bind(UserStatusManager);
export const getRedirectUrl = UserStatusManager.getRedirectUrl.bind(UserStatusManager);

// Utility functions
export const getBulkOperationSummary = UserStatusManager.getBulkOperationSummary.bind(UserStatusManager);
export const getAuditMessage = UserStatusManager.getAuditMessage.bind(UserStatusManager);

// Export the manager class as default
export default UserStatusManager;