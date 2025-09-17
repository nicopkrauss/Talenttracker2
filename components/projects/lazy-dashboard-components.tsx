/**
 * Lazy-loaded dashboard components for better performance
 * Components are loaded only when needed to reduce initial bundle size
 */

import React, { lazy, Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy dashboard components
const InfoTabDashboard = lazy(() => 
  import('./info-tab-dashboard').then(module => ({ 
    default: module.InfoTabDashboard 
  }))
)

// Loading skeleton components
const DashboardSkeleton = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </CardContent>
    </Card>
  </div>
)



// Wrapper components with suspense boundaries
export const LazyInfoTabDashboard = (props: any) => (
  <Suspense fallback={<DashboardSkeleton />}>
    <InfoTabDashboard {...props} />
  </Suspense>
)

// Preload functions for better UX
export const preloadDashboardComponents = () => {
  // Preload components when user is likely to need them
  import('./info-tab-dashboard')
}

// Hook for intersection observer-based lazy loading
export const useLazyLoad = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback()
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [callback])
}