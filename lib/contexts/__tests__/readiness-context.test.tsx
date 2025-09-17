import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadinessProvider, useReadiness, ProjectReadiness } from '../readiness-context';

// Mock Supabase client
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe }),
  unsubscribe: mockUnsubscribe,
};

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    channel: vi.fn().mockReturnValue(mockChannel),
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
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Test component that uses the context
const TestComponent: React.FC = () => {
  const {
    readiness,
    isLoading,
    error,
    canAccessFeature,
    getBlockingIssues,
    isReady,
    updateReadiness,
    invalidateReadiness,
    refreshReadiness,
  } = useReadiness();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{error?.message || 'no-error'}</div>
      <div data-testid="status">{readiness?.status || 'no-status'}</div>
      <div data-testid="team-management">{canAccessFeature('team_management') ? 'yes' : 'no'}</div>
      <div data-testid="blocking-issues">{getBlockingIssues().join(',')}</div>
      <div data-testid="is-ready">{isReady() ? 'yes' : 'no'}</div>
      <button onClick={() => updateReadiness({ status: 'active' })}>Update Status</button>
      <button onClick={() => invalidateReadiness('test')}>Invalidate</button>
      <button onClick={() => refreshReadiness()}>Refresh</button>
    </div>
  );
};

const mockReadiness: ProjectReadiness = {
  project_id: 'test-project',
  status: 'setup_required',
  features: {
    team_management: true,
    talent_tracking: false,
    scheduling: false,
    time_tracking: false,
  },
  blocking_issues: ['missing_locations'],
  calculated_at: '2024-01-01T00:00:00Z',
};

describe('ReadinessProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should provide initial readiness data', () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('status')).toHaveTextContent('setup_required');
    expect(screen.getByTestId('team-management')).toHaveTextContent('yes');
    expect(screen.getByTestId('blocking-issues')).toHaveTextContent('missing_locations');
    expect(screen.getByTestId('is-ready')).toHaveTextContent('no');
  });

  it('should load from session storage when no initial data provided', () => {
    mockSessionStorage.getItem.mockReturnValue(JSON.stringify(mockReadiness));

    render(
      <ReadinessProvider projectId="test-project">
        <TestComponent />
      </ReadinessProvider>
    );

    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('readiness_cache_test-project');
    expect(screen.getByTestId('status')).toHaveTextContent('setup_required');
    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
  });

  it('should cache readiness data in session storage', () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'readiness_cache_test-project',
      JSON.stringify(mockReadiness)
    );
  });

  it('should handle session storage parsing errors gracefully', () => {
    mockSessionStorage.getItem.mockReturnValue('invalid-json');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <ReadinessProvider projectId="test-project">
        <TestComponent />
      </ReadinessProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to parse cached readiness data:',
      expect.any(Error)
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    consoleSpy.mockRestore();
  });

  it('should fetch readiness data when no initial or cached data', async () => {
    mockSessionStorage.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ readiness: mockReadiness }),
    });

    render(
      <ReadinessProvider projectId="test-project">
        <TestComponent />
      </ReadinessProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('setup_required');
    }, { timeout: 2000 });

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/readiness');
    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
  });

  it('should handle fetch errors', async () => {
    mockSessionStorage.getItem.mockReturnValue(null);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <ReadinessProvider projectId="test-project">
        <TestComponent />
      </ReadinessProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error fetching readiness: Network error');
    }, { timeout: 2000 });

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
  });

  it('should handle optimistic updates', async () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('setup_required');

    act(() => {
      screen.getByText('Update Status').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('active');
  });

  it('should invalidate readiness cache', async () => {
    const updatedReadiness = { ...mockReadiness, status: 'active' as const };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ readiness: updatedReadiness }),
    });

    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    await act(async () => {
      screen.getByText('Invalidate').click();
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow promise to resolve
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/projects/test-project/readiness/invalidate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'test' }),
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('active');
    }, { timeout: 1000 });
  });

  it('should handle invalidation errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Invalidation failed'));

    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    await act(async () => {
      screen.getByText('Invalidate').click();
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow promise to resolve
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to invalidate readiness');
    }, { timeout: 1000 });
  });

  it('should refresh readiness data', async () => {
    const updatedReadiness = { ...mockReadiness, status: 'active' as const };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ readiness: updatedReadiness }),
    });

    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    await act(async () => {
      screen.getByText('Refresh').click();
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow promise to resolve
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/readiness');

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('active');
    }, { timeout: 1000 });
  });

  it('should set up real-time subscription', () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    expect(mockChannel).toHaveBeenCalledWith('project-readiness-test-project');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'project_readiness_summary',
        filter: 'project_id=eq.test-project',
      },
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('should clean up subscription on unmount', () => {
    const { unmount } = render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should throw error when useReadiness is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useReadiness must be used within a ReadinessProvider');

    consoleSpy.mockRestore();
  });

  describe('feature availability helpers', () => {
    it('should correctly check feature availability', () => {
      render(
        <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
          <TestComponent />
        </ReadinessProvider>
      );

      expect(screen.getByTestId('team-management')).toHaveTextContent('yes');
    });

    it('should return false for features when no readiness data', () => {
      render(
        <ReadinessProvider projectId="test-project">
          <TestComponent />
        </ReadinessProvider>
      );

      expect(screen.getByTestId('team-management')).toHaveTextContent('no');
    });

    it('should return blocking issues', () => {
      render(
        <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
          <TestComponent />
        </ReadinessProvider>
      );

      expect(screen.getByTestId('blocking-issues')).toHaveTextContent('missing_locations');
    });

    it('should check if project is ready', () => {
      const readyReadiness = { ...mockReadiness, status: 'ready_for_activation' as const };
      
      render(
        <ReadinessProvider projectId="test-project" initialReadiness={readyReadiness}>
          <TestComponent />
        </ReadinessProvider>
      );

      expect(screen.getByTestId('is-ready')).toHaveTextContent('yes');
    });
  });

  describe('background sync', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should perform background sync after optimistic updates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ readiness: { ...mockReadiness, status: 'active' } }),
      });

      render(
        <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
          <TestComponent />
        </ReadinessProvider>
      );

      act(() => {
        screen.getByText('Update Status').click();
      });

      // Fast-forward debounce timer
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/readiness');
      }, { timeout: 2000 });
    }, 10000);

    it('should handle background sync errors with exponential backoff', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Sync failed'));

      render(
        <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
          <TestComponent />
        </ReadinessProvider>
      );

      act(() => {
        screen.getByText('Update Status').click();
      });

      // Fast-forward debounce timer
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Background sync failed:', expect.any(Error));
      }, { timeout: 2000 });

      // Should schedule retry with exponential backoff
      act(() => {
        vi.advanceTimersByTime(1000); // First retry after 1s
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      }, { timeout: 2000 });

      consoleSpy.mockRestore();
    }, 10000);
  });
});