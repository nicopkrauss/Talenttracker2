// Scheduling-specific error types and handling

export enum SchedulingErrorCode {
  // Date validation errors
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  DATE_OUT_OF_RANGE = 'DATE_OUT_OF_RANGE',
  DUPLICATE_DATES = 'DUPLICATE_DATES',
  DATES_NOT_CHRONOLOGICAL = 'DATES_NOT_CHRONOLOGICAL',
  
  // Assignment errors
  ESCORT_DOUBLE_BOOKING = 'ESCORT_DOUBLE_BOOKING',
  TALENT_NOT_SCHEDULED = 'TALENT_NOT_SCHEDULED',
  ESCORT_NOT_AVAILABLE = 'ESCORT_NOT_AVAILABLE',
  ASSIGNMENT_CONFLICT = 'ASSIGNMENT_CONFLICT',
  MAX_ESCORTS_EXCEEDED = 'MAX_ESCORTS_EXCEEDED',
  
  // Group errors
  DUPLICATE_GROUP_NAME = 'DUPLICATE_GROUP_NAME',
  DUPLICATE_MEMBER_NAMES = 'DUPLICATE_MEMBER_NAMES',
  INVALID_MEMBER_DATA = 'INVALID_MEMBER_DATA',
  GROUP_SIZE_EXCEEDED = 'GROUP_SIZE_EXCEEDED',
  
  // Availability errors
  AVAILABILITY_CONFLICT = 'AVAILABILITY_CONFLICT',
  INVALID_AVAILABILITY_DATES = 'INVALID_AVAILABILITY_DATES',
  
  // Network and system errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface SchedulingError {
  code: SchedulingErrorCode
  message: string
  field?: string
  details?: any
  timestamp: Date
}

export class SchedulingErrorHandler {
  static createError(
    code: SchedulingErrorCode,
    message: string,
    field?: string,
    details?: any
  ): SchedulingError {
    return {
      code,
      message,
      field,
      details,
      timestamp: new Date()
    }
  }

  static getUserFriendlyMessage(error: SchedulingError): string {
    switch (error.code) {
      case SchedulingErrorCode.INVALID_DATE_FORMAT:
        return "Please enter a valid date in the correct format."
      
      case SchedulingErrorCode.DATE_OUT_OF_RANGE:
        return "The selected date is outside the project date range. Please choose a date within the project timeline."
      
      case SchedulingErrorCode.DUPLICATE_DATES:
        return "You have selected the same date multiple times. Please remove duplicate dates."
      
      case SchedulingErrorCode.DATES_NOT_CHRONOLOGICAL:
        return "Dates must be in chronological order. Please rearrange your selections."
      
      case SchedulingErrorCode.ESCORT_DOUBLE_BOOKING:
        return "This escort is already assigned to another talent or group on this day. Please choose a different escort or remove the existing assignment."
      
      case SchedulingErrorCode.TALENT_NOT_SCHEDULED:
        return "Cannot assign an escort to talent who is not scheduled for this day. Please schedule the talent first."
      
      case SchedulingErrorCode.ESCORT_NOT_AVAILABLE:
        return "This escort is not available on the selected date. Please choose an available escort or update their availability."
      
      case SchedulingErrorCode.ASSIGNMENT_CONFLICT:
        return "There is a conflict with this assignment. Please check existing assignments and try again."
      
      case SchedulingErrorCode.MAX_ESCORTS_EXCEEDED:
        return "You have exceeded the maximum number of escorts allowed for this assignment."
      
      case SchedulingErrorCode.DUPLICATE_GROUP_NAME:
        return "A group with this name already exists in this project. Please choose a different name."
      
      case SchedulingErrorCode.DUPLICATE_MEMBER_NAMES:
        return "Group members must have unique names. Please ensure all member names are different."
      
      case SchedulingErrorCode.INVALID_MEMBER_DATA:
        return "Some group member information is invalid. Please check names and roles."
      
      case SchedulingErrorCode.GROUP_SIZE_EXCEEDED:
        return "Groups cannot have more than 20 members. Please reduce the number of members."
      
      case SchedulingErrorCode.AVAILABILITY_CONFLICT:
        return "There is a conflict with the availability dates. Please check your selections."
      
      case SchedulingErrorCode.INVALID_AVAILABILITY_DATES:
        return "Some availability dates are invalid. Please check your date selections."
      
      case SchedulingErrorCode.NETWORK_ERROR:
        return "Unable to connect to the server. Please check your internet connection and try again."
      
      case SchedulingErrorCode.DATABASE_ERROR:
        return "There was a problem saving your changes. Please try again in a moment."
      
      case SchedulingErrorCode.UNAUTHORIZED:
        return "You don't have permission to perform this action. Please contact your administrator."
      
      case SchedulingErrorCode.PROJECT_NOT_FOUND:
        return "The project could not be found. It may have been deleted or you may not have access to it."
      
      case SchedulingErrorCode.VALIDATION_ERROR:
        return "Some information is invalid. Please check your entries and try again."
      
      case SchedulingErrorCode.INTERNAL_ERROR:
        return "An unexpected error occurred. Please try again or contact support if the problem persists."
      
      default:
        return error.message || "An unexpected error occurred. Please try again."
    }
  }

