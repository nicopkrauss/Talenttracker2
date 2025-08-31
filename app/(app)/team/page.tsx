"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Clock, Shield } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { PendingUsersTable } from "@/components/auth/pending-users-table"
import type { UserProfile, PendingUser } from "@/lib/types"

export default function TeamPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const { userProfile, canAccessAdminFeatures, loading: authLoading } = useAuth()
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    // Check access permissions
    if (userProfile && !canAccessAdminFeatures) {
      router.push('/talent')
      return
    }

    // If we have admin access or no user profile yet (middleware handles auth), fetch data
    if (canAccessAdminFeatures || !userProfile) {
      fetchTeamData()
    }
  }, [userProfile, canAccessAdminFeatures, authLoading, router])

  const fetchTeamData = async () => {
    try {
      // Fetch pending users
      const { data: pendingData, error: pendingError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, city, state, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (pendingError) {
        console.error("Error fetching pending users:", pendingError)
        throw new Error(`Failed to fetch pending users: ${pendingError.message}`)
      }

      // Fetch approved users (status should be 'active' not 'approved')
      const { data: approvedData, error: approvedError } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "active")
        .order("full_name")

      if (approvedError) {
        console.error("Error fetching approved users:", approvedError)
        throw new Error(`Failed to fetch approved users: ${approvedError.message}`)
      }

      setPendingUsers(pendingData || [])
      setApprovedUsers(approvedData || [])
    } catch (error) {
      console.error("Error fetching team data:", error)
      // Don't throw here, just log the error and show empty state
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show access denied if user doesn't have proper permissions
  if (userProfile && !canAccessAdminFeatures) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the Team management page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <Users className="w-4 h-4 mr-1" />
            {approvedUsers.length} Active Members
          </Badge>
          {pendingUsers.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {pendingUsers.length} Pending Approval
            </Badge>
          )}
        </div>
      </div>

      {/* Pending Approvals Section */}
      <PendingUsersTable 
        users={pendingUsers}
        onUsersApproved={fetchTeamData}
        loading={loading}
      />

      {/* Active Team Members Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Active Team Members ({approvedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {approvedUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar>
                        <AvatarFallback>
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium">{user.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge 
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.role}
                      </Badge>
                    </div>
                    
                    {user.phone && (
                      <p className="text-sm text-muted-foreground mb-1">
                        <span className="font-medium">Phone:</span> {user.phone}
                      </p>
                    )}
                    
                    {(user.city || user.state) && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">Location:</span> {user.city}{user.city && user.state ? ', ' : ''}{user.state}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active team members found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
