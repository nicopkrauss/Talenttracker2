import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ProjectInput, ProjectTextarea, ProjectDateInput } from '../project-input'

describe('ProjectInput', () => {
  it('renders basic input correctly', () => {
    render(<ProjectInput placeholder="Test input" data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Test input')
  })

  it('applies error styling when error prop is true', () => {
    render(<ProjectInput error={true} data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveClass('border-destructive')
    expect(input).toHaveClass('focus-visible:ring-destructive')
  })

  it('applies success styling when success prop is true', () => {
    render(<ProjectInput success={true} data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveClass('border-green-600')
    expect(input).toHaveClass('focus-visible:ring-green-600')
    expect(input).toHaveClass('dark:border-green-400')
    expect(input).toHaveClass('dark:focus-visible:ring-green-400')
  })

  it('handles user input correctly', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(
      <ProjectInput 
        onChange={handleChange} 
        data-testid="test-input" 
      />
    )
    
    const input = screen.getByTestId('test-input')
    await user.type(input, 'test value')
    
    expect(input).toHaveValue('test value')
  })

  it('can be disabled', () => {
    render(<ProjectInput disabled data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toBeDisabled()
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<ProjectInput ref={ref} data-testid="test-input" />)
    
    expect(ref.current).toBe(screen.getByTestId('test-input'))
  })
})

describe('ProjectTextarea', () => {
  it('renders textarea correctly', () => {
    render(<ProjectTextarea placeholder="Test textarea" data-testid="test-textarea" />)
    
    const textarea = screen.getByTestId('test-textarea')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea).toHaveAttribute('placeholder', 'Test textarea')
  })

  it('applies error styling when error prop is true', () => {
    render(<ProjectTextarea error={true} data-testid="test-textarea" />)
    
    const textarea = screen.getByTestId('test-textarea')
    expect(textarea).toHaveClass('border-destructive')
    expect(textarea).toHaveClass('focus-visible:ring-destructive')
  })

  it('applies success styling when success prop is true', () => {
    render(<ProjectTextarea success={true} data-testid="test-textarea" />)
    
    const textarea = screen.getByTestId('test-textarea')
    expect(textarea).toHaveClass('border-green-600')
    expect(textarea).toHaveClass('focus-visible:ring-green-600')
    expect(textarea).toHaveClass('dark:border-green-400')
    expect(textarea).toHaveClass('dark:focus-visible:ring-green-400')
  })

  it('handles user input correctly', async () => {
    const user = userEvent.setup()
    
    render(<ProjectTextarea data-testid="test-textarea" />)
    
    const textarea = screen.getByTestId('test-textarea')
    await user.type(textarea, 'multi-line\ntext content')
    
    expect(textarea).toHaveValue('multi-line\ntext content')
  })

  it('respects rows attribute', () => {
    render(<ProjectTextarea rows={5} data-testid="test-textarea" />)
    
    const textarea = screen.getByTestId('test-textarea')
    expect(textarea).toHaveAttribute('rows', '5')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLTextAreaElement>()
    render(<ProjectTextarea ref={ref} data-testid="test-textarea" />)
    
    expect(ref.current).toBe(screen.getByTestId('test-textarea'))
  })
})

describe('ProjectDateInput', () => {
  it('renders date input correctly', () => {
    render(<ProjectDateInput data-testid="test-date-input" />)
    
    const input = screen.getByTestId('test-date-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'date')
  })

  it('applies error styling when error prop is true', () => {
    render(<ProjectDateInput error={true} data-testid="test-date-input" />)
    
    const input = screen.getByTestId('test-date-input')
    expect(input).toHaveClass('border-destructive')
    expect(input).toHaveClass('focus-visible:ring-destructive')
  })

  it('applies success styling when success prop is true', () => {
    render(<ProjectDateInput success={true} data-testid="test-date-input" />)
    
    const input = screen.getByTestId('test-date-input')
    expect(input).toHaveClass('border-green-600')
    expect(input).toHaveClass('focus-visible:ring-green-600')
    expect(input).toHaveClass('dark:border-green-400')
    expect(input).toHaveClass('dark:focus-visible:ring-green-400')
  })

  it('handles date input correctly', async () => {
    const user = userEvent.setup()
    
    render(<ProjectDateInput data-testid="test-date-input" />)
    
    const input = screen.getByTestId('test-date-input')
    await user.type(input, '2024-01-15')
    
    expect(input).toHaveValue('2024-01-15')
  })

  it('can have default value', () => {
    render(<ProjectDateInput defaultValue="2024-01-01" data-testid="test-date-input" />)
    
    const input = screen.getByTestId('test-date-input')
    expect(input).toHaveValue('2024-01-01')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<ProjectDateInput ref={ref} data-testid="test-date-input" />)
    
    expect(ref.current).toBe(screen.getByTestId('test-date-input'))
  })
})