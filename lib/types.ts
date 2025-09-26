import { z } from 'zod'
import { LucideIcon } from 'lucide-react'

export interface TalentProfile {
  id: string
  // Enhanced personal information
  first_name: string
  last_name: string
  
  // Representative information
  rep_name: string
  rep_email: string
  rep_phone: string
  
  // Enhanced notes field
  notes?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Project relationships (many-to-many)
  talent_assignments?: Array<TalentProjectAssignment>
  
  // Joined data for project information only
  projects?: {
    name: string
    status: string
  }
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
  edit_comments?: string
  admin_notes?: string
  admin_edited?: boolean
  last_edited_by?: string
  edit_type?: "user_correction" | "admin_adjustment" | "system_correction"
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  rejection_reason?: string
  rejected_fields?: string[]
  created_at: string
  updated_at: string
  
  // Multi-day timecard fields
  is_multi_day?: boolean
  working_days?: number
  period_start_date?: string
  period_end_date?: string
  total_break_duration?: number
  daily_entries?: Array<{
    id: string
    work_date: string
    check_in_time?: string
    check_out_time?: string
    break_start_time?: string
    break_end_time?: string
    hours_worked: number
    break_duration: number
    daily_pay: number
  }>
  
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

// Major cities list for dropdown
export const MAJOR_CITIES = [
  'Atlanta, GA',
  'Austin, TX',
  'Baltimore, MD',
  'Boston, MA',
  'Charlotte, NC',
  'Chicago, IL',
  'Cleveland, OH',
  'Dallas, TX',
  'Denver, CO',
  'Detroit, MI',
  'Houston, TX',
  'Indianapolis, IN',
  'Kansas City, MO',
  'Las Vegas, NV',
  'Los Angeles, CA',
  'Miami, FL',
  'Minneapolis, MN',
  'Nashville, TN',
  'New Orleans, LA',
  'New York, NY',
  'Orlando, FL',
  'Philadelphia, PA',
  'Phoenix, AZ',
  'Portland, OR',
  'Salt Lake City, UT',
  'San Antonio, TX',
  'San Diego, CA',
  'San Francisco, CA',
  'Seattle, WA',
  'St. Louis, MO',
  'Tampa, FL',
  'Washington, DC'
] as const

// System role types (matches database enum)
export type SystemRole = 'admin' | 'in_house' | 'supervisor' | 'coordinator' | 'talent_escort'

// Role display names for registration (excluding admin which is not selectable during registration)
export const REGISTRATION_ROLE_LABELS: Record<Exclude<SystemRole, 'admin'>, string> = {
  in_house: 'In-House Staff',
  supervisor: 'Supervisor',
  coordinator: 'Coordinator',
  talent_escort: 'Talent Escort'
}

// Authentication Zod validation schemas with enhanced validation
export const registrationSchema = z.object({
  // Role selection (first field) - matches system_role enum except admin
  role: z.enum(['in_house', 'supervisor', 'coordinator', 'talent_escort'] as const, {
    required_error: "Please select your position"
  }),
  
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
  
  // Changed from city/state to nearest major city
  nearestMajorCity: z.enum(MAJOR_CITIES, {
    required_error: "Please select your nearest major city"
  }),
  
  // Conditional flight willingness (only for roles that get flights covered)
  willingToFly: z.boolean().optional(),
  
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

  talent_expected: z.number()
    .int("Expected talent must be a whole number")
    .min(0, "Expected talent cannot be negative")
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
  const startDate = new Date(data.start_date + 'T00:00:00')
  const endDate = new Date(data.end_date + 'T00:00:00')
  return startDate < endDate
}, {
  message: "End date must be after start date",
  path: ["end_date"]
})

export const projectRoleFormSchema = z.object({
  role_name: z.enum(['supervisor', 'coordinator', 'talent_escort']),
  base_pay_rate: z.number()
    .positive("Pay rate must be a positive number")
    .max(9999.99, "Pay rate cannot exceed $9,999.99")
    .optional()
})

export const projectLocationFormSchema = z.object({
  name: z.string()
    .min(1, "Location name is required")
    .max(100, "Location name must be 100 characters or less"),
  
  abbreviation: z.string()
    .max(3, "Abbreviation must be 3 characters or less")
    .optional(),
  
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
    .optional()
    .default("#3b82f6"),
  
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

// Project-specific roles (stored in team_assignments table)
export type ProjectRole = 'supervisor' | 'coordinator' | 'talent_escort'

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
  nearest_major_city?: string
  willing_to_fly?: boolean
  profile_picture_url?: string
  role: SystemRole | null
  status: 'pending' | 'approved' | 'rejected' | 'active'
  created_at: string
  updated_at: string
}

// Registration form data interface
export interface RegistrationData {
  role: Exclude<SystemRole, 'admin'> // All system roles except admin
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  nearestMajorCity: string
  willingToFly?: boolean
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
  role?: SystemRole
  nearest_major_city?: string
  willing_to_fly?: boolean
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
  location?: string
  talent_expected?: number
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
  role: 'supervisor' | 'coordinator' | 'talent_escort'
  base_pay?: number
  created_at: string
}

// Project Location interface
export interface ProjectLocation {
  id: string
  project_id: string
  name: string
  abbreviation?: string
  color?: string
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at?: string
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
  talent_expected?: number
  start_date: string
  end_date: string
}

// Project role form data
export interface ProjectRoleFormData {
  role_name: 'supervisor' | 'coordinator' | 'talent_escort'
  base_pay_rate?: number
}

// Project location form data
export interface ProjectLocationFormData {
  name: string
  abbreviation?: string
  color?: string
  is_default?: boolean
  sort_order?: number
}

// Project statistics interface
export interface ProjectStatistics {
  talentExpected: number
  talentAssigned: number
  staffNeeded: number
  staffAssigned: number
  staffCheckedIn?: number
  talentPresent?: number
  activeEscorts?: number
  staffOvertime?: {
    over8Hours: number
    over12Hours: number
  }
}

// Enhanced project interface with statistics
export interface EnhancedProject extends Project {
  statistics: ProjectStatistics
}

// Team Assignment interface
export interface TeamAssignment {
  id: string
  project_id: string
  user_id: string
  role: ProjectRole
  pay_rate?: number
  time_type: 'hourly' | 'daily'
  schedule_notes?: string
  available_dates?: string[] // ISO date strings for availability
  confirmed_at?: string // When availability was confirmed
  created_at: string
  profiles: {
    id: string
    full_name: string
    email: string
    phone?: string
    nearest_major_city?: string
    willing_to_fly?: boolean
  }
}

// Team Assignment form data
export interface TeamAssignmentFormData {
  user_id: string
  role: ProjectRole
  pay_rate?: number
  schedule_notes?: string
}

// Available staff member interface
export interface AvailableStaff {
  id: string
  full_name: string
  email: string
  phone?: string
  nearest_major_city?: string
  willing_to_fly?: boolean
  role?: SystemRole | null
  status: string
  created_at: string
}

// Staff filter interface
export interface StaffFilter {
  search: string
  role: string | null
  location: string | null
  status: string | null
  willing_to_fly: boolean | null
  sort_by: string
  sort_order: 'asc' | 'desc'
}

// Assignment summary interface
export interface AssignmentSummary {
  supervisorCount: number
  coordinatorCount: number
  escortCount: number
  totalStaffAssigned: number
  estimatedDailyCost: number
}

// Role definition interface (legacy - for backward compatibility)
export interface RoleDefinition {
  role: ProjectRole
  displayName: string
  basePayRate: number
  timeType: 'Daily' | 'Hourly'
  assignmentCount: number
}

// Project role template interface
export interface ProjectRoleTemplate {
  id: string
  project_id: string
  role: ProjectRole
  display_name: string
  base_pay_rate: number
  time_type: 'hourly' | 'daily'
  description?: string
  is_active: boolean
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Form data for role template creation/editing
export interface ProjectRoleTemplateFormData {
  role: ProjectRole
  display_name: string
  base_pay_rate: number
  time_type: 'hourly' | 'daily'
  description?: string
  is_active?: boolean
  is_default?: boolean
  sort_order?: number
}

// Project details interface (extended project with all related data)
export interface ProjectDetails extends Project {
  project_setup_checklist: ProjectSetupChecklist
  project_roles: ProjectRoleConfig[]
  project_role_templates: ProjectRoleTemplate[]
  project_locations: ProjectLocation[]
  team_assignments?: TeamAssignment[]
  // Additional computed properties
  setup_progress: number // 0-100 percentage
  is_setup_complete: boolean
  can_activate: boolean
}

// Multi-Day Scheduling System Types

// Project Schedule interface with calculated rehearsal and show dates
export interface ProjectSchedule {
  startDate: Date
  endDate: Date
  rehearsalDates: Date[] // computed: start_date to (end_date - 1)
  showDates: Date[] // computed: [end_date]
  allDates: Date[] // computed: start_date to end_date
  isSingleDay: boolean // computed: startDate === endDate
}

// Staff Availability interface for team member availability tracking
export interface StaffAvailability {
  userId: string
  projectId: string
  availableDates: Date[]
  confirmedAt: Date
  updatedAt: Date
}

// Talent Scheduling interface for talent day assignments
export interface TalentScheduling {
  talentId: string
  projectId: string
  scheduledDates: Date[]
  isGroup: boolean
  updatedAt: Date
}

// Talent Group interface for group management
export interface TalentGroup {
  id: string
  projectId: string
  groupName: string
  members: GroupMember[]
  scheduledDates: string[] // Date strings from database
  assignedEscortId?: string
  displayOrder?: number // For unified ordering with talent
  pointOfContactName?: string // Optional point of contact name
  pointOfContactPhone?: string // Optional point of contact phone
  createdAt: string // ISO date string from database
  updatedAt: string // ISO date string from database
  assignedEscort?: {
    id: string
    full_name: string
  }
  // For backward compatibility with database response
  group_name?: string
  project_id?: string
  assigned_escort_id?: string
  display_order?: number
  point_of_contact_name?: string
  point_of_contact_phone?: string
  created_at?: string
  updated_at?: string
}

// Group Member interface for individual members within a group
export interface GroupMember {
  name: string
  role: string
}

// Unified roster item for drag-and-drop ordering
export interface RosterItem {
  id: string
  type: 'talent' | 'group'
  displayOrder: number
  data: TalentProfile | TalentGroup
}

// Day Assignment interface for assignment tracking
export interface DayAssignment {
  date: Date
  assignments: TalentEscortPair[]
}

// Talent-Escort Pair interface for assignment tracking
export interface TalentEscortPair {
  talentId: string
  talentName: string
  isGroup: boolean
  escortId?: string
  escortName?: string
  // Multi-dropdown support for groups
  escortAssignments?: Array<{
    escortId?: string
    escortName?: string
  }>
}

// Enhanced Team Assignment with availability dates
export interface EnhancedTeamAssignment extends TeamAssignment {
  availableDates?: Date[]
  isConfirmed: boolean
}

// Enhanced Talent Project Assignment with scheduling dates
export interface EnhancedTalentProjectAssignment extends TalentProjectAssignment {
  scheduledDates?: Date[]
}

// Assignment dropdown section types
export type AssignmentDropdownSection = 'available' | 'rehearsal_assigned' | 'current_day_assigned'

// Escort availability status for dropdowns
export interface EscortAvailabilityStatus {
  escortId: string
  escortName: string
  section: AssignmentDropdownSection
  currentAssignment?: {
    talentName: string
    date: Date
  }
}

// Form data interfaces for multi-day scheduling

// Staff availability confirmation form data
export interface StaffAvailabilityFormData {
  userId: string
  projectId: string
  availableDates: string[] // ISO date strings
}

// Talent scheduling form data
export interface TalentSchedulingFormData {
  talentId: string
  projectId: string
  scheduledDates: string[] // ISO date strings
}

// Talent group creation form data
export interface TalentGroupFormData {
  projectId: string
  groupName: string
  members: GroupMember[]
  scheduledDates: string[] // ISO date strings
  pointOfContactName?: string // Optional point of contact name
  pointOfContactPhone?: string // Optional point of contact phone
}

// Assignment form data
export interface AssignmentFormData {
  date: string // ISO date string
  assignments: {
    talentId: string
    escortId?: string
  }[]
}

// Validation schemas for multi-day scheduling

export const staffAvailabilitySchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  projectId: z.string().uuid("Invalid project ID"),
  availableDates: z.array(z.string().datetime("Invalid date format"))
    .min(1, "At least one available date is required")
})

export const talentSchedulingSchema = z.object({
  talentId: z.string().uuid("Invalid talent ID"),
  projectId: z.string().uuid("Invalid project ID"),
  scheduledDates: z.array(z.string().datetime("Invalid date format"))
    .min(1, "At least one scheduled date is required")
})

export const groupMemberSchema = z.object({
  name: z.string()
    .min(1, "Member name is required")
    .max(100, "Member name must be 100 characters or less"),
  role: z.string()
    .max(50, "Member role must be 50 characters or less")
    .optional()
    .default("")
})

export const talentGroupSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  groupName: z.string()
    .min(1, "Group name is required")
    .max(100, "Group name must be 100 characters or less"),
  members: z.array(groupMemberSchema)
    .min(1, "At least one group member is required")
    .max(20, "Groups cannot have more than 20 members"),
  scheduledDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"))
    .optional()
    .default([]),
  pointOfContactName: z.string()
    .max(255, "Point of contact name must be 255 characters or less")
    .optional(),
  pointOfContactPhone: z.string()
    .max(20, "Phone number must be 20 characters or less")
    .regex(/^[\d\s\-\(\)\+\.]*$/, "Invalid phone number format")
    .optional()
})

