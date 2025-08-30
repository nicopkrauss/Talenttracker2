import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectHub } from '../project-hub'
import { useAuth } from '@/lib/auth-context'

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn()

describe('ProjectHub Authentication Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockClear()
  })

  it('should not make API calls when user is not authenticated', async () => {
    // Mock unauthenticated state
    ;(useAuth as any).mockReturnValue({
      isAuthenticated: false,
      user: null,
      userProfile: null,
      loading: false
    })

    render(
      <ProjectHub 
        userRole="admin"
        onCreateProject={() => {}}
        onViewProject={() => {}}
        onEditProject={() => {}}
        onActivateProject={() => {}}
        onArchiveProject={() => {}}
        onViewTimecard={() => {}}
      />
    )

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Please sign in to view projects.')).toBeInTheDocument()
    })

    // Verify that no API calls were made
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should make API calls when user is authenticated', async () => {
    // Mock authenticated state
    ;(useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-123' },
      userProfile: { role: 'admin' },
      loading: false
    })

    // Mock successful API response
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        user_role: 'admin',
        total_count: 0
      })
    })

    render(
      <ProjectHub 
        userRole="admin"
        onCreateProject={() => {}}
        onViewProject={() => {}}
        onEditProject={() => {}}
        onActivateProject={() => {}}
        onArchiveProject={() => {}}
        onViewTimecard={() => {}}
      />
    )

    // Wait for API call to be made
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })
  })

  it('should handle authentication state changes properly', async () => {
    let authState = {
      isAuthenticated: false,
      user: null,
      userProfile: null,
      loading: false
    }

    // Mock auth hook that can be updated
    ;(useAuth as any).mockImplementation(() => authState)

    const { rerender } = render(
      <ProjectHub 
        userRole="admin"
        onCreateProject={() => {}}
        onViewProject={() => {}}
        onEditProject={() => {}}
        onActivateProject={() => {}}
        onArchiveProject={() => {}}
        onViewTimecard={() => {}}
      />
    )

    // Initially not authenticated - no API calls
    expect(fetch).not.toHaveBeenCalled()

    // Mock successful API response for when user becomes authenticated
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        user_role: 'admin',
        total_count: 0
      })
    })

    // Update auth state to authenticated
    authState = {
      isAuthenticated: true,
      user: { id: 'user-123' },
      userProfile: { role: 'admin' },
      loading: false
    }

    // Re-render with new auth state
    rerender(
      <ProjectHub 
        userRole="admin"
        onCreateProject={() => {}}
        onViewProject={() => {}}
        onEditProject={() => {}}
        onActivateProject={() => {}}
        onArchiveProject={() => {}}
        onViewTimecard={() => {}}
      />
    )

    // Now API call should be made
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })
  })
})