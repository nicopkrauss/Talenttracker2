"use client"

import { useState, useCallback, useRef } from 'react'

interface QueuedRequest {
  id: string
  operation: () => Promise<any>
  type: 'add' | 'remove' | 'update'
  resourceId: string
  timestamp: number
}

interface RequestQueueOptions {
  maxConcurrent?: number
  debounceMs?: number
  retryAttempts?: number
  retryDelayMs?: number
}

export function useRequestQueue(options: RequestQueueOptions = {}) {
  const {
    maxConcurrent = 3,
    debounceMs = 300,
    retryAttempts = 2,
    retryDelayMs = 1000
  } = options

  const [isProcessing, setIsProcessing] = useState(false)
  const [activeRequests, setActiveRequests] = useState<Set<string>>(new Set())
  
  const queueRef = useRef<QueuedRequest[]>([])
  const processingRef = useRef<Set<string>>(new Set())
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const lastOperationRef = useRef<Map<string, number>>(new Map())

  const processQueue = useCallback(async () => {
    if (processingRef.current.size >= maxConcurrent || queueRef.current.length === 0) {
      return
    }

    setIsProcessing(true)
    
    // Get next batch of requests to process
    const toProcess = queueRef.current
      .filter(req => !processingRef.current.has(req.resourceId))
      .slice(0, maxConcurrent - processingRef.current.size)

    if (toProcess.length === 0) {
      setIsProcessing(false)
      return
    }

    // Remove processed requests from queue
    queueRef.current = queueRef.current.filter(req => !toProcess.includes(req))

    // Mark as processing
    toProcess.forEach(req => {
      processingRef.current.add(req.resourceId)
      setActiveRequests(prev => new Set([...prev, req.resourceId]))
    })

    // Process requests in parallel
    const results = await Promise.allSettled(
      toProcess.map(async (req) => {
        let attempts = 0
        let lastError: Error | null = null

        while (attempts <= retryAttempts) {
          try {
            const result = await req.operation()
            return { success: true, result, request: req }
          } catch (error) {
            lastError = error as Error
            attempts++
            
            if (attempts <= retryAttempts) {
              await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempts))
            }
          }
        }
        
        return { success: false, error: lastError, request: req }
      })
    )

    // Clean up processing state
    toProcess.forEach(req => {
      processingRef.current.delete(req.resourceId)
      setActiveRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(req.resourceId)
        return newSet
      })
    })

    // Handle results
    results.forEach((result, index) => {
      const req = toProcess[index]
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
        console.error(`Request failed for ${req.resourceId}:`, 
          result.status === 'rejected' ? result.reason : result.value.error)
      }
    })

    setIsProcessing(false)

    // Continue processing if there are more items in queue
    if (queueRef.current.length > 0) {
      setTimeout(processQueue, 50)
    }
  }, [maxConcurrent, retryAttempts, retryDelayMs])

  const enqueueRequest = useCallback((
    resourceId: string,
    operation: () => Promise<any>,
    type: 'add' | 'remove' | 'update',
    immediate = false
  ) => {
    const now = Date.now()
    const lastOperation = lastOperationRef.current.get(resourceId) || 0
    
    // Clear existing debounce timer for this resource
    const existingTimer = debounceTimersRef.current.get(resourceId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Remove any existing queued requests for the same resource
    queueRef.current = queueRef.current.filter(req => req.resourceId !== resourceId)

    const executeRequest = () => {
      // Check if we should debounce this request
      if (!immediate && now - lastOperation < debounceMs) {
        const timer = setTimeout(() => {
          debounceTimersRef.current.delete(resourceId)
          executeRequest()
        }, debounceMs - (now - lastOperation))
        
        debounceTimersRef.current.set(resourceId, timer)
        return
      }

      lastOperationRef.current.set(resourceId, now)

      const request: QueuedRequest = {
        id: `${resourceId}-${now}`,
        operation,
        type,
        resourceId,
        timestamp: now
      }

      queueRef.current.push(request)
      processQueue()
    }

    executeRequest()
  }, [debounceMs, processQueue])

  const isRequestActive = useCallback((resourceId: string) => {
    return activeRequests.has(resourceId) || 
           processingRef.current.has(resourceId) ||
           queueRef.current.some(req => req.resourceId === resourceId)
  }, [activeRequests])

  const cancelRequest = useCallback((resourceId: string) => {
    // Clear debounce timer
    const timer = debounceTimersRef.current.get(resourceId)
    if (timer) {
      clearTimeout(timer)
      debounceTimersRef.current.delete(resourceId)
    }

    // Remove from queue
    queueRef.current = queueRef.current.filter(req => req.resourceId !== resourceId)
    
    // Note: Cannot cancel already processing requests
  }, [])

  const clearQueue = useCallback(() => {
    queueRef.current = []
    debounceTimersRef.current.forEach(timer => clearTimeout(timer))
    debounceTimersRef.current.clear()
  }, [])

  return {
    enqueueRequest,
    isRequestActive,
    cancelRequest,
    clearQueue,
    isProcessing,
    activeRequests,
    queueLength: queueRef.current.length
  }
}