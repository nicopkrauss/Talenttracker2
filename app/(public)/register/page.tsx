"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { AuthCard, RegistrationForm } from "@/components/auth"
import { AuthErrorBoundary } from "@/components/auth/auth-error-boundary"
import { NetworkStatusIndicator } from "@/components/auth/network-status-indicator"
import { useAuth } from "@/lib/auth"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { useErrorToast, useSuccessToast } from "@/hooks/use-error-toast"
import { type RegistrationInput } from "@/lib/types"

export default function RegisterPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)
  const { showSuccess } = useSuccessToast()
  
  // Enhanced error handling
  const errorHandler = useErrorHandler({
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Registration error:", error)
      // Ensure we always have a meaningful error message
      if (!error.message || error.message.trim() === '' || error.message === '{}') {
        console.error("Empty error message detected, providing fallback")
      }
    },
    onRetrySuccess: () => {
      showSuccess("Account created successfully! Your account is pending approval from an administrator.")
      router.push("/pending")
    }
  })

  // Show error toasts
  useErrorToast(errorHandler.error)

  const handleRegistration = errorHandler.withErrorHandling(async (data: RegistrationInput) => {
    setIsLoading(true)
    errorHandler.clearError()
    
    try {
      await signUp(data)
      
      // Show success message
      showSuccess("Account created successfully! Your account is pending approval from an administrator.")
      
      // Redirect to pending approval page
      router.push("/pending")
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <AuthErrorBoundary>
      <div className="space-y-4">
        <NetworkStatusIndicator />
        <AuthCard>
          <RegistrationForm 
            onSubmit={handleRegistration}
            isLoading={isLoading || errorHandler.isRetrying}
            error={errorHandler.error}
          />
        </AuthCard>
      </div>
    </AuthErrorBoundary>
  )
}