import React from 'react'
import { render, screen } from '@testing-library/react'
import { ProjectFormField } from '../project-form-field'

describe('ProjectFormField', () => {
  it('renders label correctly', () => {
    render(
      <ProjectFormField label="Test Label">
        <input data-testid="test-input" />
      </ProjectFormField>
    )

    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('shows required indicator when required is true', () => {
    render(
      <ProjectFormField label="Required Field" required>
        <input data-testid="test-input" />
      </ProjectFormField>
    )

    const label = screen.getByText('Required Field')
    expect(label).toHaveClass('after:content-[\'*\']')
  })

  it('displays description when provided and no error', () => {
    render(
      <ProjectFormField 
        label="Test Label" 
        description="This is a helpful description"
      >
        <input data-testid="test-input" />
      </ProjectFormField>
    )

    expect(screen.getByText('This is a helpful description')).toBeInTheDocument()
  })

  it('displays error message when error is provided', () => {
    render(
      <ProjectFormField 
        label="Test Label" 
        description="This is a helpful description"
        error="This field has an error"
      >
        <input data-testid="test-input" />
      </ProjectFormField>
    )

    expect(screen.getByText('This field has an error')).toBeInTheDocument()
    // Description should not be shown when there's an error
    expect(screen.queryByText('This is a helpful description')).not.toBeInTheDocument()
  })

  it('applies error styling to label when error is present', () => {
    render(
      <ProjectFormField 
        label="Test Label" 
        error="This field has an error"
      >
        <input data-testid="test-input" />
      </ProjectFormField>
    )

    const label = screen.getByText('Test Label')
    expect(label).toHaveClass('text-destructive')
  })

  it('renders children correctly', () => {
    render(
      <ProjectFormField label="Test Label">
        <input data-testid="test-input" placeholder="Test input" />
      </ProjectFormField>
    )

    expect(screen.getByTestId('test-input')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <ProjectFormField 
        label="Test Label" 
        className="custom-class"
      >
        <input data-testid="test-input" />
      </ProjectFormField>
    )

    const formItem = screen.getByTestId('test-input').closest('.custom-class')
    expect(formItem).toBeInTheDocument()
  })

  it('shows both required indicator and error styling when both are present', () => {
    render(
      <ProjectFormField 
        label="Required Field" 
        required
        error="This field has an error"
      >
        <input data-testid="test-input" />
      </ProjectFormField>
    )

    const label = screen.getByText('Required Field')
    expect(label).toHaveClass('text-destructive')
    expect(label).toHaveClass('after:content-[\'*\']')
    expect(screen.getByText('This field has an error')).toBeInTheDocument()
  })
})