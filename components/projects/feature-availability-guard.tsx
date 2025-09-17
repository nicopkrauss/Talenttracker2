"use client"

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  AlertTriangle, 
  Lock, 
  ArrowRight, 
  Settings,
  Users,
  Star,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSpecificFeatureAvailability, FeatureAvailabilityMap } from '@/hooks/use-feature-availability'

interface FeatureAvailabilityGuardProps {
  projectId: string
  feature: keyof FeatureAvailabilityMap
  children: React.ReactNode
  fallback?: React.ReactNode
  showAlert?: boolean
  alertVariant?: 'default' | 'destructive'
  onNavigate?: (route: string) => void
}

const getFeatureIcon = (feature: keyof FeatureAvailabilityMap) => {
  switch (feature) {
    case 'timeTracking':
    case 'timecards':
      return Clock
    case 'assignments':
      return Calendar
    case 'locationTracking':
      return MapPin
    case 'talentManagement':
      return Star
    case 'teamManagement':
      return Users
    case 'supervisorCheckout':
    case 'projectOperations':
    case 'notifications':
    default:
      return Settings
  }
}

const getFeatureDisplayName = (feature: keyof FeatureAvailabilityMap) => {
  switch (feature) {
    case 'timeTracking':
      return 'Time Tracking'
    case 'assignments':
      return 'Assignments'
    case 'locationTracking':
      return 'Location Tracking'
    case 'supervisorCheckout':
      return 'Supervisor Checkout'
    case 'talentManagement':
      return 'Talent Management'
    case 'projectOperations':
      return 'Project Operations'
    case 'notifications':
      return 'Notifications'
    case 'timecards':
      return 'Timecards'
    case 'teamManagement':
      return 'Team Management'
    default:
      return 'Feature'
  }
}

/**
 * Component that guards access to features based on project readiness
 * Shows children if feature is available, otherwise shows guidance
 */
export function FeatureAvailabilityGuard({
  projectId,
  feature,
  children,
  fallback,
  showAlert = true,
  alertVariant = 'default',
  onNavigate
}: FeatureAvailabilityGuardProps) {
  const router = useRouter()
  const featureCheck = useSpecificFeatureAvailability(projectId, feature)
  
  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route)
    } else {
      router.push(route)
    }
  }

  // Show loading state
  if (featureCheck.loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    )
  }

  // Show error state
  if (featureCheck.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to check feature availability: {featureCheck.error}
        </AlertDescription>
      </Alert>
    )
  }

  // Feature is available - show children
  if (featureCheck.available) {
    return <>{children}</>
  }

  // Feature is not available - show fallback or guidance
  if (fallback) {
    return <>{fallback}</>
  }

  const Icon = getFeatureIcon(feature)
  const featureName = getFeatureDisplayName(feature)

  return (
    <div className="space-y-4">
      {showAlert && (
        <Alert variant={alertVariant}>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{featureName} Not Available</p>
              <p className="text-sm">{featureCheck.requirement}</p>
              {featureCheck.guidance && (
                <p className="text-sm text-muted-foreground">
                  {featureCheck.guidance}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">
            {featureName} Unavailable
          </h3>
          
          <p className="text-muted-foreground mb-2 max-w-md">
            {featureCheck.requirement}
          </p>
          
          {featureCheck.guidance && (
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {featureCheck.guidance}
            </p>
          )}

          {featureCheck.actionRoute && (
            <Button 
              onClick={() => handleNavigate(featureCheck.actionRoute!)}
              className="gap-2"
            >
              Complete Setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Higher-order component that wraps a component with feature availability checking
 */
export function withFeatureAvailability<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: keyof FeatureAvailabilityMap,
  options?: {
    showAlert?: boolean
    alertVariant?: 'default' | 'destructive'
  }
) {
  return function FeatureGuardedComponent(props: P & { projectId: string }) {
    const { projectId, ...componentProps } = props
    
    return (
      <FeatureAvailabilityGuard
        projectId={projectId}
        feature={feature}
        showAlert={options?.showAlert}
        alertVariant={options?.alertVariant}
      >
        <WrappedComponent {...(componentProps as P)} />
      </FeatureAvailabilityGuard>
    )
  }
}

/**
 * Specific guards for common features
 */
export function TimeTrackingGuard({ 
  projectId, 
  children, 
  fallback,
  onNavigate 
}: {
  projectId: string
  children: React.ReactNode
  fallback?: React.ReactNode
  onNavigate?: (route: string) => void
}) {
  return (
    <FeatureAvailabilityGuard
      projectId={projectId}
      feature="timeTracking"
      fallback={fallback}
      onNavigate={onNavigate}
    >
      {children}
    </FeatureAvailabilityGuard>
  )
}

export function AssignmentGuard({ 
  projectId, 
  children, 
  fallback,
  onNavigate 
}: {
  projectId: string
  children: React.ReactNode
  fallback?: React.ReactNode
  onNavigate?: (route: string) => void
}) {
  return (
    <FeatureAvailabilityGuard
      projectId={projectId}
      feature="assignments"
      fallback={fallback}
      onNavigate={onNavigate}
    >
      {children}
    </FeatureAvailabilityGuard>
  )
}

export function LocationTrackingGuard({ 
  projectId, 
  children, 
  fallback,
  onNavigate 
}: {
  projectId: string
  children: React.ReactNode
  fallback?: React.ReactNode
  onNavigate?: (route: string) => void
}) {
  return (
    <FeatureAvailabilityGuard
      projectId={projectId}
      feature="locationTracking"
      fallback={fallback}
      onNavigate={onNavigate}
    >
      {children}
    </FeatureAvailabilityGuard>
  )
}

export function TimecardGuard({ 
  projectId, 
  children, 
  fallback,
  onNavigate 
}: {
  projectId: string
  children: React.ReactNode
  fallback?: React.ReactNode
  onNavigate?: (route: string) => void
}) {
  return (
    <FeatureAvailabilityGuard
      projectId={projectId}
      feature="timecards"
      fallback={fallback}
      onNavigate={onNavigate}
    >
      {children}
    </FeatureAvailabilityGuard>
  )
}