"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { SchedulingError, SchedulingErrorHandler, SchedulingErrorCode } from '@/lib/error-handling/scheduling-errors'

interface OptimisticUpdate<T> {
  id: string
  timestamp: Date
  originalData: T
  optimisticData: T
  operation: string
  rollbackFn: () => void
}

interface OptimisticUpdateOptions {
  maxRetries?: number
  retryDelay?: number
  fallbackToRefresh?: boolean
  onError?: (error: SchedulingError, update: OptimisticUpdate<any>) => void
  onSuccess?: (update: OptimisticUpdate<any>) => void
  onRollback?: (update: OptimisticUpdate<any>) => void
}

export function useOptimisticUpdates<T>(
  initialData: T,
  options: OptimisticUpdateOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    fallbackToRefresh = true,
    onError,
    onSuccess,
    onRollback
  } = options

  const [data, setData] = useState<T>(initialData)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map())
  const [failedUpdates, setFailedUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map())
  
  const updateIdCounter = useRef(0)
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Generate unique update ID
  const generateUpdateId = useCallback(() => {
    return `update_${Date.now()}_${++updateIdCounter.current}`
  }, [])

  // Apply optimistic update immediately
  const applyOptimisticUpdate = useCallback((
    updateId: string,
    optimisticData: T,
    operation: string
  ) => {
    const originalData = data
    const rollbackFn = () => setData(originalData)
    
    const update: OptimisticUpdate<T> = {
      id: updateId,
      timestamp: new Date(),
      originalData,
      optimisticData,
      operation,
      rollbackFn
    }

    // Apply optimistic update
    setData(optimisticData)
    
    // Track pending update
    setPendingUpdates(prev => new Map(prev).set(updateId, update))
    
    return update
  }, [data])

  // Rollback optimistic update
  const rollbackUpdate = useCallback((updateId: string) => {
    const update = pendingUpdates.get(updateId) || failedUpdates.get(updateId)
    if (!update) return

    // Apply rollback
    update.rollbackFn()
    
    // Remove from tracking
    setPendingUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })
    
    setFailedUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })

    onRollback?.(update)
  }, [pendingUpdates, failedUpdates, onRollback])

  // Confirm successful update
  const confirmUpdate = useCallback((updateId: string, finalData?: T) => {
    const update = pendingUpdates.get(updateId)
    if (!update) return

    // Update with final data if provided
    if (finalData) {
      setData(finalData)
    }

    // Remove from pending
    setPendingUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })

    onSuccess?.(update)
  }, [pendingUpdates, onSuccess])

  // Handle update failure
  const handleUpdateFailure = useCallback((
    updateId: string,
    error: SchedulingError,
    retryCount = 0
  ) => {
    const update = pendingUpdates.get(updateId)
    if (!update) return

    // Move to failed updates
    setFailedUpdates(prev => new Map(prev).set(updateId, update))
    setPendingUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })

    // Determine if we should retry
    const shouldRetry = SchedulingErrorHandler.shouldRetry(error) && retryCount < maxRetries

    if (shouldRetry) {
      const delay = SchedulingErrorHandler.getRetryDelay(error, retryCount + 1)
      const timeout = setTimeout(() => {
        retryTimeouts.current.delete(updateId)
        // Retry logic would be handled by the calling component
        onError?.(error, update)
      }, delay)
      
      retryTimeouts.current.set(updateId, timeout)
    } else {
      // No more retries - decide whether to rollback or keep optimistic state
      if (fallbackToRefresh) {
        // Keep optimistic state but mark as potentially stale
        onError?.(error, update)
      } else {
        // Rollback to original state
        rollbackUpdate(updateId)
        onError?.(error, update)
      }
    }
  }, [pendingUpdates, maxRetries, fallbackToRefresh, rollbackUpdate, onError])

  // Execute optimistic update with API call
  const executeOptimisticUpdate = useCallback(async <R>(
    optimisticData: T,
    apiCall: () => Promise<R>,
    operation: string,
    options?: {
      onSuccess?: (result: R, updateId: string) => T | void
      onError?: (error: SchedulingError, updateId: string) => void
    }
  ): Promise<R> => {
    const updateId = generateUpdateId()
    setIsUpdating(true)

    try {
      // Apply optimistic update immediately
      const update = applyOptimisticUpdate(updateId, optimisticData, operation)

      // Execute API call
      const result = await apiCall()

      // Handle success
      const finalData = options?.onSuccess?.(result, updateId)
      confirmUpdate(updateId, finalData || optimisticData)

      return result

    } catch (error: any) {
      // Convert to SchedulingError if needed
      const schedulingError = error.code 
        ? error as SchedulingError
        : SchedulingErrorHandler.createError(
            SchedulingErrorCode.INTERNAL_ERROR,
            error.message || 'Update failed'
          )

      // Handle failure
      handleUpdateFailure(updateId, schedulingError)
      options?.onError?.(schedulingError, updateId)

      throw schedulingError

    } finally {
      setIsUpdating(false)
    }
  }, [
    generateUpdateId,
    applyOptimisticUpdate,
    confirmUpdate,
    handleUpdateFailure
  ])

  // Batch optimistic updates
  const executeBatchOptimisticUpdates = useCallback(async <R>(
    updates: Array<{
      optimisticData: T
      apiCall: () => Promise<R>
      operation: string
    }>,
    options?: {
      onSuccess?: (results: R[], updateIds: string[]) => T | void
      onError?: (error: SchedulingError, failedIndex: number) => void
      rollbackOnAnyFailure?: boolean
    }
  ): Promise<R[]> => {
    const updateIds: string[] = []
    const results: R[] = []
    setIsUpdating(true)

    try {
      // Apply all optimistic updates first
      for (const update of updates) {
        const updateId = generateUpdateId()
        updateIds.push(updateId)
        applyOptimisticUpdate(updateId, update.optimisticData, update.operation)
      }

      // Execute API calls
      for (let i = 0; i < updates.length; i++) {
        try {
          const result = await updates[i].apiCall()
          results.push(result)
          confirmUpdate(updateIds[i])
        } catch (error: any) {
          const schedulingError = error.code 
            ? error as SchedulingError
            : SchedulingErrorHandler.createError(
                SchedulingErrorCode.INTERNAL_ERROR,
                error.message || 'Batch update failed'
              )

          if (options?.rollbackOnAnyFailure) {
            // Rollback all updates
            updateIds.forEach(id => rollbackUpdate(id))
            throw schedulingError
          } else {
            // Handle individual failure
            handleUpdateFailure(updateIds[i], schedulingError)
            options?.onError?.(schedulingError, i)
          }
        }
      }

      // Handle batch success
      const finalData = options?.onSuccess?.(results, updateIds)
      if (finalData) {
        setData(finalData)
      }

      return results

    } finally {
      setIsUpdating(false)
    }
  }, [
    generateUpdateId,
    applyOptimisticUpdate,
    confirmUpdate,
    handleUpdateFailure,
    rollbackUpdate
  ])

  // Rollback all pending updates
  const rollbackAllUpdates = useCallback(() => {
    const allUpdateIds = [
      ...Array.from(pendingUpdates.keys()),
      ...Array.from(failedUpdates.keys())
    ]
    
    allUpdateIds.forEach(id => rollbackUpdate(id))
  }, [pendingUpdates, failedUpdates, rollbackUpdate])

  // Refresh data (fallback for failed updates)
  const refreshData = useCallback((newData: T) => {
    // Clear all pending and failed updates
    setPendingUpdates(new Map())
    setFailedUpdates(new Map())
    
    // Clear retry timeouts
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout))
    retryTimeouts.current.clear()
    
    // Update data
    setData(newData)
  }, [])

  return {
    data,
    isUpdating,
    hasPendingUpdates: pendingUpdates.size > 0,
    hasFailedUpdates: failedUpdates.size > 0,
    pendingUpdateCount: pendingUpdates.size,
    failedUpdateCount: failedUpdates.size,
    
    // Update functions
    executeOptimisticUpdate,
    executeBatchOptimisticUpdates,
    rollbackUpdate,
    rollbackAllUpdates,
    refreshData,
    
    // State inspection
    getPendingUpdates: () => Array.from(pendingUpdates.values()),
    getFailedUpdates: () => Array.from(failedUpdates.values())
  }
}