/**
 * Performance monitoring and optimization utilities for project readiness system
 * Ensures dashboard loads within 200ms and mode switching is instantaneous
 */

interface PerformanceMetrics {
  dashboardLoadTime: number
  modeSwitchTime: number
  cacheHitRate: number
  apiResponseTime: number
  componentRenderTime: number
}

interface PerformanceThresholds {
  dashboardLoad: number // 200ms target
  modeSwitch: number // 50ms target for instantaneous feel
  apiResponse: number // 500ms target
  componentRender: number // 100ms target
}

class ReadinessPerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private thresholds: PerformanceThresholds = {
    dashboardLoad: 200,
    modeSwitch: 50,
    apiResponse: 500,
    componentRender: 100
  }

  /**
   * Start timing a performance measurement
   */
  startTiming(label: string): () => number {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.recordMetric(label, duration)
      return duration
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(type: string, duration: number): void {
    const metric = {
      dashboardLoadTime: type === 'dashboardLoad' ? duration : 0,
      modeSwitchTime: type === 'modeSwitch' ? duration : 0,
      cacheHitRate: type === 'cacheHit' ? duration : 0,
      apiResponseTime: type === 'apiResponse' ? duration : 0,
      componentRenderTime: type === 'componentRender' ? duration : 0
    }

    this.metrics.push(metric)

    // Keep only last 100 measurements
    if (this.metrics.length > 100) {
      this.metrics.shift()
    }

    // Log warnings for slow operations
    this.checkThresholds(type, duration)
  }

  /**
   * Check if performance meets thresholds
   */
  private checkThresholds(type: string, duration: number): void {
    let threshold: number | undefined
    let warningMessage: string

    switch (type) {
      case 'dashboardLoad':
        threshold = this.thresholds.dashboardLoad
        warningMessage = `Dashboard load time (${duration.toFixed(1)}ms) exceeds target (${threshold}ms)`
        break
      case 'modeSwitch':
        threshold = this.thresholds.modeSwitch
        warningMessage = `Mode switch time (${duration.toFixed(1)}ms) exceeds target (${threshold}ms)`
        break
      case 'apiResponse':
        threshold = this.thresholds.apiResponse
        warningMessage = `API response time (${duration.toFixed(1)}ms) exceeds target (${threshold}ms)`
        break
      case 'componentRender':
        threshold = this.thresholds.componentRender
        warningMessage = `Component render time (${duration.toFixed(1)}ms) exceeds target (${threshold}ms)`
        break
    }

    if (threshold && duration > threshold) {
      console.warn(`[Performance Warning] ${warningMessage}`)
      
      // In development, also log to help with optimization
      if (process.env.NODE_ENV === 'development') {
        console.trace('Performance trace for slow operation')
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    averages: PerformanceMetrics
    latest: PerformanceMetrics | null
    thresholdViolations: number
  } {
    if (this.metrics.length === 0) {
      return {
        averages: {
          dashboardLoadTime: 0,
          modeSwitchTime: 0,
          cacheHitRate: 0,
          apiResponseTime: 0,
          componentRenderTime: 0
        },
        latest: null,
        thresholdViolations: 0
      }
    }

    const averages = this.metrics.reduce(
      (acc, metric) => ({
        dashboardLoadTime: acc.dashboardLoadTime + metric.dashboardLoadTime,
        modeSwitchTime: acc.modeSwitchTime + metric.modeSwitchTime,
        cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
        apiResponseTime: acc.apiResponseTime + metric.apiResponseTime,
        componentRenderTime: acc.componentRenderTime + metric.componentRenderTime
      }),
      {
        dashboardLoadTime: 0,
        modeSwitchTime: 0,
        cacheHitRate: 0,
        apiResponseTime: 0,
        componentRenderTime: 0
      }
    )

    const count = this.metrics.length
    const avgMetrics: PerformanceMetrics = {
      dashboardLoadTime: averages.dashboardLoadTime / count,
      modeSwitchTime: averages.modeSwitchTime / count,
      cacheHitRate: averages.cacheHitRate / count,
      apiResponseTime: averages.apiResponseTime / count,
      componentRenderTime: averages.componentRenderTime / count
    }

    // Count threshold violations
    let violations = 0
    this.metrics.forEach(metric => {
      if (metric.dashboardLoadTime > this.thresholds.dashboardLoad) violations++
      if (metric.modeSwitchTime > this.thresholds.modeSwitch) violations++
      if (metric.apiResponseTime > this.thresholds.apiResponse) violations++
      if (metric.componentRenderTime > this.thresholds.componentRender) violations++
    })

    return {
      averages: avgMetrics,
      latest: this.metrics[this.metrics.length - 1],
      thresholdViolations: violations
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }
}

// Global performance monitor instance
const performanceMonitor = new ReadinessPerformanceMonitor()

// Performance measurement decorators
export function measureDashboardLoad<T extends (...args: any[]) => any>(
  target: T
): T {
  return ((...args: any[]) => {
    const endTiming = performanceMonitor.startTiming('dashboardLoad')
    const result = target(...args)
    
    if (result instanceof Promise) {
      return result.finally(() => endTiming())
    } else {
      endTiming()
      return result
    }
  }) as T
}

export function measureModeSwitch<T extends (...args: any[]) => any>(
  target: T
): T {
  return ((...args: any[]) => {
    const endTiming = performanceMonitor.startTiming('modeSwitch')
    const result = target(...args)
    endTiming()
    return result
  }) as T
}

export function measureApiResponse<T extends (...args: any[]) => Promise<any>>(
  target: T
): T {
  return (async (...args: any[]) => {
    const endTiming = performanceMonitor.startTiming('apiResponse')
    try {
      const result = await target(...args)
      endTiming()
      return result
    } catch (error) {
      endTiming()
      throw error
    }
  }) as T
}

// React component performance measurement hook (to be used in React components)
export function createPerformanceMonitoringHook(componentName: string) {
  return {
    recordCustomMetric: (type: string, duration: number) => {
      performanceMonitor.recordMetric(type, duration)
    },
    startTiming: (label: string) => performanceMonitor.startTiming(label)
  }
}

// Performance optimization utilities
export const PerformanceUtils = {
  /**
   * Debounce function calls to reduce unnecessary operations
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  /**
   * Throttle function calls to limit frequency
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  /**
   * Measure and optimize bundle size
   */
  measureBundleSize(): Promise<{ size: number; gzipSize: number }> {
    return new Promise((resolve) => {
      // This would integrate with webpack-bundle-analyzer in a real implementation
      // For now, return mock data
      resolve({ size: 0, gzipSize: 0 })
    })
  },

  /**
   * Preload critical resources
   */
  preloadResources(urls: string[]): void {
    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = url
      link.as = 'fetch'
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  }
}

// Export the performance monitor instance
export { performanceMonitor }

// Performance monitoring utilities (React context would be implemented separately if needed)
export interface PerformanceContextType {
  monitor: ReadinessPerformanceMonitor
  stats: ReturnType<ReadinessPerformanceMonitor['getStats']>
}

// Export the performance monitor for use in React components
export function createPerformanceContext() {
  return {
    monitor: performanceMonitor,
    stats: performanceMonitor.getStats()
  }
}