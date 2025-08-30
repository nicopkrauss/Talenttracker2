/**
 * Authentication Error Handler
 * Centralized error handling for database operations
 * Authentication System Overhaul - Task 2.2
 */

import { Prisma } from '@prisma/client';
import { ProfileError } from './auth-types';

/**
 * Authentication Error Handler Class
 * Provides consistent error handling and user-friendly messages
 */
export class AuthErrorHandler {

  /**
   * Handle Prisma database errors
   */
  static handlePrismaError(error: any): ProfileError {
    // Handle known Prisma error types
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          // Unique constraint violation
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes('email')) {
            return {
              code: 'EMAIL_EXISTS',
              message: 'An account with this email address already exists',
              field: 'email'
            };
          }
          return {
            code: 'DUPLICATE_ENTRY',
            message: 'This record already exists',
          };

        case 'P2025':
          // Record not found
          return {
            code: 'NOT_FOUND',
            message: 'The requested user profile was not found'
          };

        case 'P2003':
          // Foreign key constraint violation
          return {
            code: 'INVALID_REFERENCE',
            message: 'Invalid reference to related record'
          };

        case 'P2014':
          // Required relation violation
          return {
            code: 'MISSING_RELATION',
            message: 'Required relationship is missing'
          };

        case 'P2021':
          // Table does not exist
          return {
            code: 'DATABASE_ERROR',
            message: 'Database configuration error'
          };

        case 'P2022':
          // Column does not exist
          return {
            code: 'DATABASE_ERROR',
            message: 'Database schema error'
          };

