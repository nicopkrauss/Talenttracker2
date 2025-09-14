"use client"

import { useState, useCallback, useMemo } from 'react'
import { z } from 'zod'
import { ProjectSchedule } from '@/lib/types'
import { 
  createDateValidationSchema,
  createDateArrayValidationSchema,
  createStaffAvailabilityValidationSchema,
  createTalentSchedulingValidationSchema,
  createTalentGroupValidationSchema,
  createAssignmentValidationSchema,
  validateScheduleConsistency,
  validateAvailabilityConsistency,
  validateGroupMemberIntegrity,
  formatValidationErrors,
  ValidationError
} from '@/lib/validation/scheduling-validation'
import { SchedulingError, SchedulingErrorHandler, SchedulingErrorCode } from '@/lib/error-handling/scheduling-errors'

interface ValidationState {
  isValid: boolean
  errors: ValidationError[]
  fieldErrors: Record<string, string>
  hasBeenValidated: boolean
}

interface UseSchedulingValidationOptions {
  projectSchedule: ProjectSchedule
  validateOnChange?: boolean
  debounceMs?: number
}

export function useSchedulingValidation(options: UseSchedulingValidationOptions) {
  const { projectSchedule, validateOnChange = true, debounceMs = 300 } = options
  
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: false,
    errors: [],
    fieldErrors: {},
    hasBeenValidated: false
  })

  // Check if we have a valid project schedule (not a dummy one)
  const hasValidSchedule = projectSchedule.allDates.length > 0

  // Create validation schemas based on project schedule
  const schemas = useMemo(() => ({
    date: createDateValidationSchema(projectSchedule),
    dateArray: createDateArrayValidationSchema(projectSchedule),
    staffAvailability: createStaffAvailabilityValidationSchema(projectSchedule),
    talentScheduling: createTalentSchedulingValidationSchema(projectSchedule),
    talentGroup: createTalentGroupValidationSchema(projectSchedule),
    assignment: createAssignmentValidationSchema(projectSchedule)
  }), [projectSchedule])

  // Generic validation function
  const validateWithSchema = useCallback(<T>(
    schema: z.ZodSchema<T>,
    data: any,
    fieldPrefix?: string
  ): { isValid: boolean; errors: ValidationError[]; data?: T } => {
    try {
      const validatedData = schema.parse(data)
      return {
        isValid: true,
        errors: [],
        data: validatedData
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = formatValidationErrors(error).map(err => ({
          ...err,
          field: fieldPrefix ? `${fieldPrefix}.${err.field}` : err.field
        }))
        return {
          isValid: false,
          errors
        }
      }
      return {
        isValid: false,
        errors: [{
          field: fieldPrefix || 'unknown',
          message: 'Validation failed',
          code: 'unknown'
        }]
      }
    }
  }, [])

  // Update validation state
  const updateValidationState = useCallback((
    isValid: boolean,
    errors: ValidationError[]
  ) => {
    const fieldErrors = errors.reduce((acc, error) => {
      acc[error.field] = error.message
      return acc
    }, {} as Record<string, string>)

    setValidationState({
      isValid,
      errors,
      fieldErrors,
      hasBeenValidated: true
    })
  }, [])

  // Validate single date
  const validateDate = useCallback((date: string): boolean => {
    if (!hasValidSchedule) return true // Skip validation if no valid schedule
    
    const result = validateWithSchema(schemas.date, date)
    if (!result.isValid) {
      updateValidationState(false, result.errors)
    }
    return result.isValid
  }, [hasValidSchedule, schemas.date, validateWithSchema, updateValidationState])

  // Validate date array
  const validateDateArray = useCallback((dates: string[]): boolean => {
    if (!hasValidSchedule) return true // Skip validation if no valid schedule
    
    const result = validateWithSchema(schemas.dateArray, dates)
    if (!result.isValid) {
      updateValidationState(false, result.errors)
    }
    return result.isValid
  }, [hasValidSchedule, schemas.dateArray, validateWithSchema, updateValidationState])

  // Validate staff availability
  const validateStaffAvailability = useCallback((data: {
    userId: string
    projectId: string
    availableDates: string[]
  }): boolean => {
    if (!hasValidSchedule) return true // Skip validation if no valid schedule
    
    const result = validateWithSchema(schemas.staffAvailability, data)
    if (!result.isValid) {
      updateValidationState(false, result.errors)
    }
    return result.isValid
  }, [hasValidSchedule, schemas.staffAvailability, validateWithSchema, updateValidationState])

  // Validate talent scheduling
  const validateTalentScheduling = useCallback((data: {
    talentId: string
    projectId: string
    scheduledDates: string[]
  }): boolean => {
    if (!hasValidSchedule) return true // Skip validation if no valid schedule
    
    const result = validateWithSchema(schemas.talentScheduling, data)
    if (!result.isValid) {
      updateValidationState(false, result.errors)
    }
    return result.isValid
  }, [hasValidSchedule, schemas.talentScheduling, validateWithSchema, updateValidationState])

  // Validate talent group
  const validateTalentGroup = useCallback((data: {
    projectId: string
    groupName: string
    members: Array<{ name: string; role: string }>
    scheduledDates?: string[]
    pointOfContactName?: string
    pointOfContactPhone?: string
  }): boolean => {
    if (!hasValidSchedule) return true // Skip validation if no valid schedule
    
    // First validate with schema
    const schemaResult = validateWithSchema(schemas.talentGroup, data)
    if (!schemaResult.isValid) {
      updateValidationState(false, schemaResult.errors)
      return false
    }

    // Additional group member integrity validation
    const memberIntegrityResult = validateGroupMemberIntegrity(data.members)
    if (!memberIntegrityResult.isValid) {
      const errors: ValidationError[] = memberIntegrityResult.errors.map(error => ({
        field: 'members',
        message: error,
        code: 'invalid_member_data'
      }))
      updateValidationState(false, errors)
      return false
    }

    return true
  }, [hasValidSchedule, schemas.talentGroup, validateWithSchema, updateValidationState])

  // Validate assignment
  const validateAssignment = useCallback((data: {
    date: string
    talents: Array<{ talentId: string; escortIds: string[] }>
    groups: Array<{ groupId: string; escortIds: string[] }>
  }): boolean => {
    if (!hasValidSchedule) return true // Skip validation if no valid schedule
    
    const result = validateWithSchema(schemas.assignment, data)
    if (!result.isValid) {
      updateValidationState(false, result.errors)
    }
    return result.isValid
  }, [hasValidSchedule, schemas.assignment, validateWithSchema, updateValidationState])

  // Validate schedule consistency
  const validateScheduleConsistencyCheck = useCallback((
    talentScheduledDates: string[],
    assignmentDate: string
  ): boolean => {
    if (!hasValidSchedule) return true // Skip validation if no valid schedule
    
    const result = validateScheduleConsistency(
      talentScheduledDates,
      assignmentDate,
      projectSchedule
    )
    
    if (!result.isValid) {
      const errors: ValidationError[] = result.errors.map(error => ({
        field: 'schedule',
        message: error,
        code: 'schedule_inconsistency'
      }))
      updateValidationState(false, errors)
    }
    
    return result.isValid
  }, [hasValidSchedule, projectSchedule, updateValidationState])

  // Validate availability consistency
  const validateAvailabilityConsistencyCheck = useCallback((
    escortAvailableDates: string[],
    assignmentDate: string
  ): boolean => {
    const result = validateAvailabilityConsistency(
      escortAvailableDates,
      assignmentDate
    )
    
    if (!result.isValid) {
      const errors: ValidationError[] = result.errors.map(error => ({
        field: 'availability',
        message: error,
        code: 'availability_inconsistency'
      }))
      updateValidationState(false, errors)
    }
    
    return result.isValid
  }, [updateValidationState])

  // Clear validation state
  const clearValidation = useCallback(() => {
    setValidationState({
      isValid: false,
      errors: [],
      fieldErrors: {},
      hasBeenValidated: false
    })
  }, [])

  // Get field error
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return validationState.fieldErrors[fieldName]
  }, [validationState.fieldErrors])

  // Check if field has error
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return fieldName in validationState.fieldErrors
  }, [validationState.fieldErrors])

  // Create scheduling error from validation errors
  const createSchedulingError = useCallback((
    validationErrors: ValidationError[]
  ): SchedulingError => {
    const primaryError = validationErrors[0]
    return SchedulingErrorHandler.createError(
      SchedulingErrorCode.VALIDATION_ERROR,
      primaryError?.message || 'Validation failed',
      primaryError?.field,
      { validationErrors }
    )
  }, [])

  return {
    // Validation state
    isValid: validationState.isValid,
    errors: validationState.errors,
    fieldErrors: validationState.fieldErrors,
    hasBeenValidated: validationState.hasBeenValidated,
    
    // Validation functions
    validateDate,
    validateDateArray,
    validateStaffAvailability,
    validateTalentScheduling,
    validateTalentGroup,
    validateAssignment,
    validateScheduleConsistency: validateScheduleConsistencyCheck,
    validateAvailabilityConsistency: validateAvailabilityConsistencyCheck,
    
    // Utility functions
    clearValidation,
    getFieldError,
    hasFieldError,
    createSchedulingError,
    
    // Schemas for external use
    schemas
  }
}