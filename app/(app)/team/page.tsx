"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Clock, Shield } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { PendingUsersTable } from "@/components/auth/pending-users-table"
import { AuthDebug } from "@/components/debug/auth-debug"
import { SupabaseTest } from "@/components/debug/supabase-test"
import type { UserProfile, PendingUser } from "@/lib/types"

export default function TeamPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [authTimeout, setAuthTimeout] = useState(false)
  const { userProfile, canAccessAdminFeatures, loading: authLoading } = useAuth()
  const router = useRouter()

  // Add timeout for auth loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.warn("Auth loading timeout, proceeding anyway")
        setAuthTimeout(true)
      }
    }, 3000)

    return () => clearTimeout(timeout)
  }, [authLoading])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    // The middleware should handle access control, but add a client-side check as backup
    if (userProfile && !canAccessAdminFeatures) {
      router.push('/talent')
      return
    }

    // If we have a user profile and they can access admin features, fetch data
    if (canAccessAdminFeatures) {
      fetchTeamData()
    } else if (userProfile) {
      // If we have a profile but no admin access, redirect
      router.push('/talent')
    } else if (authTimeout) {
      // If auth timed out, try to fetch data anyway (middleware should have handled auth)
      console.log("Auth timeout, attempting to fetch data anyway")
      fetchTeamData()
    }
    // If no userProfile yet, wait for auth to load
  }, [userProfile, canAccessAdminFeatures, router, authTimeout])

  const fetchTeamData = async () => {
    try {
      // Fetch pending users
      const { data: pendingData, error: pendingError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, city, state, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (pendingError) throw pendingError

      // Fetch approved users
      const { data: approvedData, error: approvedError } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "approved")
        .order("full_name")

      if (approvedError) throw approvedError

      setPendingUsers(pendingData || [])
      setApprovedUsers(approvedData || [])
    } catch (error) {
      console.error("Error fetching team data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state (but not if auth has timed out)
  if (loading && !authTimeout) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show access denied if user doesn't have proper permissions (but not during auth timeout)
  if (!canAccessAdminFeatures && !authTimeout && userProfile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access the Team management page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <AuthDebug />
      <SupabaseTest />
      
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
                <Card key={user.id} className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar>
                        <AvatarFallback>
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium">{user.full_name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <Badge 
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.role}
                      </Badge>
                    </div>
                    
                    {user.phone && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Phone:</span> {user.phone}
                      </p>
                    )}
                    
                    {(user.city || user.state) && (
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">Location:</span> {user.city}{user.city && user.state ? ', ' : ''}{user.state}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No active team members found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
