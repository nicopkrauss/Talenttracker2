/**
 * Profile Service - Database utility functions for profile management
 * Authentication System Overhaul - Task 2.2
 */

import { 
  UserProfile, 
  RegistrationData, 
  ProfileUpdateData, 
  ProfileServiceResponse,
  PaginatedResponse,
  PendingUser,
  UserApprovalData,
  BulkOperationResult,
  UserSearchFilters,
  UserSearchResult,
  QueryOptions,
  ValidationResult,
  ProfileError,
  UserStatus,
  SystemRole
} from './auth-types';
} catch (error) {
  // Handle initialization errors gracefully
  console.error('Failed to initialize Prisma client:', error);
  throw error;
}

/**
 * Profile Service Class
 * Handles all database operations for user profiles
 */
export class ProfileService {
  
  /**
   * Create a new user profile
   * Used during registration process
   */
  static async createProfile(
    userId: string, 
    data: Omit<RegistrationData, 'password'>
  ): Promise<ProfileServiceResponse<UserProfile>> {
    try {
      // Validate input data
      const validation = this.validateProfileData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          profileData: data
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to create profile'
        };
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Error creating profile:', error);
      return {
        success: false,
        error: 'Failed to create user profile'
      };
    }
  }

  /**
   * Get user profile by ID
   */
  static async getProfile(
    userId: string, 
    options: QueryOptions = {}
  ): Promise<ProfileServiceResponse<UserProfile>> {
    try {
      const response = await fetch(`/api/auth/profile?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to fetch profile'
        };
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Error fetching profile:', error);
      return {
        success: false,
        error: 'Failed to fetch user profile'
      };
    }
  }

  /**
   * Get user profile by email
   */
  static async getProfileByEmail(
    email: string
  ): Promise<ProfileServiceResponse<UserProfile>> {
    try {
      const profile = await prisma.profiles.findFirst({
        where: { email }
      });

      if (!profile) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      return {
        success: true,
        data: profile as UserProfile
      };

    } catch (error) {
      console.error('Error fetching profile by email:', error);
      return {
        success: false,
        error: 'Failed to fetch user profile'
      };
    }
  }

  /**
   * Update user profile
   * Handles both user self-updates and admin updates
   */
  static async updateProfile(
    userId: string,
    data: ProfileUpdateData,
    updatedBy: string
  ): Promise<ProfileServiceResponse<UserProfile>> {
    try {
      // Validate update data
      const validation = this.validateUpdateData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // Check if profile exists
      const existingProfile = await this.getProfile(userId);
      if (!existingProfile.success) {
        return existingProfile;
      }

      // Check email uniqueness if email is being updated
      if (data.email && data.email !== existingProfile.data?.email) {
        const emailExists = await prisma.profiles.findFirst({
          where: { 
            email: data.email,
            id: { not: userId }
          }
        });

        if (emailExists) {
          return {
            success: false,
            error: 'Email address is already in use'
          };
        }
      }

      // Update profile
      const updatedProfile = await prisma.profiles.update({
        where: { id: userId },
        data: {
          ...data,
          updated_at: new Date()
        }
      });

      return {
        success: true,
        data: updatedProfile as UserProfile
      };

    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: 'Failed to update user profile'
      };
    }
  }

  /**
   * Update user status (admin only)
   */
  static async updateUserStatus(
    userId: string,
    status: UserStatus,
    updatedBy: string
  ): Promise<ProfileServiceResponse<UserProfile>> {
    try {
      // Validate status transition
      const currentProfile = await this.getProfile(userId);
      if (!currentProfile.success) {
        return currentProfile;
      }

      const isValidTransition = this.validateStatusTransition(
        currentProfile.data!.status,
        status
      );

      if (!isValidTransition) {
        return {
          success: false,
          error: `Invalid status transition from ${currentProfile.data!.status} to ${status}`
        };
      }

      // Update status
      const updatedProfile = await prisma.profiles.update({
        where: { id: userId },
        data: {
          status,
          updated_at: new Date()
        }
      });

      return {
        success: true,
        data: updatedProfile as UserProfile
      };

    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: 'Failed to update user status'
      };
    }
  }

  /**
   * Get pending users for admin approval
   */
  static async getPendingUsers(
    page: number = 1,
    limit: number = 20
  ): Promise<ProfileServiceResponse<PaginatedResponse<PendingUser>>> {
    try {
      const offset = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.profiles.findMany({
          where: { status: 'pending' },
          orderBy: { created_at: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.profiles.count({
          where: { status: 'pending' }
        })
      ]);

      const pendingUsers: PendingUser[] = users.map(user => ({
        ...user as UserProfile,
        registration_date: user.created_at!
      }));

      return {
        success: true,
        data: {
          data: pendingUsers,
          total,
          page,
          limit,
          hasMore: offset + users.length < total
        }
      };

    } catch (error) {
      console.error('Error fetching pending users:', error);
      return {
        success: false,
        error: 'Failed to fetch pending users'
      };
    }
  }

  /**
   * Approve multiple users (bulk operation)
   */
  static async approveUsers(
    approvalData: UserApprovalData
  ): Promise<ProfileServiceResponse<BulkOperationResult>> {
    try {
      const results: BulkOperationResult = {
        successful: [],
        failed: [],
        total_processed: approvalData.user_ids.length
      };

      // Process each user approval
      for (const userId of approvalData.user_ids) {
        try {
          const result = await this.updateUserStatus(userId, 'active', approvalData.approved_by);
          
          if (result.success) {
            results.successful.push(userId);
          } else {
            results.failed.push({
              user_id: userId,
              error: result.error || 'Unknown error'
            });
          }
        } catch (error) {
          results.failed.push({
            user_id: userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: true,
        data: results
      };

    } catch (error) {
      console.error('Error approving users:', error);
      return {
        success: false,
        error: 'Failed to process user approvals'
      };
    }
  }

  /**
   * Search and filter users
   */
  static async searchUsers(
    filters: UserSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ProfileServiceResponse<UserSearchResult>> {
    try {
      const offset = (page - 1) * limit;

      // Build where clause from filters
      const whereClause: any = {};

      if (filters.status && filters.status.length > 0) {
        whereClause.status = { in: filters.status };
      }

      if (filters.role && filters.role.length > 0) {
        whereClause.role = { in: filters.role };
      }

      if (filters.search_term) {
        whereClause.OR = [
          { full_name: { contains: filters.search_term, mode: 'insensitive' } },
          { email: { contains: filters.search_term, mode: 'insensitive' } }
        ];
      }

      if (filters.created_after || filters.created_before) {
        whereClause.created_at = {};
        if (filters.created_after) {
          whereClause.created_at.gte = filters.created_after;
        }
        if (filters.created_before) {
          whereClause.created_at.lte = filters.created_before;
        }
      }

      const [users, totalCount] = await Promise.all([
        prisma.profiles.findMany({
          where: whereClause,
          orderBy: { created_at: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.profiles.count({
          where: whereClause
        })
      ]);

      return {
        success: true,
        data: {
          users: users as UserProfile[],
          total_count: totalCount,
          filters_applied: filters
        }
      };

    } catch (error) {
      console.error('Error searching users:', error);
      return {
        success: false,
        error: 'Failed to search users'
      };
    }
  }

  /**
   * Delete user profile (soft delete by setting status to inactive)
   */
  static async deleteProfile(
    userId: string,
    deletedBy: string
  ): Promise<ProfileServiceResponse<boolean>> {
    try {
      await prisma.profiles.update({
        where: { id: userId },
        data: {
          status: 'inactive',
          updated_at: new Date()
        }
      });

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Error deleting profile:', error);
      return {
        success: false,
        error: 'Failed to delete user profile'
      };
    }
  }

  /**
   * Validation helper methods
   */
  private static validateProfileData(data: Omit<RegistrationData, 'password'>): ValidationResult {
    const errors: ProfileError[] = [];

    // Validate required fields
    if (!data.full_name || data.full_name.trim().length === 0) {
      errors.push({
        code: 'REQUIRED_FIELD',
        message: 'Full name is required',
        field: 'full_name'
      });
    }

    if (!data.email || data.email.trim().length === 0) {
      errors.push({
        code: 'REQUIRED_FIELD',
        message: 'Email is required',
        field: 'email'
      });
    }

    // Validate email format
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Invalid email format',
        field: 'email'
      });
    }

    // Validate phone format if provided
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Invalid phone number format',
        field: 'phone'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateUpdateData(data: ProfileUpdateData): ValidationResult {
    const errors: ProfileError[] = [];

    // Validate email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Invalid email format',
        field: 'email'
      });
    }

    // Validate phone format if provided
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Invalid phone number format',
        field: 'phone'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateStatusTransition(from: UserStatus, to: UserStatus): boolean {
    // Define valid status transitions
    const validTransitions: Record<UserStatus, UserStatus[]> = {
      'pending': ['active', 'inactive'],
      'active': ['inactive'],
      'inactive': ['active']
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    // Basic phone validation - adjust regex as needed
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
}

/**
 * Convenience functions for common operations
 */

// Export individual functions for easier importing
export const createProfile = ProfileService.createProfile.bind(ProfileService);
export const getProfile = ProfileService.getProfile.bind(ProfileService);
export const getProfileByEmail = ProfileService.getProfileByEmail.bind(ProfileService);
export const updateProfile = ProfileService.updateProfile.bind(ProfileService);
export const updateUserStatus = ProfileService.updateUserStatus.bind(ProfileService);
export const getPendingUsers = ProfileService.getPendingUsers.bind(ProfileService);
export const approveUsers = ProfileService.approveUsers.bind(ProfileService);
export const searchUsers = ProfileService.searchUsers.bind(ProfileService);
export const deleteProfile = ProfileService.deleteProfile.bind(ProfileService);

// Export the service class as default
export default ProfileService;