import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mergeOptimisticState,
  validateOptimisticUpdate,
  calculateBackoffDelay,
  createOptimisticUpdateBatcher,
  OptimisticUpdateMetrics,
} from '../optimistic-updates';
import { ProjectReadiness } from '../../contexts/readiness-context';

const mockServerState: ProjectReadiness = {
  project_id: 'test-project',
  status: 'ready_for_activation',
  features: {
    team_management: true,
    talent_tracking: false,
    scheduling: true,
    time_tracking: false,
  },
  blocking_issues: [],
  calculated_at: '2024-01-01T01:00:00Z',
};

const mockOptimisticState: Partial<ProjectReadiness> = {
  features: {
    team_management: true,
    talent_tracking: true,
    scheduling: true,
    time_tracking: true,
  },
};

describe('mergeOptimisticState', () => {
  it('should merge with server-wins strategy by default', () => {
    const result = mergeOptimisticState(mockOptimisticState, mockServerState);
    
    expect(result.status).toBe(mockServerState.status);
    expect(result.features).toEqual(mockServerState.features);
    expect(result.blocking_issues).toEqual(mockServerState.blocking_issues);
    expect(result.calculated_at).toBe(mockServerState.calculated_at);
  });

  it('should merge with client-wins strategy', () => {
    const result = mergeOptimisticState(
      mockOptimisticState, 
      mockServerState, 
      'client-wins'
    );
    
    expect(result.features).toEqual(mockOptimisticState.features);
    expect(result.status).toBe(mockServerState.status); // Base fields from server
  });

  it('should merge with merge strategy', () => {
    const result = mergeOptimisticState(
      mockOptimisticState, 
      mockServerState, 
      'merge'
    );
    
    // Should preserve server state for calculated fields
    expect(result.status).toBe(mockServerState.status);
    expect(result.blocking_issues).toEqual(mockServerState.blocking_issues);
    expect(result.calculated_at).toBe(mockServerState.calculated_at);
  });
});

describe('validateOptimisticUpdate', () => {
  const currentState: ProjectReadiness = {
    project_id: 'test-project',
    status: 'setup_required',
    features: {
      team_management: false,
      talent_tracking: false,
      scheduling: false,
      time_tracking: false,
    },
    blocking_issues: ['missing_role_templates'],
    calculated_at: '2024-01-01T00:00:00Z',
  };

  it('should validate allowed updates', () => {
    const updates = {
      features: {
        team_management: true,
        talent_tracking: false,
        scheduling: false,
        time_tracking: false,
      },
    };

    const result = validateOptimisticUpdate(currentState, updates);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject direct status modifications', () => {
    const updates = {
      status: 'active' as const,
    };

    const result = validateOptimisticUpdate(currentState, updates);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Status cannot be modified directly - it is calculated by the server');
  });

  it('should reject direct blocking issues modifications', () => {
    const updates = {
      blocking_issues: [],
    };

    const result = validateOptimisticUpdate(currentState, updates);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Blocking issues cannot be modified directly - they are calculated by the server');
  });

  it('should reject calculated_at modifications', () => {
    const updates = {
      calculated_at: '2024-01-01T02:00:00Z',
    };

    const result = validateOptimisticUpdate(currentState, updates);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Calculated timestamp cannot be modified directly');
  });

  it('should reject time tracking in setup phase', () => {
    const updates = {
      features: {
        team_management: false,
        talent_tracking: false,
        scheduling: false,
        time_tracking: true,
      },
    };

    const result = validateOptimisticUpdate(currentState, updates);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Time tracking cannot be enabled while project is in setup phase');
  });
});

describe('calculateBackoffDelay', () => {
  it('should calculate exponential backoff', () => {
    expect(calculateBackoffDelay(0, 1000, 30000, false)).toBe(1000);
    expect(calculateBackoffDelay(1, 1000, 30000, false)).toBe(2000);
    expect(calculateBackoffDelay(2, 1000, 30000, false)).toBe(4000);
    expect(calculateBackoffDelay(3, 1000, 30000, false)).toBe(8000);
  });

  it('should respect max delay', () => {
    expect(calculateBackoffDelay(10, 1000, 5000, false)).toBe(5000);
  });

  it('should add jitter when enabled', () => {
    const delay1 = calculateBackoffDelay(1, 1000, 30000, true);
    const delay2 = calculateBackoffDelay(1, 1000, 30000, true);
    
    // With jitter, delays should be different
    expect(delay1).not.toBe(delay2);
    
    // But should be within expected range (2000 ± 200)
    expect(delay1).toBeGreaterThan(1800);
    expect(delay1).toBeLessThan(2200);
  });
});

