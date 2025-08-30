import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../login-form'
import { FormError } from '../form-error-display'

// Mock the form error display component
vi.mock('../form-error-display', () => ({
  FormErrorDisplay: ({ error, onRetry }: { error: any; onRetry?: () => void }) => (
    <div data-testid="form-error">
      {error?.message}
      {onRetry && <button onClick={onRetry} data-testid="retry-button">Retry</button>}
    </div>
  ),
  parseAuthError: (error: any) => ({
    message: error?.message || 'Unknown error',
    retryable: true,
  }),
}))

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with all required fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Enter your credentials to access Talent Tracker')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText('Create account')).toBeInTheDocument()
  })

  it('validates email field correctly', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    
    // Test invalid email
    await user.type(emailInput, 'invalid-email')
    await user.tab() // Trigger validation
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
    
    // Test valid email
    await user.clear(emailInput)
    await user.type(emailInput, 'test@example.com')
    
    await waitFor(() => {
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
    })
  })

  it('validates password field correctly', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    // Submit button should be disabled when password is empty
    expect(submitButton).toBeDisabled()
    
    // Enter email first (required for form validation)
    await user.type(emailInput, 'test@example.com')
    
    // Enter password
    await user.type(passwordInput, 'password123')
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('toggles password visibility', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const toggleButton = screen.getByRole('button', { name: 'Show password' })
    
    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    // Click toggle button
    await user.click(toggleButton)
    
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
    
    // Click again to hide
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('submits form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('displays loading state during submission', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />)
    
    const submitButton = screen.getByRole('button', { name: 'Signing in...' })
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    
    expect(submitButton).toBeDisabled()
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })

  it('displays error messages', () => {
    const error = 'Invalid credentials'
    render(<LoginForm onSubmit={mockOnSubmit} error={error} />)
    
    expect(screen.getByTestId('form-error')).toHaveTextContent('Invalid credentials')
  })

  it('handles form submission errors', async () => {
    const error = new Error('Network error')
    mockOnSubmit.mockRejectedValue(error)
    
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent('Network error')
    })
  })

  it('prevents submission with invalid form', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    // Try to submit empty form
    await user.click(submitButton)
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
    expect(submitButton).toBeDisabled()
  })

  it('has proper accessibility attributes', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const toggleButton = screen.getByRole('button', { name: 'Show password' })
    
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(toggleButton).toBeInTheDocument()
  })

  it('handles retry functionality', async () => {
    const error: FormError = {
      message: 'Network error',
      retryable: true,
    }
    
    render(<LoginForm onSubmit={mockOnSubmit} error={error} />)
    
    const retryButton = screen.getByTestId('retry-button')
    await user.click(retryButton)
    
    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByTestId('form-error')).not.toHaveTextContent('Network error')
    })
  })
})