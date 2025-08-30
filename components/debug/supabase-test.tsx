"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>("Testing...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        setConnectionStatus("Connecting...")
        
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        // Test basic connection with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        )
        
        const queryPromise = supabase
          .from('profiles')
          .select('id')
          .limit(1)

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

        if (error) {
          setError(`Database error: ${error.message} (Code: ${error.code})`)
          setConnectionStatus("Failed")
        } else {
          setConnectionStatus("Connected")
          setError(null)
        }
      } catch (err) {
        setError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setConnectionStatus("Failed")
      }
    }

    testConnection()
  }, [])

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div><strong>Status:</strong> {connectionStatus}</div>
        <div><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
        <div><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Present" : "Missing"}</div>
        {error && (
          <div className="text-red-600"><strong>Error:</strong> {error}</div>
        )}
      </CardContent>
    </Card>
  )
}