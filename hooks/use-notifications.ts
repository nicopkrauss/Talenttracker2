"use client"

import { useState, useCallback } from "react"
import { notificationService, type NotificationData, type NotificationResult } from "@/lib/notification-service"

export interface UseNotificationsReturn {
  sendApprovalNotification: (userData: NotificationData) => Promise<NotificationResult>
  sendBulkApprovalNotifications: (users: NotificationData[]) => Promise<NotificationResult[]>
  sendWelcomeNotification: (userData: NotificationData) => Promise<NotificationResult>
  sendRejectionNotification: (userData: NotificationData & { reason?: string }) => Promise<NotificationResult>
  loading: boolean
  error: string | null
}

/**
 * Hook for managing notifications throughout the application
 * Provides a clean interface for sending different types of notifications
 */
export function useNotifications(): UseNotificationsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendApprovalNotification = useCallback(async (userData: NotificationData): Promise<NotificationResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await notificationService.sendApprovalNotification(userData)
      
      if (!result.success && result.error) {
        setError(result.error)
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const sendBulkApprovalNotifications = useCallback(async (users: NotificationData[]): Promise<NotificationResult[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const results = await notificationService.sendBulkApprovalNotifications(users)
      
      // Check if any notifications failed
      const failures = results.filter(r => !r.success)
      if (failures.length > 0) {
        const errorMessage = `${failures.length} of ${results.length} notifications failed to send`
        setError(errorMessage)
      }
      
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notifications'
      setError(errorMessage)
      return users.map(() => ({
        success: false,
        error: errorMessage
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  const sendWelcomeNotification = useCallback(async (userData: NotificationData): Promise<NotificationResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await notificationService.sendWelcomeNotification(userData)
      
      if (!result.success && result.error) {
        setError(result.error)
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send welcome notification'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const sendRejectionNotification = useCallback(async (userData: NotificationData & { reason?: string }): Promise<NotificationResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await notificationService.sendRejectionNotification(userData)
      
      if (!result.success && result.error) {
        setError(result.error)
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send rejection notification'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    sendApprovalNotification,
    sendBulkApprovalNotifications,
    sendWelcomeNotification,
    sendRejectionNotification,
    loading,
    error
  }
}

/**
 * Utility function to create notification data from user profile
 */
export function createNotificationData(
  user: { id: string; full_name: string; email: string },
  type: NotificationData['type'] = 'approval'
): NotificationData {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    type
  }
}

/**
 * Utility function to create bulk notification data
 */
export function createBulkNotificationData(
  users: Array<{ id: string; full_name: string; email: string }>,
  type: NotificationData['type'] = 'approval'
): NotificationData[] {
  return users.map(user => createNotificationData(user, type))
}