  static getErrorSeverity(error: SchedulingError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.code) {
      case SchedulingErrorCode.INVALID_DATE_FORMAT:
      case SchedulingErrorCode.DUPLICATE_DATES:
      case SchedulingErrorCode.DATES_NOT_CHRONOLOGICAL:
      case SchedulingErrorCode.DUPLICATE_MEMBER_NAMES:
      case SchedulingErrorCode.INVALID_MEMBER_DATA:
        return 'low'
      
      case SchedulingErrorCode.DATE_OUT_OF_RANGE:
      case SchedulingErrorCode.ESCORT_DOUBLE_BOOKING:
      case SchedulingErrorCode.TALENT_NOT_SCHEDULED:
      case SchedulingErrorCode.ESCORT_NOT_AVAILABLE:
      case SchedulingErrorCode.ASSIGNMENT_CONFLICT:
      case SchedulingErrorCode.DUPLICATE_GROUP_NAME:
      case SchedulingErrorCode.AVAILABILITY_CONFLICT:
        return 'medium'
      
      case SchedulingErrorCode.MAX_ESCORTS_EXCEEDED:
      case SchedulingErrorCode.GROUP_SIZE_EXCEEDED:
      case SchedulingErrorCode.INVALID_AVAILABILITY_DATES:
      case SchedulingErrorCode.VALIDATION_ERROR:
        return 'high'
      
      case SchedulingErrorCode.NETWORK_ERROR:
      case SchedulingErrorCode.DATABASE_ERROR:
      case SchedulingErrorCode.UNAUTHORIZED:
      case SchedulingErrorCode.PROJECT_NOT_FOUND:
      case SchedulingErrorCode.INTERNAL_ERROR:
        return 'critical'
      
      default:
        return 'medium'
    }
  }

  static shouldRetry(error: SchedulingError): boolean {
    switch (error.code) {
      case SchedulingErrorCode.NETWORK_ERROR:
      case SchedulingErrorCode.DATABASE_ERROR:
      case SchedulingErrorCode.INTERNAL_ERROR:
        return true
      
      default:
        return false
    }
  }

  static getRetryDelay(error: SchedulingError, attemptNumber: number): number {
    if (!this.shouldRetry(error)) return 0
    
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const baseDelay = 1000
    const maxDelay = 30000
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay)
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay
    return delay + jitter
  }

  static logError(error: SchedulingError, context?: any): void {
    const severity = this.getErrorSeverity(error)
    const logData = {
      ...error,
      severity,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    }

    if (severity === 'critical') {
      console.error('Critical scheduling error:', logData)
    } else if (severity === 'high') {
      console.warn('High priority scheduling error:', logData)
    } else {
      console.log('Scheduling error:', logData)
    }

    // In production, you would send this to your error tracking service
    // Example: Sentry.captureException(error, { extra: logData })
  }
}

// Utility function to convert API errors to SchedulingError
export function parseApiError(response: any): SchedulingError {
  const code = response.code as SchedulingErrorCode || SchedulingErrorCode.INTERNAL_ERROR
  const message = response.error || 'An unexpected error occurred'
  const details = response.details
  
  return SchedulingErrorHandler.createError(code, message, undefined, details)
}

// Utility function to handle fetch errors
export function handleFetchError(error: any): SchedulingError {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return SchedulingErrorHandler.createError(
      SchedulingErrorCode.NETWORK_ERROR,
      'Network connection failed'
    )
  }
  
  if (error.name === 'AbortError') {
    return SchedulingErrorHandler.createError(
      SchedulingErrorCode.NETWORK_ERROR,
      'Request was cancelled'
    )
  }
  
  return SchedulingErrorHandler.createError(
    SchedulingErrorCode.INTERNAL_ERROR,
    error.message || 'An unexpected error occurred'
  )
}