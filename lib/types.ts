import { z } from 'zod'
import { LucideIcon } from 'lucide-react'

export interface TalentProfile {
  id: string
  // Enhanced personal information
  first_name: string
  last_name: string
  
  // New representative information
  rep_name: string
  rep_email: string
  rep_phone: string
  
  // Enhanced notes field
  notes?: string
  
  // Simplified contact info (emergency contact removed)
  contact_info: {
    phone?: string
    email?: string
  }
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Project relationships (many-to-many)
  talent_assignments?: Array<TalentProjectAssignment>
  
  // Joined data
  projects?: {
    name: string
    status: string
  }
  talent_status?: Array<{
    talent_locations: {
      name: string
    }
    updated_at: string
  }>
}

export interface TalentProjectAssignment {
  id: string
  talent_id: string
  project_id: string
  assigned_at: string
  assigned_by: string
  status: 'active' | 'inactive' | 'completed'
  escort_id?: string
  created_at: string
  updated_at: string
}

// Location tracking interfaces (project-based)
export interface TalentLocation {
  id: string
  project_id: string
  name: string
  description?: string
  is_default: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface TalentLocationUpdate {
  id: string
  talent_id: string
  project_id: string
  location_id: string
  updated_by: string
  timestamp: string
  notes?: string
  created_at: string
  // Joined data
  location?: TalentLocation
  updated_by_profile?: {
    full_name: string
  }
}

export interface TalentStatus {
  id: string
  talent_id: string
  project_id: string
  current_location_id?: string
  status: 'not_arrived' | 'on_location' | 'on_break' | 'departed'
  last_updated: string
  updated_by?: string
  created_at: string
  updated_at: string
  // Joined data
  current_location?: TalentLocation
  updated_by_profile?: {
    full_name: string
  }
}

// Legacy interface for backward compatibility
export interface LocationUpdate {
  id: string
  talent_id: string
  location: string
  timestamp: string
  updated_by: string
}

export interface Timecard {
  id: string
  user_id: string
  project_id: string
  date: string
  check_in_time?: string
  check_out_time?: string
  break_start_time?: string
  break_end_time?: string
  total_hours: number
  break_duration: number
  pay_rate: number
  total_pay: number
  status: "draft" | "submitted" | "approved" | "rejected"
  manually_edited: boolean
  supervisor_comments?: string
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  created_at: string
  updated_at: string
  // Joined data from foreign keys
  profiles?: {
    full_name: string
  }
  projects?: {
    name: string
  }
}

export interface TimecardSummary {
  user_id: string
  user_name: string
  project_name: string
  total_hours: number
  total_pay: number
  timecard_count: number
  pending_count: number
}

// Zod validation schemas
export const talentProfileSchema = z.object({
  first_name: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  
  last_name: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  
  rep_name: z.string()
    .min(1, "Representative name is required")
    .max(100, "Representative name must be 100 characters or less"),
  
  rep_email: z.string()
    .email("Please enter a valid email address"),
  
  rep_phone: z.string()
    .min(1, "Representative phone is required")
    .regex(/^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/, 
      "Please enter a valid phone number"),
  
  notes: z.string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional()
})

export const talentProjectAssignmentSchema = z.object({
  talent_id: z.string().uuid("Invalid talent ID"),
  project_id: z.string().uuid("Invalid project ID"),
  assigned_by: z.string().uuid("Invalid assigned by ID"),
  status: z.enum(['active', 'inactive', 'completed']).default('active'),
  escort_id: z.string().uuid().optional()
})

// Password strength validation function
export const validatePasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }
  
  const score = Object.values(checks).filter(Boolean).length
  
  return {
    score,
    checks,
    strength: score < 3 ? 'weak' : score < 4 ? 'medium' : 'strong'
  }
}

// Enhanced phone number validation with formatting
const phoneRegex = /^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/

