"use client"

import * as React from "react"
import { AlertCircle, Wifi, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FormError {
  type: 'validation' | 'network' | 'server' | 'auth' | 'unknown'
  message: string
  field?: string
  retryable?: boolean
}

interface FormErrorDisplayProps {
  error: FormError | null
  onRetry?: () => void
  className?: string
}

export function FormErrorDisplay({ 
  error, 
  onRetry, 
  className 
}: FormErrorDisplayProps) {
  if (!error) return null

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <Wifi className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getErrorVariant = () => {
    switch (error.type) {
      case 'network':
        return 'default'
      case 'validation':
        return 'destructive'
      case 'auth':
        return 'destructive'
      default:
        return 'destructive'
    }
  }

  return (
    <Alert 
      variant={getErrorVariant()} 
      className={cn(
        "border-l-4 shadow-sm transition-all duration-300 ease-in-out",
        "animate-in slide-in-from-top-2 duration-300",
        error.type === 'network' && "border-l-blue-600 dark:border-l-blue-400",
        error.type === 'validation' && "border-l-red-600 dark:border-l-red-400", 
        error.type === 'auth' && "border-l-red-600 dark:border-l-red-400",
        error.type === 'server' && "border-l-amber-600 dark:border-l-amber-400",
        error.type === 'unknown' && "border-l-gray-600 dark:border-l-gray-400",
        className
      )}
    >
      {getErrorIcon()}
      <AlertDescription className="flex items-center justify-between">
        <span className="font-medium">{error.message}</span>
        {error.retryable && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className={cn(
              "ml-2 h-7 transition-all duration-200 ease-in-out",
              "hover:scale-105 active:scale-95"
            )}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

// Error creation utilities
export const createFormError = {
  validation: (message: string, field?: string): FormError => ({
    type: 'validation',
    message,
    field,
    retryable: false
  }),

  network: (message: string = "Connection error. Please check your internet and try again."): FormError => ({
    type: 'network',
    message,
    retryable: true
  }),

  server: (message: string = "Something went wrong on our end. Please try again later."): FormError => ({
    type: 'server', 
    message,
    retryable: true
  }),

  auth: (message: string): FormError => ({
    type: 'auth',
    message,
    retryable: false
  }),

  unknown: (message: string = "An unexpected error occurred. Please try again."): FormError => ({
    type: 'unknown',
    message,
    retryable: true
  })
}

// Error parsing utility for common error scenarios
export function parseAuthError(error: any): FormError {
  // Handle network errors
  if (!navigator.onLine) {
    return createFormError.network("You appear to be offline. Please check your connection.")
  }

  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
    return createFormError.network()
  }

  // Handle Supabase auth errors
  if (error?.message) {
    const message = error.message.toLowerCase()
    
    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return createFormError.auth("Invalid email or password. Please try again.")
    }
    
    if (message.includes('email already registered') || message.includes('user already registered')) {
      return createFormError.auth("An account with this email already exists. Please sign in instead.")
    }
    
    if (message.includes('email not confirmed')) {
      return createFormError.auth("Please check your email and click the confirmation link.")
    }
    
    if (message.includes('signup disabled')) {
      return createFormError.auth("Account registration is currently disabled. Please contact support.")
    }
    
    if (message.includes('rate limit')) {
      return createFormError.auth("Too many attempts. Please wait a moment before trying again.")
    }
    
    if (message.includes('weak password')) {
      return createFormError.validation("Password is too weak. Please choose a stronger password.")
    }
  }

  // Handle HTTP status codes
  if (error?.status) {
    switch (error.status) {
      case 400:
        return createFormError.validation("Invalid request. Please check your information.")
      case 401:
        return createFormError.auth("Authentication failed. Please try again.")
      case 403:
        return createFormError.auth("Access denied. You don't have permission to perform this action.")
      case 404:
        return createFormError.server("Service not found. Please try again later.")
      case 429:
        return createFormError.auth("Too many requests. Please wait before trying again.")
      case 500:
      case 502:
      case 503:
      case 504:
        return createFormError.server()
      default:
        return createFormError.unknown()
    }
  }

  // Fallback for unknown errors
  return createFormError.unknown(error?.message || "An unexpected error occurred.")
}