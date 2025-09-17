import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReadinessProvider, useReadiness, ProjectReadiness } from '../readiness-context';

// Mock Supabase
const mockUnsubscribe = vi.fn();
const mockSubscription = { unsubscribe: mockUnsubscribe };
const mockChannel = vi.fn(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue(mockSubscription),
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

// Test component
const TestComponent: React.FC = () => {
  const { 
    readiness, 
    updateReadiness, 
    canAccessFeature,
    getMetrics 
  } = useReadiness();

  return (
    <div>
      <div data-testid="team-management">{canAccessFeature('team_management') ? 'enabled' : 'disabled'}</div>
      <div data-testid="status">{readiness?.status || 'no-status'}</div>
      <div data-testid="metrics">{JSON.stringify(getMetrics())}</div>
      <button 
        data-testid="update-optimistic"
        onClick={() => updateReadiness({ 
          features: { 
            ...readiness?.features,
            team_management: true,
            talent_tracking: true,
            scheduling: true,
            time_tracking: false, // Keep this false to avoid validation issues
          }
        })}
      >
        Update Optimistic
      </button>
    </div>
  );
};

const mockReadiness: ProjectReadiness = {
  project_id: 'test-project',
  status: 'ready_for_activation',
  features: {
    team_management: false,
    talent_tracking: false,
    scheduling: false,
    time_tracking: false,
  },
  blocking_issues: [],
  calculated_at: '2024-01-01T00:00:00Z',
};

describe('ReadinessProvider Optimistic Updates - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ readiness: mockReadiness }),
    });
  });

  it('should apply optimistic updates immediately', () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Initial state
    expect(screen.getByTestId('team-management')).toHaveTextContent('disabled');

    // Apply optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Should immediately reflect the optimistic update
    expect(screen.getByTestId('team-management')).toHaveTextContent('enabled');
  });

  it('should track metrics for optimistic updates', () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Initial metrics
    const initialMetrics = JSON.parse(screen.getByTestId('metrics').textContent || '{}');
    expect(initialMetrics.totalUpdates).toBe(0);

    // Apply optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Metrics should be updated
    const updatedMetrics = JSON.parse(screen.getByTestId('metrics').textContent || '{}');
    expect(updatedMetrics.totalUpdates).toBe(1);
  });

  it('should preserve optimistic state across multiple updates', () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Apply first optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    expect(screen.getByTestId('team-management')).toHaveTextContent('enabled');

    // Apply second optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Should still be enabled
    expect(screen.getByTestId('team-management')).toHaveTextContent('enabled');

    // Metrics should show 2 updates
    const metrics = JSON.parse(screen.getByTestId('metrics').textContent || '{}');
    expect(metrics.totalUpdates).toBe(2);
  });

  it('should validate optimistic updates', () => {
    const TestComponentWithInvalidUpdate: React.FC = () => {
      const { readiness, updateReadiness, error } = useReadiness();

      return (
        <div>
          <div data-testid="error">{error?.message || 'no-error'}</div>
          <button 
            data-testid="invalid-update"
            onClick={() => updateReadiness({ 
              status: 'active' // This should be rejected
            })}
          >
            Invalid Update
          </button>
        </div>
      );
    };

    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponentWithInvalidUpdate />
      </ReadinessProvider>
    );

    // Apply invalid update
    act(() => {
      screen.getByTestId('invalid-update').click();
    });

    // Should show validation error
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid update');
  });

  it('should cache readiness data in session storage', () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Apply optimistic update
    act(() => {
      screen.getByTestId('update-optimistic').click();
    });

    // Should have cached the updated state
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'readiness_cache_test-project',
      expect.stringContaining('"team_management":true')
    );
  });
});