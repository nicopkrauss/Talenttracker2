import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ProjectFormField } from '../project-form-field'
import { ProjectInput, ProjectTextarea, ProjectDateInput } from '../project-input'

// Simple test component that mimics the form structure
function TestProjectForm({ onSubmit, onCancel }: { onSubmit: () => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState({
    name: '',
    start_date: '',
    end_date: '',
    description: ''
  })
  
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    
    if (!formData.name) newErrors.name = 'Project name is required'
    if (!formData.start_date) newErrors.start_date = 'Start date is required'
    if (!formData.end_date) newErrors.end_date = 'End date is required'
    
    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
      newErrors.end_date = 'End date must be after start date'
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit()
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ProjectFormField
        label="Project Name *"
        description="Enter the name of the project"
        error={errors.name}
        required
      >
        <ProjectInput
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Summer Blockbuster 2024"
          error={!!errors.name}
        />
      </ProjectFormField>
      
      <ProjectFormField
        label="Start Date *"
        description="When the project begins"
        error={errors.start_date}
        required
      >
        <ProjectDateInput
          value={formData.start_date}
          onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
          error={!!errors.start_date}
        />
      </ProjectFormField>
      
      <ProjectFormField
        label="End Date *"
        description="When the project ends"
        error={errors.end_date}
        required
      >
        <ProjectDateInput
          value={formData.end_date}
          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
          error={!!errors.end_date}
        />
      </ProjectFormField>
      
      <ProjectFormField
        label="Description"
        description="Brief description of the project"
        error={errors.description}
      >
        <ProjectTextarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter a brief description..."
        />
      </ProjectFormField>
      
      <div className="flex space-x-2">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit">Create Project</button>
      </div>
    </form>
  )
}

// Mock the form submission
const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

describe('ProjectForm Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('renders form with empty fields', () => {
      render(
        <TestProjectForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Project Name *')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g., Summer Blockbuster 2024')).toHaveValue('')
      expect(screen.getByText('Start Date *')).toBeInTheDocument()
      expect(screen.getByText('End Date *')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument()
    })

    it('shows required field indicators', () => {
      render(
        <TestProjectForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Project Name *')).toBeInTheDocument()
      expect(screen.getByText('Start Date *')).toBeInTheDocument()
      expect(screen.getByText('End Date *')).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      
      render(
        <TestProjectForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const submitButton = screen.getByRole('button', { name: /create project/i })
      
      // Try to submit without filling required fields
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeInTheDocument()
        expect(screen.getByText('Start date is required')).toBeInTheDocument()
        expect(screen.getByText('End date is required')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('validates date order (end date after start date)', async () => {
      const user = userEvent.setup()
      
      render(
        <TestProjectForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill in required fields with invalid date order
      await user.type(screen.getByPlaceholderText('e.g., Summer Blockbuster 2024'), 'Test Project')
      
      const startDateInput = screen.getAllByDisplayValue('')[0] // First date input
      const endDateInput = screen.getAllByDisplayValue('')[1] // Second date input
      
      await user.type(startDateInput, '2024-12-31')
      await user.type(endDateInput, '2024-01-01')

      const submitButton = screen.getByRole('button', { name: /create project/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('End date must be after start date')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('submits form with valid data', async () => {
      const user = userEvent.setup()
      
      render(
        <TestProjectForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill in required fields
      await user.type(screen.getByPlaceholderText('e.g., Summer Blockbuster 2024'), 'Test Project')
      
      const dateInputs = screen.getAllByDisplayValue('')
      await user.type(dateInputs[0], '2024-01-01') // Start date
      await user.type(dateInputs[1], '2024-12-31') // End date

      const submitButton = screen.getByRole('button', { name: /create project/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestProjectForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
})