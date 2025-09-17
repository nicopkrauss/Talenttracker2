'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  mergeOptimisticState, 
  validateOptimisticUpdate, 
  calculateBackoffDelay,
  OptimisticUpdateMetrics 
} from '../utils/optimistic-updates';

// Types
export interface ProjectReadiness {
  project_id: string;
  status: 'setup_required' | 'ready_for_activation' | 'active';
  features: {
    team_management: boolean;
    talent_tracking: boolean;
    scheduling: boolean;
    time_tracking: boolean;
  };
  blocking_issues: string[];
  calculated_at: string;
}

export interface ReadinessContextValue {
  // Current readiness state
  readiness: ProjectReadiness | null;
  isLoading: boolean;
  error: Error | null;
  
  // Feature availability helpers
  canAccessFeature: (feature: keyof ProjectReadiness['features']) => boolean;
  getBlockingIssues: () => string[];
  isReady: () => boolean;
  
  // State management
  updateReadiness: (updates: Partial<ProjectReadiness>) => void;
  revertOptimisticUpdates: () => void;
  invalidateReadiness: (reason: string) => Promise<void>;
  refreshReadiness: () => Promise<void>;
  
  // Performance monitoring
  getMetrics: () => ReturnType<OptimisticUpdateMetrics['getMetrics']>;
}

const ReadinessContext = createContext<ReadinessContextValue | null>(null);

// Session storage key for caching
const getSessionStorageKey = (projectId: string) => `readiness_cache_${projectId}`;

// Debounce utility
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

interface ReadinessProviderProps {
  projectId: string;
  initialReadiness?: ProjectReadiness;
  children: React.ReactNode;
}

