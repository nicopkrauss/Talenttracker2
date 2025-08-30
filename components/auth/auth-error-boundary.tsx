"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AuthErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error: Error
    resetError: () => void
  }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class AuthErrorBoundary extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary caught an error:', error, errorInfo)
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      // Default error UI
      return <DefaultAuthErrorFallback error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

interface DefaultAuthErrorFallbackProps {
  error: Error
  resetError: () => void
}

function DefaultAuthErrorFallback({ error, resetError }: DefaultAuthErrorFallbackProps) {
  const isNetworkError = error.message.includes('fetch') || 
                        error.message.includes('network') ||
                        error.message.includes('NetworkError')

  const isAuthError = error.message.includes('auth') ||
                     error.message.includes('login') ||
                     error.message.includes('registration')

  const getErrorMessage = () => {
    if (isNetworkError) {
      return "Unable to connect to our servers. Please check your internet connection and try again."
    }
    
    if (isAuthError) {
      return "There was a problem with authentication. Please try again or contact support if the issue persists."
    }

    return "Something went wrong with the authentication system. Please try again."
  }

  const getErrorTitle = () => {
    if (isNetworkError) return "Connection Error"
    if (isAuthError) return "Authentication Error"
    return "Unexpected Error"
  }

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{getErrorTitle()}</AlertTitle>
          <AlertDescription className="mt-2">
            {getErrorMessage()}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Button onClick={resetError} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()} 
            className="w-full"
          >
            Reload Page
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Error Details (Development)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

// Hook version for functional components
export function useAuthErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  // Throw error to trigger error boundary
  if (error) {
    throw error
  }

  return { captureError, resetError }
}