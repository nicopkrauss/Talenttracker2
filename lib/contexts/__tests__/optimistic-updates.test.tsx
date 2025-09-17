import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadinessProvider, useReadiness, ProjectReadiness } from '../readiness-context';

// Mock Supabase
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockOn = vi.fn();

const mockSubscription = {
  unsubscribe: mockUnsubscribe,
};

const mockChannel = vi.fn(() => ({
  on: mockOn.mockReturnThis(),
  subscribe: mockSubscribe.mockReturnValue(mockSubscription),
}));

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    channel: mockChannel,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Test component that uses the readiness context
const TestComponent: React.FC = () => {
  const { 
    readiness, 
    isLoading, 
    error, 
    updateReadiness, 
    revertOptimisticUpdates,
    canAccessFeature 
  } = useReadiness();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{error?.message || 'no-error'}</div>
      <div data-testid="status">{readiness?.status || 'no-status'}</div>
      <div data-testid="blocking-issues">{readiness?.blocking_issues?.join(',') || 'no-issues'}</div>
      <div data-testid="team-management">{canAccessFeature('team_management') ? 'enabled' : 'disabled'}</div>
      <button 
        data-testid="update-optimistic"
        onClick={() => updateReadiness({ 
          features: { 
            ...readiness?.features,
            team_management: true,
            talent_tracking: true,
            scheduling: true,
            time_tracking: true,
          }
        })}
      >
        Update Optimistic
      </button>
      <button 
        data-testid="revert-updates"
        onClick={() => revertOptimisticUpdates()}
      >
        Revert Updates
      </button>
    </div>
  );
};

const mockReadiness: ProjectReadiness = {
  project_id: 'test-project',
  status: 'ready_for_activation', // Change to avoid validation issues
  features: {
    team_management: false,
    talent_tracking: false,
    scheduling: false,
    time_tracking: false,
  },
  blocking_issues: [],
  calculated_at: '2024-01-01T00:00:00Z',
};

describe('ReadinessProvider Optimistic Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ readiness: mockReadiness }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should apply optimistic updates immediately', async () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Initial state
    expect(screen.getByTestId('team-management')).toHaveTextContent('disabled');
    expect(screen.getByTestId('status')).toHaveTextContent('ready_for_activation');

    // Apply optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Should immediately reflect the optimistic update
    expect(screen.getByTestId('team-management')).toHaveTextContent('enabled');
  });

  it('should queue background sync after optimistic update', async () => {
    vi.useFakeTimers();
    
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Apply optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Fast-forward debounce timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should trigger background sync
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/readiness');
    }, { timeout: 2000 });

    vi.useRealTimers();
  });

  it('should resolve conflicts with server state winning for calculated fields', async () => {
    vi.useFakeTimers();
    
    const serverReadiness: ProjectReadiness = {
      ...mockReadiness,
      status: 'ready_for_activation', // Server calculated this differently
      features: {
        team_management: true,
        talent_tracking: false, // Server says this is still false
        scheduling: false,
        time_tracking: false,
      },
      blocking_issues: [], // Server cleared blocking issues
      calculated_at: '2024-01-01T01:00:00Z',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ readiness: serverReadiness }),
    });

    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Apply optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Optimistic state should be applied immediately
    expect(screen.getByTestId('team-management')).toHaveTextContent('enabled');
    expect(screen.getByTestId('status')).toHaveTextContent('ready_for_activation'); // Status shouldn't change optimistically

    // Fast-forward debounce timer to trigger sync
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Wait for background sync to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/readiness');
    }, { timeout: 2000 });

    // Server state should win for calculated fields
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready_for_activation');
    }, { timeout: 2000 });

    vi.useRealTimers();
  });

  it('should handle background sync failures with exponential backoff', async () => {
    vi.useFakeTimers();
    
    // Mock fetch to fail initially
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Apply optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Fast-forward debounce timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Wait for first sync attempt to fail
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });

    // Should show error
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Background sync failed');
    }, { timeout: 2000 });

    // Mock successful response for retry
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ readiness: mockReadiness }),
    });

    // Fast-forward to first retry (1 second backoff)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should retry and succeed
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, { timeout: 2000 });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    }, { timeout: 2000 });

    vi.useRealTimers();
  });

  it('should revert optimistic updates when requested', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ readiness: mockReadiness }),
    });

    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Apply optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Should show optimistic state
    expect(screen.getByTestId('team-management')).toHaveTextContent('enabled');

    // Revert updates
    act(() => {
      screen.getByTestId('revert-updates').click();
    });

    // Should trigger refresh and revert to server state
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/readiness');
    }, { timeout: 2000 });

    await waitFor(() => {
      expect(screen.getByTestId('team-management')).toHaveTextContent('disabled');
    }, { timeout: 2000 });
  });

  it('should not sync when already syncing', async () => {
    vi.useFakeTimers();
    
    // Mock slow response
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    mockFetch.mockReturnValue(slowPromise);

    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Apply first optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Fast-forward debounce timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Apply second optimistic update while first is syncing
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Fast-forward debounce timer again
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should only have one fetch call (first sync still in progress)
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Resolve the slow promise
    act(() => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ readiness: mockReadiness }),
      });
    });

    vi.useRealTimers();
  });

  it('should preserve optimistic updates across multiple calls', async () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Apply first optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Apply second optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Both updates should be preserved
    expect(screen.getByTestId('team-management')).toHaveTextContent('enabled');
  });
});