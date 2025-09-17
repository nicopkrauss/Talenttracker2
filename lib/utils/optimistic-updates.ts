import { ProjectReadiness } from '../contexts/readiness-context';

/**
 * Utility functions for handling optimistic updates in the readiness system
 */

export interface OptimisticUpdateOptions {
  immediate?: boolean;
  skipSync?: boolean;
  conflictResolution?: 'server-wins' | 'client-wins' | 'merge';
}

export interface OptimisticUpdateResult {
  success: boolean;
  error?: Error;
  reverted?: boolean;
}

/**
 * Merge optimistic updates with server state, resolving conflicts
 */
export function mergeOptimisticState(
  optimisticState: Partial<ProjectReadiness>,
  serverState: ProjectReadiness,
  strategy: 'server-wins' | 'client-wins' | 'merge' = 'server-wins'
): ProjectReadiness {
  switch (strategy) {
    case 'server-wins':
      return {
        ...optimisticState,
        // Server state wins for calculated fields
        project_id: serverState.project_id,
        status: serverState.status,
        features: serverState.features,
        blocking_issues: serverState.blocking_issues,
        calculated_at: serverState.calculated_at,
      };
    
    case 'client-wins':
      return {
        ...serverState,
        ...optimisticState,
      };
    
    case 'merge':
      return {
        ...serverState,
        ...optimisticState,
        // Always use server state for calculated fields
        status: serverState.status,
        features: {
          ...serverState.features,
          // Allow client overrides for user-controlled features if needed
        },
        blocking_issues: serverState.blocking_issues,
        calculated_at: serverState.calculated_at,
      };
    
    default:
      return serverState;
  }
}

/**
 * Validate optimistic update to ensure it doesn't violate business rules
 */
export function validateOptimisticUpdate(
  currentState: ProjectReadiness,
  updates: Partial<ProjectReadiness>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Don't allow direct modification of calculated fields
  if (updates.status && updates.status !== currentState.status) {
    errors.push('Status cannot be modified directly - it is calculated by the server');
  }

  if (updates.blocking_issues) {
    errors.push('Blocking issues cannot be modified directly - they are calculated by the server');
  }

  if (updates.calculated_at) {
    errors.push('Calculated timestamp cannot be modified directly');
  }

  // Validate feature flags don't contradict business logic
  if (updates.features) {
    if (currentState.status === 'setup_required' && updates.features.time_tracking) {
      errors.push('Time tracking cannot be enabled while project is in setup phase');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate exponential backoff delay for retry attempts
 */
export function calculateBackoffDelay(
  retryCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  jitter: boolean = true
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  
  if (jitter) {
    // Add random jitter to prevent thundering herd
    const jitterAmount = exponentialDelay * 0.1;
    return exponentialDelay + (Math.random() * jitterAmount * 2 - jitterAmount);
  }
  
  return exponentialDelay;
}

/**
 * Create a debounced function for batching optimistic updates
 */
export function createOptimisticUpdateBatcher<T>(
  syncFunction: (updates: T[]) => Promise<void>,
  delay: number = 1000
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingUpdates: T[] = [];

  return {
    add: (update: T) => {
      pendingUpdates.push(update);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(async () => {
        const updates = [...pendingUpdates];
        pendingUpdates = [];
        timeoutId = null;
        
        try {
          await syncFunction(updates);
        } catch (error) {
          console.error('Batched sync failed:', error);
          // Re-queue failed updates
          pendingUpdates.unshift(...updates);
        }
      }, delay);
    },
    
    flush: async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (pendingUpdates.length > 0) {
        const updates = [...pendingUpdates];
        pendingUpdates = [];
        await syncFunction(updates);
      }
    },
    
    clear: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pendingUpdates = [];
    },
    
    getPendingCount: () => pendingUpdates.length,
  };
}

/**
 * Track optimistic update performance metrics
 */
export class OptimisticUpdateMetrics {
  private metrics = {
    totalUpdates: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    conflictResolutions: 0,
    reverts: 0,
    realtimeUpdates: 0,
  };

  recordUpdate() {
    this.metrics.totalUpdates++;
  }

  recordSyncSuccess(duration: number) {
    this.metrics.successfulSyncs++;
    this.updateAverageSyncTime(duration);
  }

  recordSyncFailure() {
    this.metrics.failedSyncs++;
  }

  recordConflictResolution() {
    this.metrics.conflictResolutions++;
  }

  recordRevert() {
    this.metrics.reverts++;
  }

  recordRealtimeUpdate() {
    this.metrics.realtimeUpdates++;
  }

  private updateAverageSyncTime(duration: number) {
    const totalSyncs = this.metrics.successfulSyncs;
    this.metrics.averageSyncTime = 
      (this.metrics.averageSyncTime * (totalSyncs - 1) + duration) / totalSyncs;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalUpdates > 0 
        ? this.metrics.successfulSyncs / this.metrics.totalUpdates 
        : 0,
      conflictRate: this.metrics.totalUpdates > 0
        ? this.metrics.conflictResolutions / this.metrics.totalUpdates
        : 0,
    };
  }

  reset() {
    this.metrics = {
      totalUpdates: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      conflictResolutions: 0,
      reverts: 0,
      realtimeUpdates: 0,
    };
  }
}