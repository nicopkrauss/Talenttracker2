"use client"

import { useState, useCallback, useRef } from 'react'
import { SchedulingError, SchedulingErrorHandler } from '@/lib/error-handling/scheduling-errors'

interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  onRetry?: (attempt: number, error: SchedulingError) => void
}

interface ErrorRecoveryState {
  error: SchedulingError | null
  isRetrying: boolean
  attemptCount: number
  canRetry: boolean
}

export function useErrorRecovery(options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry
  } = options

  const [state, setState] = useState<ErrorRecoveryState>({
    error: null,
    isRetrying: false,
    attemptCount: 0,
    canRetry: false
  })

  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  const setError = useCallback((error: SchedulingError) => {
    // Log the error
    SchedulingErrorHandler.logError(error)

    const canRetry = SchedulingErrorHandler.shouldRetry(error) && state.attemptCount < maxAttempts

    setState({
      error,
      isRetrying: false,
      attemptCount: state.attemptCount + 1,
      canRetry
    })
  }, [state.attemptCount, maxAttempts])

  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    setState({
      error: null,
      isRetrying: false,
      attemptCount: 0,
      canRetry: false
    })
  }, [])

  const retry = useCallback(async (operation: () => Promise<any>) => {
    if (!state.error || !state.canRetry || state.isRetrying) {
      return
    }

    setState(prev => ({ ...prev, isRetrying: true }))

    try {
      const delay = SchedulingErrorHandler.getRetryDelay(state.error, state.attemptCount)
      
      if (delay > 0) {
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay)
        })
      }

      onRetry?.(state.attemptCount, state.error)
      
      const result = await operation()
      clearError()
      return result
    } catch (error: any) {
      const schedulingError = error instanceof Error 
        ? SchedulingErrorHandler.createError(
            'INTERNAL_ERROR' as any,
            error.message
          )
        : error as SchedulingError

      setError(schedulingError)
      throw schedulingError
    }
  }, [state.error, state.canRetry, state.isRetrying, state.attemptCount, onRetry, clearError])

  const executeWithRetry = useCallback(async (
    operation: () => Promise<any>,
    customOptions?: Partial<RetryOptions>
  ) => {
    const effectiveMaxAttempts = customOptions?.maxAttempts ?? maxAttempts
    let currentAttempt = 0

    while (currentAttempt < effectiveMaxAttempts) {
      try {
        const result = await operation()
        clearError()
        return result
      } catch (error: any) {
        currentAttempt++
        
        const schedulingError = error instanceof Error 
          ? SchedulingErrorHandler.createError(
              'INTERNAL_ERROR' as any,
              error.message
            )
          : error as SchedulingError

        // Log the error
        SchedulingErrorHandler.logError(schedulingError, { attempt: currentAttempt })

        // If this is the last attempt or error shouldn't be retried, throw it
        if (currentAttempt >= effectiveMaxAttempts || !SchedulingErrorHandler.shouldRetry(schedulingError)) {
          setError(schedulingError)
          throw schedulingError
        }

        // Wait before retrying
        const delay = SchedulingErrorHandler.getRetryDelay(schedulingError, currentAttempt)
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        customOptions?.onRetry?.(currentAttempt, schedulingError)
      }
    }
  }, [maxAttempts, clearError, setError])

  return {
    error: state.error,
    isRetrying: state.isRetrying,
    attemptCount: state.attemptCount,
    canRetry: state.canRetry,
    setError,
    clearError,
    retry,
    executeWithRetry,
    getUserFriendlyMessage: (error?: SchedulingError) => 
      SchedulingErrorHandler.getUserFriendlyMessage(error || state.error!),
    getErrorSeverity: (error?: SchedulingError) =>
      SchedulingErrorHandler.getErrorSeverity(error || state.error!)
  }
}