// Authentication Zod validation schemas with enhanced validation
export const registrationSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less")
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
  
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
  
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .refine(
      (email) => email.length <= 254,
      "Email address is too long"
    ),
  
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .refine(
      (password) => {
        const { score } = validatePasswordStrength(password)
        return score >= 3
      },
      "Password must contain at least 3 of: lowercase letter, uppercase letter, number, special character"
    ),
  
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(phoneRegex, "Please enter a valid US phone number (e.g., (555) 123-4567)")
    .transform((phone) => {
      // Normalize phone number format
      const digits = phone.replace(/\D/g, '')
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      } else if (digits.length === 11 && digits.startsWith('1')) {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
      }
      return phone
    }),
  
  city: z.string()
    .min(1, "City is required")
    .max(100, "City must be 100 characters or less")
    .regex(/^[a-zA-Z\s'-]+$/, "City can only contain letters, spaces, hyphens, and apostrophes"),
  
  state: z.string()
    .min(2, "State is required")
    .max(50, "State must be 50 characters or less")
    .regex(/^[a-zA-Z\s]+$/, "State can only contain letters and spaces"),
  
  agreeToTerms: z.boolean()
    .refine(val => val === true, "You must agree to the Terms of Service and Privacy Policy")
})

export const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase(),
  
  password: z.string()
    .min(1, "Password is required")
})

// Project Management Zod validation schemas
export const projectFormSchema = z.object({
  name: z.string()
    .min(1, "Project name is required")
    .max(255, "Project name must be 255 characters or less"),
  
  description: z.string()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),
  
  production_company: z.string()
    .max(255, "Production company must be 255 characters or less")
    .optional(),
  
  hiring_contact: z.string()
    .max(255, "Hiring contact must be 255 characters or less")
    .optional(),
  
  project_location: z.string()
    .max(255, "Project location must be 255 characters or less")
    .optional(),
  
  start_date: z.string()
    .min(1, "Start date is required")
    .refine((date) => {
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }, "Please enter a valid start date"),
  
  end_date: z.string()
    .min(1, "End date is required")
    .refine((date) => {
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }, "Please enter a valid end date")
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  return startDate < endDate
}, {
  message: "End date must be after start date",
  path: ["end_date"]
})

export const projectRoleFormSchema = z.object({
  role_name: z.enum(['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort']),
  base_pay_rate: z.number()
    .positive("Pay rate must be a positive number")
    .max(9999.99, "Pay rate cannot exceed $9,999.99")
    .optional()
})

export const projectLocationFormSchema = z.object({
  name: z.string()
    .min(1, "Location name is required")
    .max(100, "Location name must be 100 characters or less"),
  
  is_default: z.boolean().optional().default(false),
  
  sort_order: z.number()
    .int("Sort order must be a whole number")
    .min(0, "Sort order cannot be negative")
    .optional()
})

// Type inference from Zod schemas
export type TalentProfileInput = z.infer<typeof talentProfileSchema>
export type TalentProjectAssignmentInput = z.infer<typeof talentProjectAssignmentSchema>
export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProjectFormInput = z.infer<typeof projectFormSchema>
export type ProjectRoleFormInput = z.infer<typeof projectRoleFormSchema>
export type ProjectLocationFormInput = z.infer<typeof projectLocationFormSchema>

// Navigation System Types

// System-level roles (stored in profiles table)
export type SystemRole = 'admin' | 'in_house'

// Project-specific roles (stored in team_assignments table)
export type ProjectRole = 'supervisor' | 'talent_logistics_coordinator' | 'talent_escort'

// Combined type for navigation and permissions (system + project roles)
export type UserRole = SystemRole | ProjectRole

// Navigation item interface
export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  roles: UserRole[]
}

// User interface for navigation context
export interface NavigationUser {
  id: string
  name: string
  email: string
  avatar?: string
  systemRole: SystemRole | null
  currentProjectRole?: ProjectRole | null
}

// Navigation state interface
export interface NavigationState {
  currentPath: string
  userRole: UserRole
  availableItems: NavItem[]
}

// Navigation component props
export interface NavigationProps {
  userRole: UserRole
  currentPath: string
  user: NavigationUser
}

// Authentication System Types

// Supabase Auth User interface
export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    avatar_url?: string
  }
}

