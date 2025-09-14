import { z } from 'zod'
import { ProjectSchedule } from '@/lib/types'

// Enhanced date validation with project context
export const createDateValidationSchema = (projectSchedule: ProjectSchedule) => {
  return z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((dateStr) => {
      const date = new Date(dateStr + 'T00:00:00')
      return !isNaN(date.getTime())
    }, "Invalid date")
    .refine((dateStr) => {
      const date = new Date(dateStr + 'T00:00:00')
      return date >= projectSchedule.startDate && date <= projectSchedule.endDate
    }, "Date must be within project date range")
}

// Enhanced date array validation
export const createDateArrayValidationSchema = (projectSchedule: ProjectSchedule) => {
  const dateSchema = createDateValidationSchema(projectSchedule)
  
  return z.array(dateSchema)
    .min(1, "At least one date must be selected")
    .refine((dates) => {
      // Check for duplicate dates
      const uniqueDates = new Set(dates)
      return uniqueDates.size === dates.length
    }, "Duplicate dates are not allowed")
    .refine((dates) => {
      // Ensure dates are in chronological order
      const sortedDates = [...dates].sort()
      return JSON.stringify(dates) === JSON.stringify(sortedDates)
    }, "Dates must be in chronological order")
}

// Staff availability validation schema
export const createStaffAvailabilityValidationSchema = (projectSchedule: ProjectSchedule) => {
  const dateSchema = createDateValidationSchema(projectSchedule)
  
  return z.object({
    userId: z.string().uuid("Invalid user ID"),
    projectId: z.string().uuid("Invalid project ID"),
    availableDates: z.array(dateSchema)
      .min(1, "At least one available date is required")
      .max(projectSchedule.allDates.length, "Cannot be available for more days than the project duration")
      .refine((dates) => {
        // Check for duplicate dates
        const uniqueDates = new Set(dates)
        return uniqueDates.size === dates.length
      }, "Duplicate dates are not allowed")
      .refine((dates) => {
        // Ensure dates are in chronological order
        const sortedDates = [...dates].sort()
        return JSON.stringify(dates) === JSON.stringify(sortedDates)
      }, "Dates must be in chronological order")
  })
}

// Talent scheduling validation schema
export const createTalentSchedulingValidationSchema = (projectSchedule: ProjectSchedule) => {
  const dateSchema = createDateValidationSchema(projectSchedule)
  
  return z.object({
    talentId: z.string().uuid("Invalid talent ID"),
    projectId: z.string().uuid("Invalid project ID"),
    scheduledDates: z.array(dateSchema)
      .min(1, "At least one scheduled date is required")
      .max(projectSchedule.allDates.length, "Cannot be scheduled for more days than the project duration")
      .refine((dates) => {
        // Check for duplicate dates
        const uniqueDates = new Set(dates)
        return uniqueDates.size === dates.length
      }, "Duplicate dates are not allowed")
      .refine((dates) => {
        // Ensure dates are in chronological order
        const sortedDates = [...dates].sort()
        return JSON.stringify(dates) === JSON.stringify(sortedDates)
      }, "Dates must be in chronological order")
  })
}

