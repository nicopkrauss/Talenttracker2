import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from '../protected-route'

// Mock Next.js navigation hooks
const mockPush = vi.fn()
const mockPathname = vi.fn()
const mockSearchParams = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}))

// Mock auth hook
const mockAuth = {
  user: null,
  userProfile: null,
  loading: false,
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => mockAuth,
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/')
    mockSearchParams.mockReturnValue(new URLSearchParams())
    Object.assign(mockAuth, {
      user: null,
      userProfile: null,
      loading: false,
    })
  })

  it('shows loading state when auth is loading', () => {
    mockAuth.loading = true
    
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    )
    
    // Check for the loading spinner
    const loadingSpinner = document.querySelector('.animate-spin')
    expect(loadingSpinner).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('allows access to public routes without authentication', () => {
    mockPathname.mockReturnValue('/login')
    
    render(
      <ProtectedRoute>
        <div>Login page</div>
      </ProtectedRoute>
    )
    
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated users to login', () => {
    mockPathname.mockReturnValue('/dashboard')
    
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    )
    
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/login'))
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users to login with return URL', () => {
    mockPathname.mockReturnValue('/dashboard/settings')
    
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    )
    
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('redirect=%2Fdashboard%2Fsettings'))
  })

  it('redirects users without profile to login', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = null
    mockPathname.mockReturnValue('/dashboard')
    
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    )
    
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('error=no-profile'))
  })

  it('redirects pending users to pending page', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'talent_escort',
      status: 'pending',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/dashboard')
    
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    )
    
    expect(mockPush).toHaveBeenCalledWith('/pending')
  })

  it('allows pending users to access pending page', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'talent_escort',
      status: 'pending',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/pending')
    
    render(
      <ProtectedRoute>
        <div>Pending page</div>
      </ProtectedRoute>
    )
    
    expect(screen.getByText('Pending page')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects rejected users to login', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'talent_escort',
      status: 'rejected',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/dashboard')
    
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    )
    
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('error=account-rejected'))
  })

  it('allows approved users to access protected content', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'talent_escort',
      status: 'approved',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/dashboard')
    
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    )
    
    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('enforces role-based access control', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'talent_escort',
      status: 'approved',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/admin')
    
    render(
      <ProtectedRoute requiredRoles={['admin']}>
        <div>Admin content</div>
      </ProtectedRoute>
    )
    
    expect(mockPush).toHaveBeenCalledWith('/')
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })

  it('allows users with required roles to access content', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      status: 'approved',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/admin')
    
    render(
      <ProtectedRoute requiredRoles={['admin']}>
        <div>Admin content</div>
      </ProtectedRoute>
    )
    
    expect(screen.getByText('Admin content')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('restricts admin routes to admin and in-house users', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'supervisor',
      status: 'approved',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/team')
    
    render(
      <ProtectedRoute>
        <div>Team page</div>
      </ProtectedRoute>
    )
    
    expect(mockPush).toHaveBeenCalledWith('/')
    expect(screen.queryByText('Team page')).not.toBeInTheDocument()
  })

  it('allows admin users to access admin routes', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      status: 'approved',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/team')
    
    render(
      <ProtectedRoute>
        <div>Team page</div>
      </ProtectedRoute>
    )
    
    expect(screen.getByText('Team page')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('allows in-house users to access admin routes', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'in_house',
      status: 'approved',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/team')
    
    render(
      <ProtectedRoute>
        <div>Team page</div>
      </ProtectedRoute>
    )
    
    expect(screen.getByText('Team page')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('handles requireApproved=false for non-approved users', () => {
    mockAuth.user = { id: '1', email: 'test@example.com' }
    mockAuth.userProfile = {
      id: '1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'talent_escort',
      status: 'pending',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }
    mockPathname.mockReturnValue('/special')
    
    render(
      <ProtectedRoute requireApproved={false}>
        <div>Special content</div>
      </ProtectedRoute>
    )
    
    // Should still redirect pending users to pending page
    expect(mockPush).toHaveBeenCalledWith('/pending')
  })
})
