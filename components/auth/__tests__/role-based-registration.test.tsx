import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegistrationForm } from '../registration-form'
import { vi } from 'vitest'

// Mock the password strength indicator
vi.mock('../password-strength-indicator', () => ({
  PasswordStrengthIndicator: ({ password }: { password: string }) => (
    <div data-testid="password-strength">{password ? 'Strong' : 'Weak'}</div>
  )
}))

// Mock the form error display
vi.mock('../form-error-display', () => ({
  FormErrorDisplay: ({ error }: { error: any }) => (
    error ? <div data-testid="form-error">{error.message}</div> : null
  ),
  parseAuthError: (error: any) => error
}))

describe('Role-Based Registration Form', () => {
  const user = userEvent.setup()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('shows role selection as first field', () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('What position have you been hired for?')).toBeInTheDocument()
    expect(screen.getByText('Select your position')).toBeInTheDocument()
  })

  it('hides other fields until role is selected', () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Should not show other fields initially
    expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Email Address')).not.toBeInTheDocument()
  })

  it('shows all fields after role selection', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Select a role
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Supervisor'))
    
    // Should now show other fields
    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Nearest Major City')).toBeInTheDocument()
    })
  })

  it('shows flight willingness for covered roles', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Select a role that gets flights covered
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Supervisor'))
    
    // Should show flight willingness checkbox
    await waitFor(() => {
      expect(screen.getByText('I am willing to fly for projects (flights covered)')).toBeInTheDocument()
    })
  })

  it('hides flight willingness for talent escort role', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Select talent escort role
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Talent Escort'))
    
    // Should not show flight willingness checkbox
    await waitFor(() => {
      expect(screen.queryByText('I am willing to fly for projects (flights covered)')).not.toBeInTheDocument()
    })
  })

  it('shows major cities dropdown instead of city/state fields', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Select a role first
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Supervisor'))
    
    await waitFor(() => {
      // Should show major city dropdown
      expect(screen.getByLabelText('Nearest Major City')).toBeInTheDocument()
      
      // Should not show old city/state fields
      expect(screen.queryByLabelText('City')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('State')).not.toBeInTheDocument()
    })
  })

  it('submits form with role-based data', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Fill out the form
    const roleSelect = screen.getByRole('combobox')
    await user.click(roleSelect)
    await user.click(screen.getByText('Supervisor'))
    
    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeInTheDocument()
    })
    
    await user.type(screen.getByLabelText('First Name'), 'John')
    await user.type(screen.getByLabelText('Last Name'), 'Doe')
    await user.type(screen.getByLabelText('Email Address'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPass123!')
    await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567')
    
    // Select major city
    const citySelect = screen.getByLabelText('Nearest Major City')
    await user.click(citySelect)
    await user.click(screen.getByText('Los Angeles, CA'))
    
    // Check flight willingness
    await user.click(screen.getByLabelText('I am willing to fly for projects (flights covered)'))
    
    // Agree to terms
    await user.click(screen.getByLabelText(/I agree to the Terms/))
    
    // Submit form
    await user.click(screen.getByText('Create Account'))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        role: 'supervisor',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongPass123!',
        phone: '(555) 123-4567',
        nearestMajorCity: 'Los Angeles, CA',
        willingToFly: true,
        agreeToTerms: true
      })
    })
  })

  it('validates required role selection', async () => {
    render(<RegistrationForm onSubmit={mockOnSubmit} />)
    
    // Try to submit without selecting role (form should be hidden)
    expect(screen.queryByText('Create Account')).not.toBeInTheDocument()
  })
})