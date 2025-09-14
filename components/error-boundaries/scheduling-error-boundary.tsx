"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw, Bug, Wifi, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SchedulingError, SchedulingErrorHandler, SchedulingErrorCode } from "@/lib/error-handling/scheduling-errors"

interface SchedulingErrorBoundaryState {
  hasError: boolean
  error: Error | SchedulingError | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

interface SchedulingErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error: Error | SchedulingError
    resetError: () => void
    retryCount: number
  }>
  onError?: (error: Error | SchedulingError, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
}

export class SchedulingErrorBoundary extends React.Component<
  SchedulingErrorBoundaryProps,
  SchedulingErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null

  constructor(props: SchedulingErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error | SchedulingError): Partial<SchedulingErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error | SchedulingError, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Convert regular Error to SchedulingError if needed
    const schedulingError = 'code' in error 
      ? error as SchedulingError
      : SchedulingErrorHandler.createError(
          SchedulingErrorCode.INTERNAL_ERROR,
          error.message || 'An unexpected error occurred'
        )

    // Log error
    SchedulingErrorHandler.logError(schedulingError, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'SchedulingErrorBoundary'
    })

    // Call optional error handler
    this.props.onError?.(schedulingError, errorInfo)
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  resetError = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent 
            error={this.state.error} 
            resetError={this.resetError}
            retryCount={this.state.retryCount}
          />
        )
      }

      // Default error UI
      return (
        <DefaultSchedulingErrorFallback 
          error={this.state.error} 
          resetError={this.resetError}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries}
        />
      )
    }

    return this.props.children
  }
}

interface DefaultSchedulingErrorFallbackProps {
  error: Error | SchedulingError
  resetError: () => void
  retryCount: number
  maxRetries?: number
}

function DefaultSchedulingErrorFallback({ 
  error, 
  resetError, 
  retryCount,
  maxRetries = 3
}: DefaultSchedulingErrorFallbackProps) {
  const schedulingError = 'code' in error 
    ? error as SchedulingError
    : SchedulingErrorHandler.createError(
        SchedulingErrorCode.INTERNAL_ERROR,
        error.message || 'An unexpected error occurred'
      )

  const severity = SchedulingErrorHandler.getErrorSeverity(schedulingError)
  const canRetry = SchedulingErrorHandler.shouldRetry(schedulingError) && retryCount < maxRetries
  const userMessage = SchedulingErrorHandler.getUserFriendlyMessage(schedulingError)

  const getErrorIcon = () => {
    switch (schedulingError.code) {
      case SchedulingErrorCode.NETWORK_ERROR:
        return <Wifi className="h-5 w-5" />
      case SchedulingErrorCode.DATABASE_ERROR:
        return <Database className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getErrorTitle = () => {
    switch (schedulingError.code) {
      case SchedulingErrorCode.NETWORK_ERROR:
        return "Connection Problem"
      case SchedulingErrorCode.DATABASE_ERROR:
        return "Data Save Error"
      case SchedulingErrorCode.UNAUTHORIZED:
        return "Access Denied"
      case SchedulingErrorCode.PROJECT_NOT_FOUND:
        return "Project Not Found"
      case SchedulingErrorCode.VALIDATION_ERROR:
        return "Invalid Information"
      default:
        return "Scheduling Error"
    }
  }

  const getVariant = (): "default" | "destructive" => {
    return severity === 'critical' || severity === 'high' ? 'destructive' : 'default'
  }

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getErrorIcon()}
            {getErrorTitle()}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant={getVariant()}>
            <AlertDescription>
              {userMessage}
            </AlertDescription>
          </Alert>

          {retryCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Retry attempt: {retryCount} of {maxRetries}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button onClick={resetError} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Reload Page
            </Button>

            {severity === 'critical' && (
              <Button 
                variant="secondary" 
                onClick={() => window.history.back()} 
                className="w-full"
              >
                Go Back
              </Button>
            )}
          </div>

          {schedulingError.field && (
            <div className="text-sm text-muted-foreground">
              <strong>Field:</strong> {schedulingError.field}
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Error Details (Development)
              </summary>
              <div className="mt-2 space-y-2">
                <div className="text-xs">
                  <strong>Code:</strong> {schedulingError.code}
                </div>
                <div className="text-xs">
                  <strong>Timestamp:</strong> {schedulingError.timestamp?.toISOString()}
                </div>
                {schedulingError.details && (
                  <div className="text-xs">
                    <strong>Details:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {JSON.stringify(schedulingError.details, null, 2)}
                    </pre>
                  </div>
                )}
                <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                  {error.message}
                  {error.stack && `\n\nStack trace:\n${error.stack}`}
                </pre>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Hook version for functional components
export function useSchedulingErrorBoundary() {
  const [error, setError] = React.useState<SchedulingError | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error | SchedulingError) => {
    const schedulingError = 'code' in error 
      ? error as SchedulingError
      : SchedulingErrorHandler.createError(
          SchedulingErrorCode.INTERNAL_ERROR,
          error.message || 'An unexpected error occurred'
        )
    
    setError(schedulingError)
  }, [])

  // Throw error to trigger error boundary
  if (error) {
    throw error
  }

  return { captureError, resetError }
}