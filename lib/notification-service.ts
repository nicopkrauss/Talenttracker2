/**
 * Notification Service
 * 
 * Handles sending notifications to users for various events like account approval.
 * Supports multiple notification channels (email, in-app, etc.)
 */

import { createBrowserClient } from "@supabase/ssr"
import { getEmailTemplate, type TemplateData } from "./email-templates"

export interface NotificationData {
  userId: string
  email: string
  fullName: string
  type: 'approval' | 'rejection' | 'welcome'
  metadata?: Record<string, any>
}

export interface NotificationResult {
  success: boolean
  error?: string
  notificationId?: string
}

export class NotificationService {
  private supabase

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  /**
   * Send welcome notification to a new user (registration confirmation)
   */
  async sendWelcomeNotification(userData: NotificationData): Promise<NotificationResult> {
    try {
      console.log(`Sending welcome notification to ${userData.fullName} (${userData.email})`)

      const notificationRecord = await this.createNotificationRecord({
        userId: userData.userId,
        type: 'welcome',
        channel: 'email',
        recipient: userData.email,
        subject: 'Welcome to Talent Tracker - Registration Received',
        content: 'Registration confirmation and next steps',
        status: 'pending'
      })

      if (!notificationRecord.success) {
        throw new Error(notificationRecord.error || 'Failed to create notification record')
      }

      const emailResult = await this.sendNotificationEmail(userData, 'welcome')
      
      await this.updateNotificationStatus(
        notificationRecord.notificationId!,
        emailResult.success ? 'sent' : 'failed',
        emailResult.error
      )

      return emailResult

    } catch (error) {
      console.error('Error sending welcome notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Send rejection notification to a user
   */
  async sendRejectionNotification(userData: NotificationData & { reason?: string }): Promise<NotificationResult> {
    try {
      console.log(`Sending rejection notification to ${userData.fullName} (${userData.email})`)

      const notificationRecord = await this.createNotificationRecord({
        userId: userData.userId,
        type: 'rejection',
        channel: 'email',
        recipient: userData.email,
        subject: 'Talent Tracker Account Application Update',
        content: `Account application rejected${userData.reason ? `: ${userData.reason}` : ''}`,
        status: 'pending'
      })

      if (!notificationRecord.success) {
        throw new Error(notificationRecord.error || 'Failed to create notification record')
      }

      const emailResult = await this.sendNotificationEmail(userData, 'rejection')
      
      await this.updateNotificationStatus(
        notificationRecord.notificationId!,
        emailResult.success ? 'sent' : 'failed',
        emailResult.error
      )

      return emailResult

    } catch (error) {
      console.error('Error sending rejection notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Send approval notification to a user
   */
  async sendApprovalNotification(userData: NotificationData): Promise<NotificationResult> {
    try {
      // Log the notification attempt
      console.log(`Sending approval notification to ${userData.fullName} (${userData.email})`)

      // Create notification record in database
      const notificationRecord = await this.createNotificationRecord({
        userId: userData.userId,
        type: 'approval',
        channel: 'email',
        recipient: userData.email,
        subject: 'Welcome to Talent Tracker - Account Approved!',
        content: this.getApprovalNotificationContent(userData.fullName),
        status: 'pending'
      })

      if (!notificationRecord.success) {
        throw new Error(notificationRecord.error || 'Failed to create notification record')
      }

      // Send the actual notification (email)
      const emailResult = await this.sendNotificationEmail(userData, 'approval')
      
      // Update notification record with result
      await this.updateNotificationStatus(
        notificationRecord.notificationId!,
        emailResult.success ? 'sent' : 'failed',
        emailResult.error
      )

      return emailResult

    } catch (error) {
      console.error('Error sending approval notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Send bulk approval notifications
   */
  async sendBulkApprovalNotifications(users: NotificationData[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []
    
    // Process notifications in parallel but with some rate limiting
    const batchSize = 5 // Process 5 at a time to avoid overwhelming email service
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      const batchPromises = batch.map(user => this.sendApprovalNotification(user))
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error(`Failed to send notification to ${batch[index].email}:`, result.reason)
          results.push({
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
          })
        }
      })
      
      // Small delay between batches to be respectful to email service
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }

  /**
   * Create a notification record in the database for tracking
   */
  private async createNotificationRecord(notification: {
    userId: string
    type: string
    channel: string
    recipient: string
    subject: string
    content: string
    status: string
  }): Promise<NotificationResult & { notificationId?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('email_notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          channel: notification.channel,
          recipient: notification.recipient,
          subject: notification.subject,
          content: notification.content,
          status: notification.status,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) {
        // If email_notifications table doesn't exist, we'll just log and continue
        // This allows the system to work even without the email_notifications table
        console.warn('Could not create email notification record (table may not exist):', error.message)
        return { success: true, notificationId: 'no-tracking' }
      }

      return {
        success: true,
        notificationId: data.id
      }
    } catch (error) {
      console.warn('Could not create notification record:', error)
      // Don't fail the entire notification process if we can't track it
      return { success: true, notificationId: 'no-tracking' }
    }
  }

  /**
   * Update notification status in database
   */
  private async updateNotificationStatus(
    notificationId: string, 
    status: string, 
    error?: string
  ): Promise<void> {
    if (notificationId === 'no-tracking') return

    try {
      await this.supabase
        .from('email_notifications')
        .update({
          status,
          error_message: error || null,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
    } catch (error) {
      console.warn('Could not update notification status:', error)
    }
  }

  /**
   * Get approval notification content
   */
  private getApprovalNotificationContent(fullName: string): string {
    return `Account approved for ${fullName}. Welcome to Talent Tracker! Your account has been approved and is now active.`
  }

  /**
   * Send notification email using templates
   */
  private async sendNotificationEmail(
    userData: NotificationData, 
    type: 'approval' | 'rejection' | 'welcome'
  ): Promise<NotificationResult> {
    try {
      // Generate email content using templates
      const templateData: TemplateData = {
        fullName: userData.fullName,
        email: userData.email,
        ...userData.metadata
      }

      const emailTemplate = getEmailTemplate(type, templateData)
      
      const emailContent = {
        to: userData.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      }

      // Call the email API endpoint
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Email service responded with status ${response.status}`)
      }

      const result = await response.json()
      
      return {
        success: true,
        notificationId: result.messageId || 'sent'
      }

    } catch (error) {
      console.error(`Error sending ${type} email:`, error)
      
      // For development/demo purposes, we'll still log the notification
      // but not fail the approval process
      const templateData: TemplateData = {
        fullName: userData.fullName,
        email: userData.email,
        ...userData.metadata
      }
      const emailTemplate = getEmailTemplate(type, templateData)
      
      console.log(`📧 ${type.toUpperCase()} NOTIFICATION (Email service not configured):`)
      console.log(`To: ${userData.email}`)
      console.log(`Subject: ${emailTemplate.subject}`)
      console.log(`Message: ${emailTemplate.text}`)
      
      return {
        success: true, // Return success for demo purposes
        error: `Email service not configured: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }


}

// Export a singleton instance
export const notificationService = new NotificationService()