export const assignmentSchema = z.object({
  date: z.string().datetime("Invalid date format"),
  assignments: z.array(z.object({
    talentId: z.string().uuid("Invalid talent ID"),
    escortId: z.string().uuid("Invalid escort ID").optional()
  }))
})

// Daily Assignment System Types (Multi-Day Escort Assignments)

// Database record interface for individual talent daily assignments
export interface TalentDailyAssignment {
  id: string
  talent_id: string
  project_id: string
  assignment_date: string // ISO date string (YYYY-MM-DD)
  escort_id: string
  created_at: string
  updated_at: string
  // Joined data for API responses
  talent?: {
    id: string
    first_name: string
    last_name: string
  }
  escort?: {
    id: string
    full_name: string
  }
  project?: {
    id: string
    name: string
  }
}

// Database record interface for talent group daily assignments
export interface GroupDailyAssignment {
  id: string
  group_id: string
  project_id: string
  assignment_date: string // ISO date string (YYYY-MM-DD)
  escort_id: string
  created_at: string
  updated_at: string
  // Joined data for API responses
  group?: {
    id: string
    group_name: string
  }
  escort?: {
    id: string
    full_name: string
  }
  project?: {
    id: string
    name: string
  }
}

// API response interface for daily assignment summary
export interface DailyAssignmentSummary {
  date: string // ISO date string (YYYY-MM-DD)
  talents: Array<{
    talentId: string
    talentName: string
    escorts: Array<{
      escortId: string
      escortName: string
    }>
  }>
  groups: Array<{
    groupId: string
    groupName: string
    escorts: Array<{
      escortId: string
      escortName: string
    }>
  }>
}

