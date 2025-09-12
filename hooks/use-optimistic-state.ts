"use client"

import { useState, useCallback, useRef, useEffect } from 'react'

interface OptimisticOperation<T> {
  id: string
  type: 'add' | 'remove' | 'update'
  optimisticUpdate: (current: T[]) => T[]
  revertUpdate: (current: T[]) => T[]
  timestamp: number
}

interface OptimisticStateOptions {
  syncDelayMs?: number
  maxPendingOperations?: number
}

export function useOptimisticState<T extends { id: string }>(
  initialData: T[],
  options: OptimisticStateOptions = {}
) {
  const {
    syncDelayMs = 1000,
    maxPendingOperations = 10
  } = options

  const [optimisticData, setOptimisticData] = useState<T[]>(() => initialData)
  const [pendingOperations, setPendingOperations] = useState<Map<string, OptimisticOperation<T>>>(new Map())
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const allowSyncRef = useRef(true)
  const lastSyncRef = useRef<number>(0)

  // Sync optimistic state with server data when allowed
  useEffect(() => {
    const now = Date.now()
    const timeSinceLastSync = now - lastSyncRef.current
    const shouldSync = allowSyncRef.current && timeSinceLastSync > syncDelayMs
    const isInitialLoad = lastSyncRef.current === 0
    
    // Don't sync empty data on initial load - wait for real data
    const hasData = initialData.length > 0
    const shouldSyncNow = (isInitialLoad && hasData) || (!isInitialLoad && shouldSync)
    
    if (shouldSyncNow) {
      setOptimisticData(initialData)
      lastSyncRef.current = now
    }
  }, [initialData, syncDelayMs])

  const applyOptimisticUpdate = useCallback(<TResult>(
    operationId: string,
    type: 'add' | 'remove' | 'update',
    optimisticUpdate: (current: T[]) => T[],
    revertUpdate: (current: T[]) => T[],
    serverOperation: () => Promise<TResult>
  ): Promise<TResult> => {
    // Prevent sync during optimistic operations
    allowSyncRef.current = false
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Apply optimistic update immediately
    setOptimisticData(current => {
      const updated = optimisticUpdate(current)
      return updated
    })

    // Track the operation
    const operation: OptimisticOperation<T> = {
      id: operationId,
      type,
      optimisticUpdate,
      revertUpdate,
      timestamp: Date.now()
    }

    setPendingOperations(prev => {
      const newMap = new Map(prev)
      newMap.set(operationId, operation)
      
      // Limit pending operations
      if (newMap.size > maxPendingOperations) {
        const oldestKey = Array.from(newMap.keys())[0]
        newMap.delete(oldestKey)
      }
      
      return newMap
    })

    // Execute server operation
    return serverOperation()
      .then((result) => {
        // Success - remove from pending operations
        setPendingOperations(prev => {
          const newMap = new Map(prev)
          newMap.delete(operationId)
          return newMap
        })

        // Allow sync after successful operation
        syncTimeoutRef.current = setTimeout(() => {
          allowSyncRef.current = true
          lastSyncRef.current = Date.now()
        }, syncDelayMs)

        return result
      })
      .catch((error) => {
        // Error - revert optimistic update
        setOptimisticData(current => {
          const operation = pendingOperations.get(operationId)
          if (operation) {
            return operation.revertUpdate(current)
          }
          return current
        })

        // Remove from pending operations
        setPendingOperations(prev => {
          const newMap = new Map(prev)
          newMap.delete(operationId)
          return newMap
        })

        // Allow sync immediately on error
        allowSyncRef.current = true
        lastSyncRef.current = Date.now()

        throw error
      })
  }, [syncDelayMs, maxPendingOperations, pendingOperations])

  const forceSync = useCallback(() => {
    allowSyncRef.current = true
    setOptimisticData(initialData)
    setPendingOperations(new Map())
    lastSyncRef.current = Date.now()
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
  }, [initialData])

  const hasPendingOperations = pendingOperations.size > 0

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  return {
    data: optimisticData,
    applyOptimisticUpdate,
    forceSync,
    hasPendingOperations,
    pendingOperationsCount: pendingOperations.size
  }
}