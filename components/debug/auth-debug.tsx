"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthDebug() {
  const { user, userProfile, loading } = useAuth()

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Auth Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        <div><strong>User ID:</strong> {user?.id || 'Not authenticated'}</div>
        <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
        <div><strong>Full Name:</strong> {userProfile?.full_name || 'N/A'}</div>
        <div><strong>Status:</strong> {userProfile?.status || 'N/A'}</div>
        <div><strong>Role:</strong> {userProfile?.role || 'N/A'}</div>
        <div><strong>Phone:</strong> {userProfile?.phone || 'N/A'}</div>
        <div><strong>Location:</strong> {userProfile?.city && userProfile?.state ? `${userProfile.city}, ${userProfile.state}` : 'N/A'}</div>
      </CardContent>
    </Card>
  )
}