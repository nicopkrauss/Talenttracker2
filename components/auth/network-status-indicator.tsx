"use client"

import * as React from "react"
import { Wifi, WifiOff, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface NetworkStatusIndicatorProps {
  className?: string
  showWhenOnline?: boolean
}

export function NetworkStatusIndicator({ 
  className,
  showWhenOnline = false 
}: NetworkStatusIndicatorProps) {
  const [isOnline, setIsOnline] = React.useState(true)
  const [wasOffline, setWasOffline] = React.useState(false)
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    // Set initial state after hydration
    setIsHydrated(true)
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Show reconnection message briefly
      if (wasOffline) {
        setTimeout(() => setWasOffline(false), 3000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  // Don't render anything until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return null
  }

  // Don't show anything if online and showWhenOnline is false
  if (isOnline && !showWhenOnline && !wasOffline) {
    return null
  }

  return (
    <Alert 
      variant={isOnline ? "default" : "destructive"}
      className={cn(
        "border-l-4 shadow-sm transition-all duration-300 ease-in-out",
        "animate-in slide-in-from-top-2 duration-300",
        isOnline ? "border-l-green-500" : "border-l-red-500",
        className
      )}
    >
      {isOnline ? (
        wasOffline ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <AlertDescription className="font-medium text-green-700">
              Connection restored. You're back online.
            </AlertDescription>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <AlertDescription className="font-medium text-green-700">
              Connected
            </AlertDescription>
          </>
        )
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="font-medium">
            You're offline. Please check your internet connection.
          </AlertDescription>
        </>
      )}
    </Alert>
  )
}

// Hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(true)
  const [connectionType, setConnectionType] = React.useState<string>('unknown')
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    // Set initial state after hydration
    setIsHydrated(true)
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Get connection type if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection

    if (connection) {
      setConnectionType(connection.effectiveType || connection.type || 'unknown')
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || connection.type || 'unknown')
      }
      
      connection.addEventListener('change', handleConnectionChange)
      
      return () => {
        connection.removeEventListener('change', handleConnectionChange)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    connectionType,
    isSlowConnection: connectionType === 'slow-2g' || connectionType === '2g',
    isHydrated
  }
}