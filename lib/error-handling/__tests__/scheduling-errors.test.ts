import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SchedulingErrorCode,
  SchedulingErrorHandler,
  parseApiError,
  handleFetchError
} from '../scheduling-errors'

describe('Scheduling Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('SchedulingErrorHandler', () => {
    describe('createError', () => {
      it('should create error with all properties', () => {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.INVALID_DATE_FORMAT,
          'Test error message',
          'testField',
          { extra: 'data' }
        )

        expect(error.code).toBe(SchedulingErrorCode.INVALID_DATE_FORMAT)
        expect(error.message).toBe('Test error message')
        expect(error.field).toBe('testField')
        expect(error.details).toEqual({ extra: 'data' })
        expect(error.timestamp).toBeInstanceOf(Date)
      })

      it('should create error with minimal properties', () => {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.NETWORK_ERROR,
          'Network failed'
        )

        expect(error.code).toBe(SchedulingErrorCode.NETWORK_ERROR)
        expect(error.message).toBe('Network failed')
        expect(error.field).toBeUndefined()
        expect(error.details).toBeUndefined()
        expect(error.timestamp).toBeInstanceOf(Date)
      })
    })

    describe('getUserFriendlyMessage', () => {
      it('should return user-friendly messages for known error codes', () => {
        const testCases = [
          {
            code: SchedulingErrorCode.INVALID_DATE_FORMAT,
            expected: 'Please enter a valid date in the correct format.'
          },
          {
            code: SchedulingErrorCode.ESCORT_DOUBLE_BOOKING,
            expected: 'This escort is already assigned to another talent or group on this day. Please choose a different escort or remove the existing assignment.'
          },
          {
            code: SchedulingErrorCode.NETWORK_ERROR,
            expected: 'Unable to connect to the server. Please check your internet connection and try again.'
          }
        ]

        testCases.forEach(({ code, expected }) => {
          const error = SchedulingErrorHandler.createError(code, 'Original message')
          const friendlyMessage = SchedulingErrorHandler.getUserFriendlyMessage(error)
          expect(friendlyMessage).toBe(expected)
        })
      })

      it('should return original message for unknown error codes', () => {
        const error = SchedulingErrorHandler.createError(
          'UNKNOWN_CODE' as SchedulingErrorCode,
          'Custom error message'
        )
        const friendlyMessage = SchedulingErrorHandler.getUserFriendlyMessage(error)
        expect(friendlyMessage).toBe('Custom error message')
      })

      it('should return default message when no message provided', () => {
        const error = SchedulingErrorHandler.createError(
          'UNKNOWN_CODE' as SchedulingErrorCode,
          ''
        )
        const friendlyMessage = SchedulingErrorHandler.getUserFriendlyMessage(error)
        expect(friendlyMessage).toBe('An unexpected error occurred. Please try again.')
      })
    })

    describe('getErrorSeverity', () => {
      it('should return correct severity levels', () => {
        const testCases = [
          { code: SchedulingErrorCode.INVALID_DATE_FORMAT, expected: 'low' },
          { code: SchedulingErrorCode.ESCORT_DOUBLE_BOOKING, expected: 'medium' },
          { code: SchedulingErrorCode.MAX_ESCORTS_EXCEEDED, expected: 'high' },
          { code: SchedulingErrorCode.NETWORK_ERROR, expected: 'critical' }
        ]

        testCases.forEach(({ code, expected }) => {
          const error = SchedulingErrorHandler.createError(code, 'Test message')
          const severity = SchedulingErrorHandler.getErrorSeverity(error)
          expect(severity).toBe(expected)
        })
      })

      it('should return medium severity for unknown codes', () => {
        const error = SchedulingErrorHandler.createError(
          'UNKNOWN_CODE' as SchedulingErrorCode,
          'Test message'
        )
        const severity = SchedulingErrorHandler.getErrorSeverity(error)
        expect(severity).toBe('medium')
      })
    })

    describe('shouldRetry', () => {
      it('should return true for retryable errors', () => {
        const retryableCodes = [
          SchedulingErrorCode.NETWORK_ERROR,
          SchedulingErrorCode.DATABASE_ERROR,
          SchedulingErrorCode.INTERNAL_ERROR
        ]

        retryableCodes.forEach(code => {
          const error = SchedulingErrorHandler.createError(code, 'Test message')
          expect(SchedulingErrorHandler.shouldRetry(error)).toBe(true)
        })
      })

      it('should return false for non-retryable errors', () => {
        const nonRetryableCodes = [
          SchedulingErrorCode.INVALID_DATE_FORMAT,
          SchedulingErrorCode.VALIDATION_ERROR,
          SchedulingErrorCode.UNAUTHORIZED
        ]

        nonRetryableCodes.forEach(code => {
          const error = SchedulingErrorHandler.createError(code, 'Test message')
          expect(SchedulingErrorHandler.shouldRetry(error)).toBe(false)
        })
      })
    })

    describe('getRetryDelay', () => {
      it('should return 0 for non-retryable errors', () => {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.VALIDATION_ERROR,
          'Test message'
        )
        const delay = SchedulingErrorHandler.getRetryDelay(error, 1)
        expect(delay).toBe(0)
      })

      it('should return exponential backoff delays for retryable errors', () => {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.NETWORK_ERROR,
          'Test message'
        )

        const delay1 = SchedulingErrorHandler.getRetryDelay(error, 1)
        const delay2 = SchedulingErrorHandler.getRetryDelay(error, 2)
        const delay3 = SchedulingErrorHandler.getRetryDelay(error, 3)

        expect(delay1).toBeGreaterThanOrEqual(1000) // Base delay + jitter
        expect(delay1).toBeLessThan(1200) // Base delay + max jitter
        expect(delay2).toBeGreaterThanOrEqual(2000)
        expect(delay2).toBeLessThan(2400)
        expect(delay3).toBeGreaterThanOrEqual(4000)
        expect(delay3).toBeLessThan(4800)
      })

      it('should cap delay at maximum value', () => {
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.NETWORK_ERROR,
          'Test message'
        )

        const delay = SchedulingErrorHandler.getRetryDelay(error, 10) // High attempt number
        expect(delay).toBeLessThanOrEqual(33000) // Max delay + jitter
      })
    })

    describe('logError', () => {
      it('should log errors with appropriate console method', () => {
        const consoleSpy = vi.spyOn(console, 'error')
        
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.NETWORK_ERROR,
          'Test error'
        )
        
        SchedulingErrorHandler.logError(error, { test: 'context' })
        
        expect(consoleSpy).toHaveBeenCalledWith(
          'Critical scheduling error:',
          expect.objectContaining({
            code: SchedulingErrorCode.NETWORK_ERROR,
            message: 'Test error',
            severity: 'critical',
            context: { test: 'context' }
          })
        )
      })

      it('should log warnings for high priority errors', () => {
        const consoleSpy = vi.spyOn(console, 'warn')
        
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.MAX_ESCORTS_EXCEEDED,
          'Test error'
        )
        
        SchedulingErrorHandler.logError(error)
        
        expect(consoleSpy).toHaveBeenCalledWith(
          'High priority scheduling error:',
          expect.objectContaining({
            code: SchedulingErrorCode.MAX_ESCORTS_EXCEEDED,
            severity: 'high'
          })
        )
      })

      it('should log info for low priority errors', () => {
        const consoleSpy = vi.spyOn(console, 'log')
        
        const error = SchedulingErrorHandler.createError(
          SchedulingErrorCode.INVALID_DATE_FORMAT,
          'Test error'
        )
        
        SchedulingErrorHandler.logError(error)
        
        expect(consoleSpy).toHaveBeenCalledWith(
          'Scheduling error:',
          expect.objectContaining({
            code: SchedulingErrorCode.INVALID_DATE_FORMAT,
            severity: 'low'
          })
        )
      })
    })
  })

  describe('parseApiError', () => {
    it('should parse API error response correctly', () => {
      const apiResponse = {
        code: 'VALIDATION_ERROR',
        error: 'Invalid input data',
        details: { field: 'email' }
      }

      const error = parseApiError(apiResponse)

      expect(error.code).toBe(SchedulingErrorCode.VALIDATION_ERROR)
      expect(error.message).toBe('Invalid input data')
      expect(error.details).toEqual({ field: 'email' })
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should handle API response without code', () => {
      const apiResponse = {
        error: 'Something went wrong'
      }

      const error = parseApiError(apiResponse)

      expect(error.code).toBe(SchedulingErrorCode.INTERNAL_ERROR)
      expect(error.message).toBe('Something went wrong')
    })

    it('should handle empty API response', () => {
      const apiResponse = {}

      const error = parseApiError(apiResponse)

      expect(error.code).toBe(SchedulingErrorCode.INTERNAL_ERROR)
      expect(error.message).toBe('An unexpected error occurred')
    })
  })

  describe('handleFetchError', () => {
    it('should handle network fetch errors', () => {
      const fetchError = new TypeError('Failed to fetch')
      fetchError.name = 'TypeError'

      const error = handleFetchError(fetchError)

      expect(error.code).toBe(SchedulingErrorCode.NETWORK_ERROR)
      expect(error.message).toBe('Network connection failed')
    })

    it('should handle abort errors', () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'

      const error = handleFetchError(abortError)

      expect(error.code).toBe(SchedulingErrorCode.NETWORK_ERROR)
      expect(error.message).toBe('Request was cancelled')
    })

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong')

      const error = handleFetchError(genericError)

      expect(error.code).toBe(SchedulingErrorCode.INTERNAL_ERROR)
      expect(error.message).toBe('Something went wrong')
    })

    it('should handle errors without message', () => {
      const errorWithoutMessage = {}

      const error = handleFetchError(errorWithoutMessage)

      expect(error.code).toBe(SchedulingErrorCode.INTERNAL_ERROR)
      expect(error.message).toBe('An unexpected error occurred')
    })
  })
})