// Group member validation with enhanced rules
export const groupMemberValidationSchema = z.object({
  name: z.string()
    .min(1, "Member name is required")
    .max(100, "Member name must be 100 characters or less")
    .regex(/^[a-zA-Z\s'-]+$/, "Member name can only contain letters, spaces, hyphens, and apostrophes"),
  role: z.string()
    .max(50, "Member role must be 50 characters or less")
    .optional()
    .default("")
})

// Enhanced talent group validation schema
export const createTalentGroupValidationSchema = (projectSchedule: ProjectSchedule) => {
  const dateSchema = createDateValidationSchema(projectSchedule)
  
  return z.object({
    projectId: z.string().uuid("Invalid project ID"),
    groupName: z.string()
      .min(1, "Group name is required")
      .max(100, "Group name must be 100 characters or less")
      .regex(/^[a-zA-Z0-9\s'-]+$/, "Group name can only contain letters, numbers, spaces, hyphens, and apostrophes"),
    members: z.array(groupMemberValidationSchema)
      .min(1, "At least one group member is required")
      .max(20, "Groups cannot have more than 20 members")
      .refine((members) => {
        // Check for duplicate member names
        const names = members.map(m => m.name.toLowerCase().trim())
        const uniqueNames = new Set(names)
        return uniqueNames.size === names.length
      }, "Duplicate member names are not allowed"),
    scheduledDates: z.array(dateSchema)
      .max(projectSchedule.allDates.length, "Cannot be scheduled for more days than the project duration")
      .optional()
      .default([]),
    pointOfContactName: z.string()
      .max(255, "Point of contact name must be 255 characters or less")
      .regex(/^[a-zA-Z\s'-]*$/, "Point of contact name can only contain letters, spaces, hyphens, and apostrophes")
      .optional(),
    pointOfContactPhone: z.string()
      .max(20, "Phone number must be 20 characters or less")
      .regex(/^[\d\s\-\(\)\+\.]*$/, "Invalid phone number format")
      .optional()
  })
}

// Assignment validation with conflict detection
export const createAssignmentValidationSchema = (projectSchedule: ProjectSchedule) => {
  const dateSchema = createDateValidationSchema(projectSchedule)
  
  return z.object({
    date: dateSchema,
    talents: z.array(z.object({
      talentId: z.string().uuid("Invalid talent ID"),
      escortIds: z.array(z.string().uuid("Invalid escort ID"))
        .max(5, "Cannot assign more than 5 escorts to a single talent")
    })).default([]),
    groups: z.array(z.object({
      groupId: z.string().uuid("Invalid group ID"),
      escortIds: z.array(z.string().uuid("Invalid escort ID"))
        .max(10, "Cannot assign more than 10 escorts to a single group")
    })).default([])
  }).refine((data) => {
    // Check for escort double-booking within the same assignment
    const allEscortIds: string[] = []
    
    data.talents.forEach(t => allEscortIds.push(...t.escortIds))
    data.groups.forEach(g => allEscortIds.push(...g.escortIds))
    
    const uniqueEscortIds = new Set(allEscortIds)
    return uniqueEscortIds.size === allEscortIds.length
  }, "An escort cannot be assigned to multiple talents/groups on the same day")
}

// Validation error formatting utility
export interface ValidationError {
  field: string
  message: string
  code: string
}

export function formatValidationErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))
}

// Schedule consistency validation
export function validateScheduleConsistency(
  talentScheduledDates: string[],
  assignmentDate: string,
  projectSchedule: ProjectSchedule
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check if assignment date is within talent's scheduled dates
  if (!talentScheduledDates.includes(assignmentDate)) {
    errors.push("Cannot assign escort to talent on a day they are not scheduled")
  }
  
  // Check if assignment date is within project range
  const date = new Date(assignmentDate + 'T00:00:00')
  if (date < projectSchedule.startDate || date > projectSchedule.endDate) {
    errors.push("Assignment date is outside project date range")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Availability validation
export function validateAvailabilityConsistency(
  escortAvailableDates: string[],
  assignmentDate: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check if escort is available on assignment date
  if (!escortAvailableDates.includes(assignmentDate)) {
    errors.push("Cannot assign escort who is not available on this date")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Group member data integrity validation
export function validateGroupMemberIntegrity(members: Array<{ name: string; role: string }>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Check for empty names
  const emptyNames = members.filter(m => !m.name.trim())
  if (emptyNames.length > 0) {
    errors.push("All group members must have a name")
  }
  
  // Check for duplicate names (case-insensitive)
  const names = members.map(m => m.name.toLowerCase().trim())
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
  if (duplicates.length > 0) {
    errors.push("Group members must have unique names")
  }
  
  // Check for excessively long names
  const longNames = members.filter(m => m.name.length > 100)
  if (longNames.length > 0) {
    errors.push("Member names cannot exceed 100 characters")
  }
  
  // Check for invalid characters in names
  const invalidNames = members.filter(m => !/^[a-zA-Z\s'-]+$/.test(m.name))
  if (invalidNames.length > 0) {
    errors.push("Member names can only contain letters, spaces, hyphens, and apostrophes")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}