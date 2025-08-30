"use client"

import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthDebug() {
  const { 
    user, 
    userProfile, 
    loading, 
    isAuthenticated, 
    isApproved, 
    isPending, 
    isRejected,
    systemRole,
    canAccessAdminFeatures 
  } = useAuth()

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Auth Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div><strong>Loading:</strong> {loading ? "true" : "false"}</div>
        <div><strong>User:</strong> {user ? user.email : "null"}</div>
        <div><strong>User Profile:</strong> {userProfile ? userProfile.full_name : "null"}</div>
        <div><strong>Is Authenticated:</strong> {isAuthenticated ? "true" : "false"}</div>
        <div><strong>Is Approved:</strong> {isApproved ? "true" : "false"}</div>
        <div><strong>Is Pending:</strong> {isPending ? "true" : "false"}</div>
        <div><strong>Is Rejected:</strong> {isRejected ? "true" : "false"}</div>
        <div><strong>System Role:</strong> {systemRole || "null"}</div>
        <div><strong>Can Access Admin:</strong> {canAccessAdminFeatures ? "true" : "false"}</div>
        <div><strong>Status:</strong> {userProfile?.status || "null"}</div>
      </CardContent>
    </Card>
  )
}