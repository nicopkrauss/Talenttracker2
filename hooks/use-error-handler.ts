"use client"

import { useState, useCallback, useEffect } from "react"
import { FormError, parseAuthError, createFormError } from "@/components/auth/form-error-display"

interface UseErrorHandlerOptions {
  maxRetries?: number
  retryDelay?: number
  onError?: (error: FormError) => void
  onRetrySuccess?: () => void
}

interface ErrorHandlerState {
  error: FormError | null
  isRetrying: boolean
  retryCount: number
  canRetry: boolean
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetrySuccess
  } = options

  const [state, setState] = useState<ErrorHandlerState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: false
  })

  // Handle error with automatic parsing and retry logic
  const handleError = useCallback((error: any) => {
    const parsedError = parseAuthError(error)
    const canRetry = parsedError.retryable && state.retryCount < maxRetries

    setState(prev => ({
      error: parsedError,
      isRetrying: false,
      retryCount: prev.retryCount,
      canRetry: canRetry || false
    }))

    onError?.(parsedError)
  }, [maxRetries, onError, state.retryCount])

  // Clear error state
  const clearError = useCallback(() => {
    setState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      canRetry: false
    })
  }, [])

  // Retry function with delay and exponential backoff
  const retry = useCallback(async (retryFn: () => Promise<void> | void) => {
    if (!state.canRetry || state.isRetrying) return

    setState(prev => ({
      ...prev,
      isRetrying: true
    }))

    try {
      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(2, state.retryCount)
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      await retryFn()
      
      // Success - reset state
      setState({
        error: null,
        isRetrying: false,
        retryCount: 0,
        canRetry: false
      })

      onRetrySuccess?.()
    } catch (error) {
      // Retry failed - increment count and handle error
      setState(prev => {
        const newRetryCount = prev.retryCount + 1
        const canRetry = newRetryCount < maxRetries
        
        return {
          ...prev,
          retryCount: newRetryCount,
          isRetrying: false,
          canRetry
        }
      })

      handleError(error)
    }
  }, [state.canRetry, state.isRetrying, state.retryCount, retryDelay, maxRetries, handleError, onRetrySuccess])

  // Network status monitoring
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Clear network errors when coming back online
      if (state.error?.type === 'network') {
        clearError()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      // Set network error when going offline
      setState(prev => ({
        ...prev,
        error: createFormError.network("You appear to be offline. Please check your connection."),
        canRetry: true
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [state.error?.type, clearError])

  // Wrapper function for async operations with automatic error handling
  const withErrorHandling = useCallback(
    <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          clearError()
          const result = await fn(...args)
          return result
        } catch (error) {
          handleError(error)
          throw error // Re-throw so caller can handle if needed
        }
      }
    },
    [clearError, handleError]
  )

  return {
    ...state,
    isOnline,
    handleError,
    clearError,
    retry,
    withErrorHandling
  }
}