describe('createOptimisticUpdateBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch updates and call sync function', async () => {
    const syncFunction = vi.fn().mockResolvedValue(undefined);
    const batcher = createOptimisticUpdateBatcher(syncFunction, 1000);

    batcher.add({ test: 'update1' });
    batcher.add({ test: 'update2' });

    expect(syncFunction).not.toHaveBeenCalled();

    // Fast-forward timer
    vi.advanceTimersByTime(1000);

    await vi.waitFor(() => {
      expect(syncFunction).toHaveBeenCalledWith([
        { test: 'update1' },
        { test: 'update2' },
      ]);
    });
  });

  it('should reset timer on new updates', async () => {
    const syncFunction = vi.fn().mockResolvedValue(undefined);
    const batcher = createOptimisticUpdateBatcher(syncFunction, 1000);

    batcher.add({ test: 'update1' });
    
    // Advance timer partially
    vi.advanceTimersByTime(500);
    
    // Add another update (should reset timer)
    batcher.add({ test: 'update2' });
    
    // Advance timer by another 500ms (total 1000ms from first update)
    vi.advanceTimersByTime(500);
    
    // Should not have called sync yet
    expect(syncFunction).not.toHaveBeenCalled();
    
    // Advance by another 500ms (1000ms from second update)
    vi.advanceTimersByTime(500);
    
    await vi.waitFor(() => {
      expect(syncFunction).toHaveBeenCalledWith([
        { test: 'update1' },
        { test: 'update2' },
      ]);
    });
  });

  it('should flush pending updates immediately', async () => {
    const syncFunction = vi.fn().mockResolvedValue(undefined);
    const batcher = createOptimisticUpdateBatcher(syncFunction, 1000);

    batcher.add({ test: 'update1' });
    batcher.add({ test: 'update2' });

    await batcher.flush();

    expect(syncFunction).toHaveBeenCalledWith([
      { test: 'update1' },
      { test: 'update2' },
    ]);
  });

  it('should re-queue updates on sync failure', async () => {
    const syncFunction = vi.fn().mockRejectedValue(new Error('Sync failed'));
    const batcher = createOptimisticUpdateBatcher(syncFunction, 1000);

    batcher.add({ test: 'update1' });

    vi.advanceTimersByTime(1000);

    await vi.waitFor(() => {
      expect(syncFunction).toHaveBeenCalled();
    });

    // Should have re-queued the failed update
    expect(batcher.getPendingCount()).toBe(1);
  });

  it('should clear pending updates', () => {
    const syncFunction = vi.fn();
    const batcher = createOptimisticUpdateBatcher(syncFunction, 1000);

    batcher.add({ test: 'update1' });
    batcher.add({ test: 'update2' });

    expect(batcher.getPendingCount()).toBe(2);

    batcher.clear();

    expect(batcher.getPendingCount()).toBe(0);

    // Timer should be cleared too
    vi.advanceTimersByTime(1000);
    expect(syncFunction).not.toHaveBeenCalled();
  });
});

describe('OptimisticUpdateMetrics', () => {
  let metrics: OptimisticUpdateMetrics;

  beforeEach(() => {
    metrics = new OptimisticUpdateMetrics();
  });

  it('should track basic metrics', () => {
    metrics.recordUpdate();
    metrics.recordUpdate();
    metrics.recordSyncSuccess(100);
    metrics.recordSyncFailure();

    const result = metrics.getMetrics();

    expect(result.totalUpdates).toBe(2);
    expect(result.successfulSyncs).toBe(1);
    expect(result.failedSyncs).toBe(1);
    expect(result.averageSyncTime).toBe(100);
    expect(result.successRate).toBe(0.5);
  });

  it('should calculate average sync time correctly', () => {
    metrics.recordSyncSuccess(100);
    metrics.recordSyncSuccess(200);
    metrics.recordSyncSuccess(300);

    const result = metrics.getMetrics();
    expect(result.averageSyncTime).toBe(200);
  });

  it('should track conflict resolutions and reverts', () => {
    metrics.recordUpdate();
    metrics.recordConflictResolution();
    metrics.recordRevert();

    const result = metrics.getMetrics();

    expect(result.conflictResolutions).toBe(1);
    expect(result.reverts).toBe(1);
    expect(result.conflictRate).toBe(1);
  });

  it('should handle zero division gracefully', () => {
    const result = metrics.getMetrics();

    expect(result.successRate).toBe(0);
    expect(result.conflictRate).toBe(0);
  });

  it('should reset metrics', () => {
    metrics.recordUpdate();
    metrics.recordSyncSuccess(100);
    metrics.recordConflictResolution();

    metrics.reset();

    const result = metrics.getMetrics();

    expect(result.totalUpdates).toBe(0);
    expect(result.successfulSyncs).toBe(0);
    expect(result.conflictResolutions).toBe(0);
    expect(result.averageSyncTime).toBe(0);
  });
});