"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useNotifications, createNotificationData } from "@/hooks/use-notifications"
import { Mail, Send, CheckCircle, XCircle } from "lucide-react"

/**
 * Test component for the notification system
 * This can be used during development to test email notifications
 * Remove this component in production
 */
export function NotificationTest() {
  const [testEmail, setTestEmail] = useState("")
  const [testName, setTestName] = useState("")
  const { sendApprovalNotification, loading, error } = useNotifications()

  const handleTestNotification = async () => {
    if (!testEmail || !testName) {
      toast.error("Please enter both email and name")
      return
    }

    try {
      const notificationData = createNotificationData({
        id: "test-user-id",
        full_name: testName,
        email: testEmail
      })

      const result = await sendApprovalNotification(notificationData)

      if (result.success) {
        toast.success("Test notification sent successfully!")
      } else {
        toast.error(`Failed to send notification: ${result.error}`)
      }
    } catch (err) {
      toast.error("Error sending test notification")
      console.error(err)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Test Notification System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-name">Test Name</Label>
          <Input
            id="test-name"
            type="text"
            placeholder="John Doe"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
        </div>

        <Button 
          onClick={handleTestNotification}
          disabled={loading || !testEmail || !testName}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {loading ? "Sending..." : "Send Test Notification"}
        </Button>

        {error && (
          <div className="flex items-center text-red-600 text-sm">
            <XCircle className="w-4 h-4 mr-1" />
            {error}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• This will test the approval notification system</p>
          <p>• Check the console for email content (development mode)</p>
          <p>• In production, configure a real email service</p>
        </div>
      </CardContent>
    </Card>
  )
}