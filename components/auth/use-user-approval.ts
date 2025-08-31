"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import { notificationService, type NotificationData } from "@/lib/notification-service"

export function useUserApproval() {
  const [loading, setLoading] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const approveUsers = async (userIds: string[]): Promise<void> => {
    if (userIds.length === 0) {
      throw new Error("No users selected for approval")
    }

    setLoading(true)
    
    try {
      // Update user statuses to active
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          status: "active",
          updated_at: new Date().toISOString()
        })
        .in("id", userIds)

      if (updateError) {
        throw new Error(`Failed to approve users: ${updateError.message}`)
      }

      // Get user details for notifications
      const { data: users, error: fetchError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)

      if (fetchError) {
        console.error("Error fetching user details for notifications:", fetchError)
        // Don't throw here as the approval was successful
      }

      // Send approval notifications
      if (users) {
        await sendApprovalNotifications(users)
      }

      // Show success message
      const message = userIds.length === 1 
        ? "User approved successfully!" 
        : `${userIds.length} users approved successfully!`
      
      toast.success(message)

    } catch (error) {
      console.error("Error approving users:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to approve users"
      toast.error(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const sendApprovalNotifications = async (users: Array<{ id: string; full_name: string; email: string }>) => {
    try {
      // Convert users to notification data format
      const notificationData: NotificationData[] = users.map(user => ({
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        type: 'approval' as const
      }))

      // Send notifications using the notification service
      const results = await notificationService.sendBulkApprovalNotifications(notificationData)
      
      // Log results for debugging
      const successCount = results.filter(r => r.success).length
      const failureCount = results.length - successCount
      
      console.log(`Notification results: ${successCount} sent, ${failureCount} failed`)
      
      if (failureCount > 0) {
        console.warn('Some notifications failed to send:', results.filter(r => !r.success))
      }
      
      // Don't throw errors for notification failures - approval should still succeed
      // Just log them for monitoring
      
    } catch (error) {
      console.error('Error sending approval notifications:', error)
      // Don't throw - we don't want notification failures to block user approval
    }
  }

  return {
    approveUsers,
    loading
  }
}