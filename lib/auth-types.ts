/**
 * Authentication-related TypeScript interfaces for database schema
 * Based on existing Prisma schema for authentication system overhaul
 */

// Enum types from database
export type UserStatus = 'pending' | 'active' | 'inactive';
export type SystemRole = 'admin' | 'in_house';
export type ProjectRole = 'supervisor' | 'coordinator' | 'talent_escort';

// Core user profile interface matching database schema
export interface UserProfile {
  id: string; // UUID
  full_name: string;
  email: string;
  phone?: string | null;
  nearest_major_city?: string | null;
  willing_to_fly?: boolean | null;
  profile_picture_url?: string | null;
  status: UserStatus;
  role?: SystemRole | null;
  created_at: Date;
  updated_at: Date;
}

// Registration data interface for new user creation
export interface RegistrationData {
  role: Exclude<SystemRole | ProjectRole, 'admin'>; // All roles except admin
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  nearestMajorCity: string;
  willingToFly?: boolean;
  agreeToTerms: boolean;
  // Computed field for database storage
  full_name?: string;
}

// Login data interface
export interface LoginData {
  email: string;
  password: string;
}

// Profile update data interface (for admin and user updates)
export interface ProfileUpdateData {
  full_name?: string;
  email?: string;
  phone?: string;
  nearest_major_city?: string;
  willing_to_fly?: boolean;
  profile_picture_url?: string;
  status?: UserStatus;
  role?: SystemRole;
}

// User session interface for authentication context
export interface UserSession {
  user: {
    id: string;
    email: string;
    aud: string;
    role?: string;
  };
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Profile service response interfaces
export interface ProfileServiceResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// User management interfaces for admin operations
export interface PendingUser extends UserProfile {
  // Additional fields for pending user management
  registration_date: Date;
}

export interface UserApprovalData {
  user_ids: string[];
  approved_by: string;
  notification_sent?: boolean;
}

// Error types for profile operations
export interface ProfileError {
  code: string;
  message: string;
  field?: string;
}

// Profile validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ProfileError[];
}

// Database operation options
export interface QueryOptions {
  include?: {
    email_notifications?: boolean;
    notifications?: boolean;
    projects?: boolean;
    shifts?: boolean;
    timecards?: boolean;
  };
  orderBy?: {
    field: keyof UserProfile;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

// Status transition validation
export interface StatusTransition {
  from: UserStatus;
  to: UserStatus;
  allowed: boolean;
  requires_admin: boolean;
}

// Role assignment interface
export interface RoleAssignment {
  user_id: string;
  system_role?: SystemRole;
  project_roles?: {
    project_id: string;
    role: ProjectRole;
  }[];
}

// Audit trail interface for profile changes
export interface ProfileAuditEntry {
  id: string;
  user_id: string;
  changed_by: string;
  field_name: string;
  old_value: any;
  new_value: any;
  change_reason?: string;
  created_at: Date;
}

// Email notification data for user events
export interface UserNotificationData {
  user_id: string;
  type: 'registration' | 'approval' | 'rejection' | 'role_change' | 'status_change';
  recipient_email: string;
  template_data: Record<string, any>;
}

// Bulk operations interface
export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    user_id: string;
    error: string;
  }>;
  total_processed: number;
}

// Search and filter interfaces
export interface UserSearchFilters {
  status?: UserStatus[];
  role?: SystemRole[];
  search_term?: string; // Search in name, email
  created_after?: Date;
  created_before?: Date;
}

export interface UserSearchResult {
  users: UserProfile[];
  total_count: number;
  filters_applied: UserSearchFilters;
}