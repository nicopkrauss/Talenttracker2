"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { AuthCard, LoginForm } from "@/components/auth"
import { AuthErrorBoundary } from "@/components/auth/auth-error-boundary"
import { NetworkStatusIndicator } from "@/components/auth/network-status-indicator"
import { useAuth } from "@/lib/auth"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { useErrorToast } from "@/hooks/use-error-toast"
import { type LoginInput } from "@/lib/types"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, user, userProfile } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)
  
  // Enhanced error handling
  const errorHandler = useErrorHandler({
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Login error:", error)
    },
    onRetrySuccess: () => {
      toast.success("Login successful!")
    }
  })

  // Show error toasts
  useErrorToast(errorHandler.error)

  // Show messages based on URL parameters
  React.useEffect(() => {
    const message = searchParams.get("message")
    const errorParam = searchParams.get("error")
    
    if (message === "registration-success") {
      toast.success("Account created successfully! Your account is pending approval from an administrator.")
    } else if (errorParam === "account-rejected") {
      toast.error("Your account has been rejected. Please contact an administrator for more information.")
    } else if (errorParam === "no-profile") {
      toast.error("Account error. Please try registering again or contact support.")
    }
  }, [searchParams])

  // Let the middleware handle redirects after successful login
  React.useEffect(() => {
    if (user && userProfile) {
      console.log("User logged in, middleware will handle redirect")
      // The middleware will automatically redirect based on user status
      // We don't need to do anything here
    }
  }, [user, userProfile])

  const handleLogin = errorHandler.withErrorHandling(async (data: LoginInput) => {
    setIsLoading(true)
    errorHandler.clearError()
    
    try {
      await signIn(data)
      console.log("Login successful, waiting for auth state update...")
      // Success handling will be done by the useEffect above
      // which will redirect based on user status
    } finally {
      setIsLoading(false)
    }
  })

  const handleRetry = React.useCallback(() => {
    // Retry logic will be handled by the error handler
    // This is just a placeholder for the retry button
  }, [])

  return (
    <AuthErrorBoundary>
      <div className="space-y-4">
        <NetworkStatusIndicator />
        <AuthCard>
          <LoginForm 
            onSubmit={handleLogin}
            isLoading={isLoading || errorHandler.isRetrying}
            error={errorHandler.error}
          />
        </AuthCard>
      </div>
    </AuthErrorBoundary>
  )
}