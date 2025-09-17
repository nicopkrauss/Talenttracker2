/**
 * Project Readiness Cache System
 * Implements 30-second TTL caching for readiness data as specified in design
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface ProjectReadinessData {
  project_id: string
  overall_status: string
  todoItems: any[]
  featureAvailability: any
  assignmentProgress: any
  [key: string]: any
}

class ReadinessCache {
  private cache = new Map<string, CacheEntry<ProjectReadinessData>>()
  private readonly DEFAULT_TTL = 30 * 1000 // 30 seconds in milliseconds
  
  /**
   * Get cached readiness data if still valid
   */
  get(projectId: string): ProjectReadinessData | null {
    const entry = this.cache.get(projectId)
    
    if (!entry) {
      return null
    }
    
    const now = Date.now()
    const isExpired = (now - entry.timestamp) > entry.ttl
    
    if (isExpired) {
      this.cache.delete(projectId)
      return null
    }
    
    return entry.data
  }
  
  /**
   * Set readiness data in cache with TTL
   */
  set(projectId: string, data: ProjectReadinessData, ttl?: number): void {
    const entry: CacheEntry<ProjectReadinessData> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    }
    
    this.cache.set(projectId, entry)
  }
  
  /**
   * Invalidate cache entry for a project
   */
  invalidate(projectId: string): void {
    this.cache.delete(projectId)
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    
    this.cache.forEach((entry) => {
      const isExpired = (now - entry.timestamp) > entry.ttl
      if (isExpired) {
        expiredEntries++
      } else {
        validEntries++
      }
    })
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / Math.max(this.cache.size, 1)
    }
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    this.cache.forEach((entry, key) => {
      const isExpired = (now - entry.timestamp) > entry.ttl
      if (isExpired) {
        expiredKeys.push(key)
      }
    })
    
    expiredKeys.forEach(key => this.cache.delete(key))
  }
  
  /**
   * Check if data exists and is valid
   */
  has(projectId: string): boolean {
    return this.get(projectId) !== null
  }
  
  /**
   * Get remaining TTL for a cache entry
   */
  getRemainingTTL(projectId: string): number {
    const entry = this.cache.get(projectId)
    
    if (!entry) {
      return 0
    }
    
    const now = Date.now()
    const elapsed = now - entry.timestamp
    const remaining = entry.ttl - elapsed
    
    return Math.max(0, remaining)
  }
}

// Global cache instance
const readinessCache = new ReadinessCache()

// Cleanup expired entries every 60 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    readinessCache.cleanup()
  }, 60 * 1000)
}

export { readinessCache, type ProjectReadinessData }

/**
 * Cache-aware fetch function for readiness data
 */
export async function fetchReadinessWithCache(
  projectId: string,
  forceRefresh = false
): Promise<ProjectReadinessData> {
  // Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cached = readinessCache.get(projectId)
    if (cached) {
      return cached
    }
  }
  
  // Fetch from API
  const response = await fetch(`/api/projects/${projectId}/readiness`, {
    headers: {
      'Cache-Control': 'no-cache'
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch readiness data: ${response.status}`)
  }
  
  const result = await response.json()
  const data = result.data as ProjectReadinessData
  
  // Cache the result
  readinessCache.set(projectId, data)
  
  return data
}

/**
 * Invalidate cache when readiness data changes
 */
export function invalidateReadinessCache(projectId: string): void {
  readinessCache.invalidate(projectId)
}

/**
 * Preload readiness data for multiple projects
 */
export async function preloadReadinessData(projectIds: string[]): Promise<void> {
  const promises = projectIds.map(async (projectId) => {
    try {
      await fetchReadinessWithCache(projectId)
    } catch (error) {
      console.warn(`Failed to preload readiness data for project ${projectId}:`, error)
    }
  })
  
  await Promise.allSettled(promises)
}

/**
 * Background refresh for active projects
 */
export function startBackgroundRefresh(projectIds: string[], interval = 25000): () => void {
  const refreshInterval = setInterval(async () => {
    for (const projectId of projectIds) {
      try {
        // Only refresh if cache is about to expire (within 5 seconds)
        const remainingTTL = readinessCache.getRemainingTTL(projectId)
        if (remainingTTL <= 5000) {
          await fetchReadinessWithCache(projectId, true)
        }
      } catch (error) {
        console.warn(`Background refresh failed for project ${projectId}:`, error)
      }
    }
  }, interval)
  
  // Return cleanup function
  return () => clearInterval(refreshInterval)
}