        default:
          console.error('Unhandled Prisma error:', error.code, error.message);
          return {
            code: 'DATABASE_ERROR',
            message: 'A database error occurred'
          };
      }
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided'
      };
    }

    // Handle Prisma initialization errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        code: 'CONNECTION_ERROR',
        message: 'Unable to connect to database'
      };
    }

    // Handle Prisma runtime errors
    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return {
        code: 'RUNTIME_ERROR',
        message: 'Database runtime error occurred'
      };
    }

    // Handle generic errors
    return this.handleGenericError(error);
  }

  /**
   * Handle authentication-specific errors
   */
  static handleAuthError(error: any): ProfileError {
    // Handle Supabase Auth errors
    if (error?.message) {
      const message = error.message.toLowerCase();

      if (message.includes('email not confirmed')) {
        return {
          code: 'EMAIL_NOT_CONFIRMED',
          message: 'Please confirm your email address before signing in',
          field: 'email'
        };
      }

      if (message.includes('invalid login credentials')) {
        return {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          field: 'credentials'
        };
      }

      if (message.includes('email already registered')) {
        return {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email address already exists',
          field: 'email'
        };
      }

      if (message.includes('password')) {
        return {
          code: 'PASSWORD_ERROR',
          message: 'Password does not meet requirements',
          field: 'password'
        };
      }

      if (message.includes('rate limit')) {
        return {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please try again later'
        };
      }

      if (message.includes('network')) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network connection error. Please check your internet connection'
        };
      }
    }

    return this.handleGenericError(error);
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, value: any, rule: string): ProfileError {
    const validationErrors: Record<string, Record<string, string>> = {
      email: {
        required: 'Email address is required',
        format: 'Please enter a valid email address',
        length: 'Email address is too long'
      },
      full_name: {
        required: 'Full name is required',
        length: 'Name must be between 2 and 100 characters',
        format: 'Name contains invalid characters'
      },
      phone: {
        format: 'Please enter a valid phone number',
        length: 'Phone number is too long'
      },
      password: {
        required: 'Password is required',
        length: 'Password must be at least 8 characters long',
        strength: 'Password must contain uppercase, lowercase, number, and special character'
      },
      status: {
        invalid: 'Invalid user status',
        transition: 'Invalid status transition'
      },
      role: {
        invalid: 'Invalid user role',
        unauthorized: 'You do not have permission to assign this role'
      }
    };

    const fieldErrors = validationErrors[field];
    const message = fieldErrors?.[rule] || `Invalid ${field}`;

    return {
      code: 'VALIDATION_ERROR',
      message,
      field
    };
  }

  /**
   * Handle authorization errors
   */
  static handleAuthorizationError(action: string, resource: string): ProfileError {
    return {
      code: 'UNAUTHORIZED',
      message: `You do not have permission to ${action} ${resource}`
    };
  }

  /**
   * Handle rate limiting errors
   */
  static handleRateLimitError(action: string, retryAfter?: number): ProfileError {
    const baseMessage = `Too many ${action} attempts.`;
    const retryMessage = retryAfter 
      ? ` Please try again in ${retryAfter} seconds.`
      : ' Please try again later.';

    return {
      code: 'RATE_LIMITED',
      message: baseMessage + retryMessage
    };
  }

  /**
   * Handle generic errors
   */
  static handleGenericError(error: any): ProfileError {
    console.error('Unhandled error:', error);

    // Try to extract meaningful information from the error
    if (error?.message) {
      return {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.'
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.'
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: ProfileError): string {
    // Map technical error codes to user-friendly messages
    const friendlyMessages: Record<string, string> = {
      'EMAIL_EXISTS': 'This email address is already registered. Please use a different email or try signing in.',
      'NOT_FOUND': 'The requested information could not be found.',
      'INVALID_CREDENTIALS': 'The email or password you entered is incorrect. Please try again.',
      'EMAIL_NOT_CONFIRMED': 'Please check your email and click the confirmation link before signing in.',
      'RATE_LIMITED': 'You\'ve made too many attempts. Please wait a few minutes before trying again.',
      'NETWORK_ERROR': 'Connection problem. Please check your internet connection and try again.',
      'DATABASE_ERROR': 'We\'re experiencing technical difficulties. Please try again in a few minutes.',
      'VALIDATION_ERROR': error.message, // Use the specific validation message
      'UNAUTHORIZED': 'You don\'t have permission to perform this action.',
      'CONNECTION_ERROR': 'Unable to connect to our servers. Please try again later.',
      'UNKNOWN_ERROR': 'Something went wrong. Please try again or contact support if the problem persists.'
    };

    return friendlyMessages[error.code] || error.message;
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: ProfileError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'CONNECTION_ERROR',
      'DATABASE_ERROR',
      'RUNTIME_ERROR'
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Get error severity level
   */
  static getErrorSeverity(error: ProfileError): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'VALIDATION_ERROR': 'low',
      'EMAIL_EXISTS': 'low',
      'INVALID_CREDENTIALS': 'low',
      'NOT_FOUND': 'medium',
      'UNAUTHORIZED': 'medium',
      'RATE_LIMITED': 'medium',
      'EMAIL_NOT_CONFIRMED': 'medium',
      'NETWORK_ERROR': 'high',
      'CONNECTION_ERROR': 'high',
      'DATABASE_ERROR': 'critical',
      'RUNTIME_ERROR': 'critical',
      'UNKNOWN_ERROR': 'high'
    };

    return severityMap[error.code] || 'medium';
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: ProfileError, context?: Record<string, any>): void {
    const severity = this.getErrorSeverity(error);
    const logData = {
      code: error.code,
      message: error.message,
      field: error.field,
      severity,
      context,
      timestamp: new Date().toISOString()
    };

    switch (severity) {
      case 'critical':
        console.error('CRITICAL AUTH ERROR:', logData);
        break;
      case 'high':
        console.error('HIGH AUTH ERROR:', logData);
        break;
      case 'medium':
        console.warn('MEDIUM AUTH ERROR:', logData);
        break;
      case 'low':
        console.info('LOW AUTH ERROR:', logData);
        break;
    }
  }
}

/**
 * Convenience functions for error handling
 */
export const handlePrismaError = AuthErrorHandler.handlePrismaError.bind(AuthErrorHandler);
export const handleAuthError = AuthErrorHandler.handleAuthError.bind(AuthErrorHandler);
export const handleValidationError = AuthErrorHandler.handleValidationError.bind(AuthErrorHandler);
export const handleAuthorizationError = AuthErrorHandler.handleAuthorizationError.bind(AuthErrorHandler);
export const handleRateLimitError = AuthErrorHandler.handleRateLimitError.bind(AuthErrorHandler);
export const getUserFriendlyMessage = AuthErrorHandler.getUserFriendlyMessage.bind(AuthErrorHandler);
export const isRetryableError = AuthErrorHandler.isRetryableError.bind(AuthErrorHandler);
export const logError = AuthErrorHandler.logError.bind(AuthErrorHandler);

// Export the handler class as default
export default AuthErrorHandler;