export const ReadinessProvider: React.FC<ReadinessProviderProps> = ({
  projectId,
  initialReadiness,
  children
}) => {
  const [readiness, setReadiness] = useState<ProjectReadiness | null>(initialReadiness || null);
  const [isLoading, setIsLoading] = useState(!initialReadiness);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const syncQueueRef = useRef<Partial<ProjectReadiness>[]>([]);
  const retryCountRef = useRef(0);
  const optimisticStateRef = useRef<Partial<ProjectReadiness> | null>(null);
  const isSyncingRef = useRef(false);
  const metricsRef = useRef(new OptimisticUpdateMetrics());

  // Load cached data from session storage on mount
  useEffect(() => {
    if (!initialReadiness && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(getSessionStorageKey(projectId));
      if (cached) {
        try {
          const cachedReadiness = JSON.parse(cached) as ProjectReadiness;
          setReadiness(cachedReadiness);
          setIsLoading(false);
        } catch (err) {
          console.warn('Failed to parse cached readiness data:', err);
        }
      }
    }
  }, [projectId, initialReadiness]);

  // Cache readiness data in session storage
  useEffect(() => {
    if (readiness && typeof window !== 'undefined') {
      sessionStorage.setItem(getSessionStorageKey(projectId), JSON.stringify(readiness));
    }
  }, [readiness, projectId]);

  // Fetch readiness data from API
  const fetchReadiness = useCallback(async (): Promise<ProjectReadiness | null> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/readiness`);
      if (!response.ok) {
        throw new Error(`Failed to fetch readiness: ${response.statusText}`);
      }
      const data = await response.json();
      return data.readiness;
    } catch (err) {
      throw new Error(`Network error fetching readiness: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [projectId]);

  // Conflict resolution using utility function
  const resolveOptimisticConflict = useCallback((
    optimisticState: Partial<ProjectReadiness>,
    serverState: ProjectReadiness
  ): ProjectReadiness => {
    metricsRef.current.recordConflictResolution();
    return mergeOptimisticState(optimisticState, serverState, 'server-wins');
  }, []);

  // Background sync with exponential backoff and conflict resolution
  const backgroundSync = useCallback(async () => {
    if (syncQueueRef.current.length === 0 || isSyncingRef.current) return;

    isSyncingRef.current = true;
    const syncStartTime = Date.now();
    let queuedUpdates: Partial<ProjectReadiness>[] = [];
    
    try {
      queuedUpdates = syncQueueRef.current.splice(0); // Clear queue
      const freshReadiness = await fetchReadiness();
      
      if (freshReadiness) {
        let finalReadiness = freshReadiness;
        
        // If we have optimistic state, resolve conflicts
        if (optimisticStateRef.current) {
          finalReadiness = resolveOptimisticConflict(optimisticStateRef.current, freshReadiness);
        }
        
        setReadiness(finalReadiness);
        setError(null);
        retryCountRef.current = 0;
        optimisticStateRef.current = null; // Clear optimistic state after successful sync
        
        // Record successful sync
        const syncDuration = Date.now() - syncStartTime;
        metricsRef.current.recordSyncSuccess(syncDuration);
      }
    } catch (err) {
      console.error('Background sync failed:', err);
      setError(err instanceof Error ? err : new Error('Background sync failed'));
      
      // Record failed sync
      metricsRef.current.recordSyncFailure();
      
      // Re-queue the updates for retry
      syncQueueRef.current.unshift(...queuedUpdates);
      
      // Exponential backoff retry with jitter
      const retryDelay = calculateBackoffDelay(retryCountRef.current);
      retryCountRef.current++;
      
      setTimeout(() => {
        backgroundSync();
      }, retryDelay);
    } finally {
      isSyncingRef.current = false;
    }
  }, [fetchReadiness, resolveOptimisticConflict]);

  const debouncedSync = useDebounce(backgroundSync, 1000);



  // Feature availability helper
  const canAccessFeature = useCallback((feature: keyof ProjectReadiness['features']): boolean => {
    if (!readiness) return false;
    return readiness.features[feature];
  }, [readiness]);

  // Get blocking issues
  const getBlockingIssues = useCallback((): string[] => {
    return readiness?.blocking_issues || [];
  }, [readiness]);

  // Check if project is ready
  const isReady = useCallback((): boolean => {
    return readiness?.status !== 'setup_required';
  }, [readiness]);

  // Refresh readiness data
  const refreshReadiness = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const freshReadiness = await fetchReadiness();
      setReadiness(freshReadiness);
    } catch (err) {
      console.error('Failed to refresh readiness:', err);
      setError(err instanceof Error ? err : new Error('Failed to refresh readiness'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchReadiness]);

  // Revert optimistic updates (used when sync fails)
  const revertOptimisticUpdates = useCallback(() => {
    if (optimisticStateRef.current) {
      metricsRef.current.recordRevert();
      
      // Refresh from server to get clean state
      refreshReadiness();
      optimisticStateRef.current = null;
      syncQueueRef.current = []; // Clear pending updates
    }
  }, [refreshReadiness]);

  // Optimistic update with immediate UI feedback and background sync
  const updateReadiness = useCallback((updates: Partial<ProjectReadiness>) => {
    // Validate the update first
    if (readiness) {
      const validation = validateOptimisticUpdate(readiness, updates);
      if (!validation.valid) {
        console.warn('Invalid optimistic update:', validation.errors);
        setError(new Error(`Invalid update: ${validation.errors.join(', ')}`));
        return;
      }
    }
    
    // Record the update
    metricsRef.current.recordUpdate();
    
    // Store optimistic state for conflict resolution
    optimisticStateRef.current = {
      ...optimisticStateRef.current,
      ...updates
    };
    
    // Immediately update UI state
    setReadiness(current => {
      if (!current) return null;
      return { ...current, ...updates };
    });
    
    // Queue for background sync
    syncQueueRef.current.push(updates);
    debouncedSync();
  }, [debouncedSync, readiness]);

  // Invalidate readiness cache and trigger refresh
  const invalidateReadiness = useCallback(async (reason: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/readiness/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error(`Failed to invalidate readiness: ${response.statusText}`);
      }

      const data = await response.json();
      setReadiness(data.readiness);
      setError(null);
    } catch (err) {
      console.error('Failed to invalidate readiness:', err);
      setError(err instanceof Error ? err : new Error('Failed to invalidate readiness'));
    }
  }, [projectId]);

  // Real-time subscription for multi-user updates with batching
  useEffect(() => {
    const updateBatchRef = { current: new Set<string>() };
    const batchTimeoutRef = { current: null as NodeJS.Timeout | null };
    
    const handleRealtimeUpdate = (payload: any) => {
      console.log('Readiness update received:', payload);
      
      // Add update to batch
      updateBatchRef.current.add(payload.eventType || 'UPDATE');
      
      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      // Batch updates to prevent UI thrashing
      batchTimeoutRef.current = setTimeout(async () => {
        const updateTypes = Array.from(updateBatchRef.current);
        updateBatchRef.current.clear();
        
        console.log('Processing batched readiness updates:', updateTypes);
        
        try {
          // Fetch fresh readiness data
          const freshReadiness = await fetchReadiness();
          
          if (freshReadiness) {
            // If we have optimistic state, resolve conflicts
            if (optimisticStateRef.current) {
              const resolvedReadiness = resolveOptimisticConflict(optimisticStateRef.current, freshReadiness);
              setReadiness(resolvedReadiness);
              optimisticStateRef.current = null; // Clear optimistic state after conflict resolution
            } else {
              setReadiness(freshReadiness);
            }
            
            setError(null);
            metricsRef.current.recordRealtimeUpdate();
          }
        } catch (err) {
          console.error('Failed to process real-time readiness update:', err);
          setError(err instanceof Error ? err : new Error('Failed to process real-time update'));
        }
      }, 500); // 500ms batching window to prevent UI thrashing
    };

    let subscription: any = null;
    
    try {
      subscription = supabase
        .channel(`project-readiness-${projectId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'project_readiness_summary',
          filter: `project_id=eq.${projectId}`
        }, handleRealtimeUpdate)
        .subscribe();

      // Handle subscription status changes (if supported)
      if (subscription && typeof subscription.on === 'function') {
        subscription.on('system', {}, (status) => {
          console.log('Readiness subscription status:', status);
          
          if (status.type === 'SYSTEM' && status.event === 'CHANNEL_ERROR') {
            console.error('Readiness subscription error:', status);
            // Don't set error for missing table - just log it
            if (status.message && status.message.includes('project_readiness_summary')) {
              console.warn('project_readiness_summary table not found, skipping real-time updates');
            } else {
              setError(new Error('Real-time connection error'));
            }
          }
          
          if (status.type === 'SYSTEM' && status.event === 'CHANNEL_CLOSED') {
            console.warn('Readiness subscription closed, attempting to reconnect...');
            // The subscription will automatically attempt to reconnect
          }
        });
      }
    } catch (subscriptionError) {
      console.warn('Failed to create readiness subscription:', subscriptionError);
      // Don't fail the entire context if subscription fails
    }

    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      subscription?.unsubscribe();
    };
  }, [projectId, supabase, fetchReadiness, resolveOptimisticConflict]);

  // Initial load if no cached or initial data
  useEffect(() => {
    if (!readiness && !isLoading) {
      refreshReadiness();
    }
  }, [readiness, isLoading, refreshReadiness]);

  // Get performance metrics
  const getMetrics = useCallback(() => {
    return metricsRef.current.getMetrics();
  }, []);

  const contextValue: ReadinessContextValue = {
    readiness,
    isLoading,
    error,
    canAccessFeature,
    getBlockingIssues,
    isReady,
    updateReadiness,
    revertOptimisticUpdates,
    invalidateReadiness,
    refreshReadiness,
    getMetrics,
  };

  return (
    <ReadinessContext.Provider value={contextValue}>
      {children}
    </ReadinessContext.Provider>
  );
};

// Hook to use readiness context
export const useReadiness = (): ReadinessContextValue => {
  const context = useContext(ReadinessContext);
  if (!context) {
    throw new Error('useReadiness must be used within a ReadinessProvider');
  }
  return context;
};

// Export context for testing
export { ReadinessContext };