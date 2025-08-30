import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegistrationForm } from '../registration-form'

// Mock the password strength indicator
vi.mock('../password-strength-indicator', () => ({
  PasswordStrengthIndicator: ({ password }: { password: string }) => (
    <div data-testid="password-strength">
      Strength: {password.length > 8 ? 'Strong' : 'Weak'}
    </div>
  ),
}))

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

describe('RegistrationForm', () => {
  const mockOnSubmit = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders registration form with all required fields', () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByText('Enter your information to get started with Talent Tracker')).toBeInTheDocument()
    expect(screen.getByLabelText('First Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
    expect(screen.getByLabelText('City')).toBeInTheDocument()
    expect(screen.getByLabelText('State')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('validates first name field correctly', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const firstNameInput = screen.getByLabelText('First Name')
    
    // Test empty field
    await user.click(firstNameInput)
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument()
    })
    
    // Test invalid characters
    await user.type(firstNameInput, 'John123')
    
    await waitFor(() => {
      expect(screen.getByText(/First name can only contain letters/)).toBeInTheDocument()
    })
    
    // Test valid name
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'John')
    
    await waitFor(() => {
      expect(screen.queryByText('First name is required')).not.toBeInTheDocument()
    })
  })

  it('validates email field correctly', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    
    // Test invalid email
    await user.type(emailInput, 'invalid-email')
    await user.tab()
    
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

  it('validates password with strength indicator', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const passwordInput = screen.getByLabelText('Password')
    
    // Test weak password
    await user.type(passwordInput, 'weak')
    
    await waitFor(() => {
      expect(screen.getByTestId('password-strength')).toHaveTextContent('Strength: Weak')
    })
    
    // Test strong password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'StrongPassword123!')
    
    await waitFor(() => {
      expect(screen.getByTestId('password-strength')).toHaveTextContent('Strength: Strong')
    })
  })

  it('validates phone number field correctly', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const phoneInput = screen.getByLabelText('Phone Number')
    
    // Test invalid phone
    await user.type(phoneInput, '123')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid US phone number/)).toBeInTheDocument()
    })
    
    // Test valid phone
    await user.clear(phoneInput)
    await user.type(phoneInput, '(555) 123-4567')
    
    await waitFor(() => {
      expect(screen.queryByText(/Please enter a valid US phone number/)).not.toBeInTheDocument()
    })
  })

  it('validates location fields correctly', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const cityInput = screen.getByLabelText('City')
    const stateInput = screen.getByLabelText('State')
    
    // Test empty city
    await user.click(cityInput)
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText('City is required')).toBeInTheDocument()
    })
    
    // Test empty state
    await user.click(stateInput)
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText('State is required')).toBeInTheDocument()
    })
    
    // Test valid values
    await user.type(cityInput, 'New York')
    await user.type(stateInput, 'NY')
    
    await waitFor(() => {
      expect(screen.queryByText('City is required')).not.toBeInTheDocument()
      expect(screen.queryByText('State is required')).not.toBeInTheDocument()
    })
  })

  it('requires terms agreement', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const checkbox = screen.getByRole('checkbox')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })
    
    // Fill all other fields
    await user.type(screen.getByLabelText('First Name'), 'John')
    await user.type(screen.getByLabelText('Last Name'), 'Doe')
    await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!')
    await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567')
    await user.type(screen.getByLabelText('City'), 'New York')
    await user.type(screen.getByLabelText('State'), 'NY')
    
    // Submit button should be disabled without terms agreement
    expect(submitButton).toBeDisabled()
    
    // Check terms agreement
    await user.click(checkbox)
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('toggles password visibility', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = screen.getByRole('button', { name: 'Show password' })
    
    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    // Click toggle button
    await user.click(toggleButton)
    
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Fill all fields
    await user.type(screen.getByLabelText('First Name'), 'John')
    await user.type(screen.getByLabelText('Last Name'), 'Doe')
    await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!')
    await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567')
    await user.type(screen.getByLabelText('City'), 'New York')
    await user.type(screen.getByLabelText('State'), 'NY')
    await user.click(screen.getByRole('checkbox'))
    
    const submitButton = screen.getByRole('button', { name: 'Create Account' })
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
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

  it('displays loading state during submission', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} isLoading={true} />)
    
    const submitButton = screen.getByRole('button', { name: 'Creating account...' })
    const firstNameInput = screen.getByLabelText('First Name')
    
    expect(submitButton).toBeDisabled()
    expect(firstNameInput).toBeDisabled()
    expect(screen.getByText('Creating account...')).toBeInTheDocument()
  })

  it('displays error messages', () => {
    const error = 'Email already exists'
    render(<RegistrationForm onSubmit={mockOnSubmit} error={error} />)
    
    expect(screen.getByTestId('form-error')).toHaveTextContent('Email already exists')
  })

  it('handles form submission errors', async () => {
    const error = new Error('Network error')
    mockOnSubmit.mockRejectedValue(error)
    
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Fill all fields
    await user.type(screen.getByLabelText('First Name'), 'John')
    await user.type(screen.getByLabelText('Last Name'), 'Doe')
    await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!')
    await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567')
    await user.type(screen.getByLabelText('City'), 'New York')
    await user.type(screen.getByLabelText('State'), 'NY')
    await user.click(screen.getByRole('checkbox'))
    
    const submitButton = screen.getByRole('button', { name: 'Create Account' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent('Network error')
    })
  })

  it('has proper accessibility attributes', () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const phoneInput = screen.getByLabelText('Phone Number')
    const passwordInput = screen.getByLabelText('Password')
    
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(phoneInput).toHaveAttribute('type', 'tel')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('includes links to terms and privacy policy', () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    const termsLink = screen.getByRole('link', { name: 'Terms' })
    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' })
    
    expect(termsLink).toHaveAttribute('href', '/terms')
    expect(privacyLink).toHaveAttribute('href', '/privacy')
    expect(termsLink).toHaveAttribute('target', '_blank')
    expect(privacyLink).toHaveAttribute('target', '_blank')
  })
})