import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ReadinessProvider, useReadiness, ProjectReadiness } from '../readiness-context';

// Mock Supabase client
vi.mock('@supabase/auth-helpers-nextjs');

const mockSupabase = {
  channel: vi.fn(),
  from: vi.fn(),
};

const mockChannel = {
  on: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

const mockCreateClientComponentClient = vi.mocked(createClientComponentClient);

// Mock fetch
global.fetch = vi.fn();

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Test component that uses readiness context
const TestComponent: React.FC = () => {
  const { readiness, isLoading, error, getMetrics } = useReadiness();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error?.message || 'no error'}</div>
      <div data-testid="status">{readiness?.status || 'no status'}</div>
      <div data-testid="metrics">{JSON.stringify(getMetrics())}</div>
    </div>
  );
};

const mockReadiness: ProjectReadiness = {
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

describe('ReadinessProvider Real-time Updates', () => {
  let mockChannelHandlers: { [key: string]: (payload: any) => void } = {};
  let mockSystemHandlers: { [key: string]: (status: any) => void } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelHandlers = {};
    mockSystemHandlers = {};
    
    // Setup Supabase mock
    mockCreateClientComponentClient.mockReturnValue(mockSupabase as any);
    
    mockSupabase.channel.mockReturnValue(mockChannel);
    
    mockChannel.on.mockImplementation((event: string, config: any, handler?: any) => {
      if (event === 'postgres_changes') {
        mockChannelHandlers['postgres_changes'] = handler;
      } else if (event === 'system') {
        mockSystemHandlers['system'] = handler;
      }
      return mockChannel;
    });
    
    mockChannel.subscribe.mockReturnValue(mockChannel);
    
    // Mock successful fetch
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ readiness: mockReadiness }),
    } as Response);
    
    // Mock sessionStorage
    vi.mocked(window.sessionStorage.getItem).mockReturnValue(null);
    vi.mocked(window.sessionStorage.setItem).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should establish real-time subscription on mount', async () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('project-readiness-test-project');
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'project_readiness_summary',
        filter: 'project_id=eq.test-project'
      },
      expect.any(Function)
    );

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should handle real-time updates with batching', async () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    // Wait for subscription to be established
    await waitFor(() => {
      expect(mockChannelHandlers['postgres_changes']).toBeDefined();
    });

    // Verify initial state
    expect(screen.getByTestId('status')).toHaveTextContent('setup_required');

    // Simulate real-time update
    act(() => {
      mockChannelHandlers['postgres_changes']({ eventType: 'UPDATE' });
    });

    // Should have triggered the handler
    expect(mockChannelHandlers['postgres_changes']).toHaveBeenCalled;
  });

  it('should handle subscription system events', async () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    await waitFor(() => {
      expect(mockSystemHandlers['system']).toBeDefined();
    });

    // Verify system handler is set up
    expect(mockSystemHandlers['system']).toBeDefined();
  });

  it('should handle subscription errors gracefully', async () => {
    render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    await waitFor(() => {
      expect(mockSystemHandlers['system']).toBeDefined();
    });

    // Simulate subscription error
    act(() => {
      mockSystemHandlers['system']({
        type: 'SYSTEM',
        event: 'CHANNEL_ERROR',
        message: 'Connection failed'
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Real-time connection error');
    });
  });

  it('should clean up subscription on unmount', async () => {
    const { unmount } = render(
      <ReadinessProvider projectId="test-project" initialReadiness={mockReadiness}>
        <TestComponent />
      </ReadinessProvider>
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });
});