// API request interface for creating/updating daily assignments
export interface DailyAssignmentRequest {
  date: string // ISO date string (YYYY-MM-DD)
  talents: Array<{
    talentId: string
    escortIds: string[] // Can be empty to clear assignments
  }>
  groups: Array<{
    groupId: string
    escortIds: string[] // Can be empty to clear, supports multiple escorts
  }>
}

// Validation schemas for daily assignment system

export const talentDailyAssignmentSchema = z.object({
  talent_id: z.string().uuid("Invalid talent ID"),
  project_id: z.string().uuid("Invalid project ID"),
  assignment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  escort_id: z.string().uuid("Invalid escort ID")
})

export const groupDailyAssignmentSchema = z.object({
  group_id: z.string().uuid("Invalid group ID"),
  project_id: z.string().uuid("Invalid project ID"),
  assignment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  escort_id: z.string().uuid("Invalid escort ID")
})

export const dailyAssignmentRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  talents: z.array(z.object({
    talentId: z.string().uuid("Invalid talent ID"),
    escortIds: z.array(z.string().uuid("Invalid escort ID"))
  })).default([]),
  groups: z.array(z.object({
    groupId: z.string().uuid("Invalid group ID"),
    escortIds: z.array(z.string().uuid("Invalid escort ID"))
  })).default([])
}).refine((data) => {
  // Validate that the date is not in the past (optional business rule)
  const assignmentDate = new Date(data.date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return assignmentDate >= today
}, {
  message: "Assignment date cannot be in the past",
  path: ["date"]
})

// Bulk assignment operations schema
export const bulkAssignmentSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  assignments: z.array(dailyAssignmentRequestSchema)
    .min(1, "At least one assignment is required")
    .max(100, "Cannot process more than 100 assignments at once")
})

// Clear day assignment schema
export const clearDayAssignmentSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
})

// Type inference from daily assignment Zod schemas
export type TalentDailyAssignmentInput = z.infer<typeof talentDailyAssignmentSchema>
export type GroupDailyAssignmentInput = z.infer<typeof groupDailyAssignmentSchema>
export type DailyAssignmentRequestInput = z.infer<typeof dailyAssignmentRequestSchema>
export type BulkAssignmentInput = z.infer<typeof bulkAssignmentSchema>
export type ClearDayAssignmentInput = z.infer<typeof clearDayAssignmentSchema>

// Type inference from existing Zod schemas
export type StaffAvailabilityInput = z.infer<typeof staffAvailabilitySchema>
export type TalentSchedulingInput = z.infer<typeof talentSchedulingSchema>
export type GroupMemberInput = z.infer<typeof groupMemberSchema>
export type TalentGroupInput = z.infer<typeof talentGroupSchema>
export type AssignmentInput = z.infer<typeof assignmentSchema>