import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockPathname = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname(),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase,
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Import components after mocks
import { LoginForm } from '../login-form'
import { RegistrationForm } from '../registration-form'
import { ProtectedRoute } from '../protected-route'
import { PendingApprovalPage } from '../pending-approval-page'

// Mock auth context
const mockAuthContext = {
  user: null,
  userProfile: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => mockAuthContext,
}))

describe('Authentication Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/')
    Object.assign(mockAuthContext, {
      user: null,
      userProfile: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    })
  })

  describe('Complete Registration Flow', () => {
    it('handles successful registration workflow', async () => {
      mockAuthContext.signUp.mockResolvedValue(undefined)
      
      render(<RegistrationForm onSubmit={mockAuthContext.signUp} />)
      
      // Fill out registration form
      await user.type(screen.getByLabelText('First Name'), 'John')
      await user.type(screen.getByLabelText('Last Name'), 'Doe')
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
      await user.type(screen.getByLabelText('Password'), 'StrongPassword123!')
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567')
      await user.type(screen.getByLabelText('City'), 'New York')
      await user.type(screen.getByLabelText('State'), 'NY')
      await user.click(screen.getByRole('checkbox'))
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockAuthContext.signUp).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'StrongPassword123!',
          phone: '(555) 123-4567',
          city: 'New York',
          state: 'NY',
          agreeToTerms: true,
        })
      })
    })

    it('handles registration errors gracefully', async () => {
      const error = new Error('Email already exists')
      mockAuthContext.signUp.mockRejectedValue(error)
      
      render(<RegistrationForm onSubmit={mockAuthContext.signUp} />)
      
      // Fill out form and submit
      await user.type(screen.getByLabelText('First Name'), 'John')
      await user.type(screen.getByLabelText('Last Name'), 'Doe')
      await user.type(screen.getByLabelText('Email Address'), 'existing@example.com')
      await user.type(screen.getByLabelText('Password'), 'StrongPassword123!')
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567')
      await user.type(screen.getByLabelText('City'), 'New York')
      await user.type(screen.getByLabelText('State'), 'NY')
      await user.click(screen.getByRole('checkbox'))
      
      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
      })
    })
  })

  describe('Complete Login Flow', () => {
    it('handles successful login workflow', async () => {
      mockAuthContext.signIn.mockResolvedValue(undefined)
      
      render(<LoginForm onSubmit={mockAuthContext.signIn} />)
      
      // Fill out login form
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockAuthContext.signIn).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
        })
      })
    })

    it('handles login errors gracefully', async () => {
      const error = new Error('Invalid credentials')
      mockAuthContext.signIn.mockRejectedValue(error)
      
      render(<LoginForm onSubmit={mockAuthContext.signIn} />)
      
      // Fill out form and submit
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword')
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })
  })

  describe('Route Protection Integration', () => {
    it('redirects unauthenticated users through complete flow', async () => {
      mockPathname.mockReturnValue('/dashboard')
      
      render(
        <ProtectedRoute>
          <div>Protected Dashboard</div>
        </ProtectedRoute>
      )
      
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/login'))
      expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument()
    })

    it('handles pending user workflow', async () => {
      mockAuthContext.user = { id: '1', email: 'john@example.com' }
      mockAuthContext.userProfile = {
        id: '1',
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'talent_escort',
        status: 'pending',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      mockPathname.mockReturnValue('/dashboard')
      
      render(
        <ProtectedRoute>
          <div>Protected Dashboard</div>
        </ProtectedRoute>
      )
      
      expect(mockPush).toHaveBeenCalledWith('/pending')
    })

    it('allows approved users to access protected content', () => {
      mockAuthContext.user = { id: '1', email: 'john@example.com' }
      mockAuthContext.userProfile = {
        id: '1',
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'talent_escort',
        status: 'approved',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      mockPathname.mockReturnValue('/dashboard')
      
      render(
        <ProtectedRoute>
          <div>Protected Dashboard</div>
        </ProtectedRoute>
      )
      
      expect(screen.getByText('Protected Dashboard')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Pending Approval Integration', () => {
    it('handles complete pending approval workflow', async () => {
      mockAuthContext.signOut.mockResolvedValue(undefined)
      
      render(<PendingApprovalPage />)
      
      expect(screen.getByText('Account Pending')).toBeInTheDocument()
      expect(screen.getByText(/Your account has been created and is awaiting approval/)).toBeInTheDocument()
      
      // Test sign out functionality
      const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
      await user.click(signOutButton)
      
      expect(mockAuthContext.signOut).toHaveBeenCalled()
    })
  })

  describe('Form Validation Integration', () => {
    it('validates complete registration form workflow', async () => {
      render(<RegistrationForm onSubmit={mockAuthContext.signUp} />)
      
      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      
      // Initially disabled
      expect(submitButton).toBeDisabled()
      
      // Fill required fields one by one
      await user.type(screen.getByLabelText('First Name'), 'John')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Last Name'), 'Doe')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Password'), 'StrongPassword123!')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('City'), 'New York')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('State'), 'NY')
      expect(submitButton).toBeDisabled()
      
      // Finally check terms
      await user.click(screen.getByRole('checkbox'))
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('validates login form workflow', async () => {
      render(<LoginForm onSubmit={mockAuthContext.signIn} />)
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      
      // Initially disabled
      expect(submitButton).toBeDisabled()
      
      // Add email
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
      expect(submitButton).toBeDisabled()
      
      // Add password
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Error Recovery Integration', () => {
    it('handles network errors with retry functionality', async () => {
      let callCount = 0
      mockAuthContext.signIn.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve()
      })
      
      render(<LoginForm onSubmit={mockAuthContext.signIn} />)
      
      // Fill and submit form
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      await user.click(submitButton)
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
      
      // Retry should work
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockAuthContext.signIn).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Accessibility Integration', () => {
    it('maintains proper focus management in forms', async () => {
      render(<LoginForm onSubmit={mockAuthContext.signIn} />)
      
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      
      // Tab navigation should work
      emailInput.focus()
      expect(document.activeElement).toBe(emailInput)
      
      await user.tab()
      expect(document.activeElement).toBe(passwordInput)
    })

    it('provides proper screen reader support', () => {
      render(<RegistrationForm onSubmit={mockAuthContext.signUp} />)
      
      // Check for proper labels
      expect(screen.getByLabelText('First Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
      
      // Check for proper form structure
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    })
  })
})
