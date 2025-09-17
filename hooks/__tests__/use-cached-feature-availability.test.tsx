import React from 'react';
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  useCachedFeatureAvailability, 
  useSpecificCachedFeatureAvailability,
  useCachedFeatureGuidance 
} from '../use-cached-feature-availability';
import { ReadinessProvider, ProjectReadiness, ReadinessContext } from '../../lib/contexts/readiness-context';

// Mock Supabase client
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockChannel = vi.fn().mockReturnValue({ on: mockOn });

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
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

const mockReadiness: ProjectReadiness = {
  project_id: 'test-project',
  status: 'setup_required',
  features: {
    team_management: true,
    talent_tracking: false,
    scheduling: false,
    time_tracking: false,
  },
  blocking_issues: ['missing_locations', 'missing_team_assignments'],
  calculated_at: '2024-01-01T00:00:00Z',
};

const readyReadiness: ProjectReadiness = {
  project_id: 'test-project',
  status: 'ready_for_activation',
  features: {
    team_management: true,
    talent_tracking: true,
    scheduling: true,
    time_tracking: false,
  },
  blocking_issues: [],
  calculated_at: '2024-01-01T00:00:00Z',
};

const activeReadiness: ProjectReadiness = {
  project_id: 'test-project',
  status: 'active',
  features: {
    team_management: true,
    talent_tracking: true,
    scheduling: true,
    time_tracking: true,
  },
  blocking_issues: [],
  calculated_at: '2024-01-01T00:00:00Z',
};

const createWrapper = (initialReadiness?: ProjectReadiness) => {
  return ({ children }: { children: React.ReactNode }) => (
    <ReadinessProvider projectId="test-project" initialReadiness={initialReadiness}>
      {children}
    </ReadinessProvider>
  );
};

describe('useCachedFeatureAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it('should return correct feature availability for setup_required status', () => {
    const { result } = renderHook(() => useCachedFeatureAvailability(), {
      wrapper: createWrapper(mockReadiness),
    });

    expect(result.current).toEqual({
      canManageTeam: true,
      canTrackTalent: false,
      canSchedule: false,
      canTrackTime: false,
      isSetupComplete: false,
      isReadyForActivation: false,
      isActive: false,
      blockingIssues: ['missing_locations', 'missing_team_assignments'],
      nextSteps: [
        'Assign team members to the project',
        'Configure project locations',
      ],
    });
  });

  it('should return correct feature availability for ready_for_activation status', () => {
    const { result } = renderHook(() => useCachedFeatureAvailability(), {
      wrapper: createWrapper(readyReadiness),
    });

    expect(result.current).toEqual({
      canManageTeam: true,
      canTrackTalent: true,
      canSchedule: true,
      canTrackTime: false,
      isSetupComplete: true,
      isReadyForActivation: true,
      isActive: false,
      blockingIssues: [],
      nextSteps: ['Project is ready for activation'],
    });
  });

  it('should return correct feature availability for active status', () => {
    const { result } = renderHook(() => useCachedFeatureAvailability(), {
      wrapper: createWrapper(activeReadiness),
    });

    expect(result.current).toEqual({
      canManageTeam: true,
      canTrackTalent: true,
      canSchedule: true,
      canTrackTime: true,
      isSetupComplete: true,
      isReadyForActivation: false,
      isActive: true,
      blockingIssues: [],
      nextSteps: ['Project is active and fully operational'],
    });
  });

  it('should return disabled features when loading', () => {
    const { result } = renderHook(() => useCachedFeatureAvailability(), {
      wrapper: createWrapper(), // No initial readiness, will be loading
    });

    expect(result.current).toEqual({
      canManageTeam: false,
      canTrackTalent: false,
      canSchedule: false,
      canTrackTime: false,
      isSetupComplete: false,
      isReadyForActivation: false,
      isActive: false,
      blockingIssues: [],
      nextSteps: ['Loading...'],
    });
  });

  it('should return disabled features when error occurs', () => {
    // Create a wrapper with error state by mocking the context
    const ErrorWrapper = ({ children }: { children: React.ReactNode }) => {
      const mockContextValue = {
        readiness: null,
        isLoading: false,
        error: new Error('Network error'),
        canAccessFeature: () => false,
        getBlockingIssues: () => [],
        isReady: () => false,
        updateReadiness: vi.fn(),
        invalidateReadiness: vi.fn(),
        refreshReadiness: vi.fn(),
      };
      
      return (
        <ReadinessContext.Provider value={mockContextValue}>
          {children}
        </ReadinessContext.Provider>
      );
    };

    const { result } = renderHook(() => useCachedFeatureAvailability(), {
      wrapper: ErrorWrapper,
    });

    expect(result.current.nextSteps).toEqual(['Error loading project status']);
  });
});

describe('useSpecificCachedFeatureAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it('should return availability for specific feature', () => {
    const { result } = renderHook(() => useSpecificCachedFeatureAvailability('team_management'), {
      wrapper: createWrapper(mockReadiness),
    });

    expect(result.current).toEqual({
      available: true,
      loading: false,
      error: null,
    });
  });

  it('should return unavailable for disabled feature', () => {
    const { result } = renderHook(() => useSpecificCachedFeatureAvailability('talent_tracking'), {
      wrapper: createWrapper(mockReadiness),
    });

    expect(result.current).toEqual({
      available: false,
      loading: false,
      error: null,
    });
  });

  it('should return loading state', () => {
    const { result } = renderHook(() => useSpecificCachedFeatureAvailability('team_management'), {
      wrapper: createWrapper(), // No initial readiness
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.available).toBe(false);
  });
});

describe('useCachedFeatureGuidance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it('should return blocking issues and next steps', () => {
    const { result } = renderHook(() => useCachedFeatureGuidance(), {
      wrapper: createWrapper(mockReadiness),
    });

    expect(result.current).toEqual({
      blockingIssues: ['missing_locations', 'missing_team_assignments'],
      nextSteps: [
        'Assign team members to the project',
        'Configure project locations',
      ],
      hasBlockingIssues: true,
      loading: false,
      error: null,
    });
  });

  it('should return no blocking issues for ready project', () => {
    const { result } = renderHook(() => useCachedFeatureGuidance(), {
      wrapper: createWrapper(readyReadiness),
    });

    expect(result.current).toEqual({
      blockingIssues: [],
      nextSteps: ['Project is ready for activation'],
      hasBlockingIssues: false,
      loading: false,
      error: null,
    });
  });

  it('should return loading state', () => {
    const { result } = renderHook(() => useCachedFeatureGuidance(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.hasBlockingIssues).toBe(false);
  });

  it('should handle error state', () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCachedFeatureGuidance(), {
      wrapper: createWrapper(),
    });

    // The error will be set after the fetch fails
    expect(result.current.loading).toBe(true);
  });
});