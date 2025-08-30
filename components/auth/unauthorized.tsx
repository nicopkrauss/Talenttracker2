"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface UnauthorizedProps {
  message?: string
  showBackButton?: boolean
}

export function Unauthorized({ 
  message = "You don't have permission to access this page.", 
  showBackButton = true 
}: UnauthorizedProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showBackButton && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button 
                onClick={() => router.push("/")}
                className="flex-1"
              >
                Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}