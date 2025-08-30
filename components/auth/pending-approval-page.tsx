"use client"

import * as React from "react"
import { Clock, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"

export function PendingApprovalPage() {
  const { signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      // The auth context will handle the redirect to login
    } catch (error) {
      console.error("Sign out error:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <Card className="w-full shadow-lg border-0 bg-card transition-all duration-200 ease-in-out hover:shadow-xl">
      <CardContent className="pt-8 pb-6 px-8 sm:px-10 sm:pt-10 sm:pb-8">
        <div className="space-y-8 text-center">
          {/* Enhanced Icon */}
          <div className="flex justify-center animate-in zoom-in-50 duration-500">
            <div className="rounded-full bg-gradient-to-br from-orange-100 to-orange-200 p-4 shadow-lg dark:from-orange-900/30 dark:to-orange-800/20 transition-all duration-300 ease-in-out">
              <Clock className="h-10 w-10 text-orange-600 dark:text-orange-400 animate-pulse" />
            </div>
          </div>

          {/* Enhanced Title */}
          <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-700 delay-200">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl transition-all duration-200 ease-in-out">
              Account Pending
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Your account has been created and is awaiting approval from an administrator. 
              You will be notified when your account is active.
            </p>
          </div>

          {/* Enhanced Sign Out Button */}
          <div className="animate-in slide-in-from-bottom-4 duration-700 delay-400">
            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="outline"
              className="w-full h-12 sm:h-11 font-semibold transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSigningOut ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}