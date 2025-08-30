"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SessionDebug() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        // Check session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        setSessionInfo({
          hasSession: !!sessionData.session,
          user: sessionData.session?.user ? {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
            created_at: sessionData.session.user.created_at
          } : null,
          error: sessionError?.message
        })

        // Check user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        setUserInfo({
          hasUser: !!userData.user,
          user: userData.user ? {
            id: userData.user.id,
            email: userData.user.email,
            created_at: userData.user.created_at
          } : null,
          error: userError?.message
        })

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    checkSession()
  }, [])

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Session Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div><strong>Session Check:</strong></div>
        <div className="ml-4">
          <div>Has Session: {sessionInfo?.hasSession ? "true" : "false"}</div>
          <div>Session User: {sessionInfo?.user?.email || "null"}</div>
          <div>Session Error: {sessionInfo?.error || "none"}</div>
        </div>
        
        <div><strong>User Check:</strong></div>
        <div className="ml-4">
          <div>Has User: {userInfo?.hasUser ? "true" : "false"}</div>
          <div>User Email: {userInfo?.user?.email || "null"}</div>
          <div>User Error: {userInfo?.error || "none"}</div>
        </div>
        
        {error && (
          <div className="text-red-600"><strong>Error:</strong> {error}</div>
        )}
      </CardContent>
    </Card>
  )
}