// Extended User Profile interface for authentication
export interface UserProfile {
  id: string
  full_name: string
  email: string
  phone?: string
  city?: string
  state?: string
  profile_picture_url?: string
  role: SystemRole | null
  status: 'pending' | 'approved' | 'rejected' | 'active'
  created_at: string
  updated_at: string
}

// Registration form data interface
export interface RegistrationData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  city: string
  state: string
  agreeToTerms: boolean
}

// Login form data interface
export interface LoginData {
  email: string
  password: string
}

// Authentication context interface
export interface AuthContextType {
  user: AuthUser | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (data: LoginData) => Promise<void>
  signUp: (data: RegistrationData) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// Pending user interface for admin approval queue
export interface PendingUser {
  id: string
  full_name: string
  email: string
  phone?: string
  city?: string
  state?: string
  created_at: string
}

// Notification System Types

// Notification data interface
export interface NotificationData {
  userId: string
  email: string
  fullName: string
  type: 'approval' | 'rejection' | 'welcome'
  metadata?: Record<string, any>
}

// Notification result interface
export interface NotificationResult {
  success: boolean
  error?: string
  notificationId?: string
}

// Notification record interface (for database tracking)
export interface NotificationRecord {
  id: string
  user_id: string
  type: string
  channel: string
  recipient: string
  subject?: string
  content?: string
  status: 'pending' | 'sent' | 'failed' | 'bounced'
  error_message?: string
  created_at: string
  sent_at?: string
  updated_at: string
}

// Email notification interface
export interface EmailNotification {
  to: string
  subject: string
  html: string
  text: string
}

// Project Management System Types

// Project status type
export type ProjectStatus = 'prep' | 'active' | 'archived'

// Core Project interface
export interface Project {
  id: string
  name: string
  description?: string
  production_company?: string
  hiring_contact?: string
  project_location?: string
  start_date: string // ISO date string
  end_date: string // ISO date string
  status: ProjectStatus
  created_at: string
  updated_at: string
  created_by: string
  // Joined data
  created_by_profile?: {
    full_name: string
  }
  project_setup_checklist?: ProjectSetupChecklist
  project_roles?: ProjectRoleConfig[]
  project_locations?: ProjectLocation[]
}

// Project Setup Checklist interface
export interface ProjectSetupChecklist {
  project_id: string
  roles_and_pay_completed: boolean
  talent_roster_completed: boolean
  team_assignments_completed: boolean
  locations_completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}

// Project Role Configuration interface
export interface ProjectRoleConfig {
  id: string
  project_id: string
  role_name: 'admin' | 'in_house' | 'supervisor' | 'talent_logistics_coordinator' | 'talent_escort'
  base_pay_rate?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Project Location interface
export interface ProjectLocation {
  id: string
  project_id: string
  name: string
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Project form data interfaces

// Create project form data
export interface CreateProjectData {
  name: string
  description?: string
  production_company?: string
  hiring_contact?: string
  project_location?: string
  start_date: string
  end_date: string
}

// Update project form data
export interface UpdateProjectData {
  name?: string
  description?: string
  production_company?: string
  hiring_contact?: string
  project_location?: string
  start_date?: string
  end_date?: string
}

// Project form data (for forms that handle both create and edit)
export interface ProjectFormData {
  name: string
  description?: string
  production_company?: string
  hiring_contact?: string
  project_location?: string
  start_date: string
  end_date: string
}

// Project role form data
export interface ProjectRoleFormData {
  role_name: 'admin' | 'in_house' | 'supervisor' | 'talent_logistics_coordinator' | 'talent_escort'
  base_pay_rate?: number
}

// Project location form data
export interface ProjectLocationFormData {
  name: string
  is_default?: boolean
  sort_order?: number
}

// Project details interface (extended project with all related data)
export interface ProjectDetails extends Project {
  project_setup_checklist: ProjectSetupChecklist
  project_roles: ProjectRoleConfig[]
  project_locations: ProjectLocation[]
  // Additional computed properties
  setup_progress: number // 0-100 percentage
  is_setup_complete: boolean
  can_activate: boolean
}