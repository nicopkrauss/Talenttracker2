# Project Form Components

This directory contains reusable form components specifically designed for project management functionality.

## Components

### ProjectForm
The main form component for creating and editing projects. Supports both create and edit modes with comprehensive validation.

```tsx
import { ProjectForm } from '@/components/projects'

function CreateProjectPage() {
  const handleSubmit = async (data: ProjectFormData) => {
    // Handle form submission
    console.log('Project data:', data)
  }

  const handleCancel = () => {
    // Handle form cancellation
    router.back()
  }

  return (
    <ProjectForm
      mode="create"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
```

### ProjectFormField
A reusable form field wrapper that provides consistent styling and validation display.

```tsx
import { ProjectFormField, ProjectInput } from '@/components/projects'

function CustomField() {
  return (
    <ProjectFormField
      label="Project Name *"
      description="Enter the name of your project"
      error={error}
      required
    >
      <ProjectInput
        value={value}
        onChange={onChange}
        error={!!error}
        success={!error && value.length > 0}
      />
    </ProjectFormField>
  )
}
```

### Input Components
Enhanced input components with validation styling:

- `ProjectInput` - Text input with error/success states
- `ProjectTextarea` - Textarea with error/success states  
- `ProjectDateInput` - Date input with error/success states

```tsx
import { ProjectInput, ProjectTextarea, ProjectDateInput } from '@/components/projects'

// Basic usage
<ProjectInput 
  value={value}
  onChange={onChange}
  error={hasError}
  success={isValid}
  placeholder="Enter project name"
/>

<ProjectTextarea
  value={description}
  onChange={onChange}
  rows={4}
  placeholder="Enter description"
/>

<ProjectDateInput
  value={date}
  onChange={onChange}
  error={hasDateError}
/>
```

## Features

### Real-time Validation
- Form validation with immediate feedback
- Visual indicators for error and success states
- Date validation ensuring end date is after start date
- Required field validation

### Accessibility
- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### Responsive Design
- Mobile-first approach
- Adapts to different screen sizes
- Touch-friendly interface

### TypeScript Support
- Full TypeScript integration
- Type-safe form data handling
- Comprehensive type definitions

## Validation Rules

### Required Fields
- Project name (1-255 characters)
- Start date (valid date)
- End date (valid date, must be after start date)

### Optional Fields
- Description (max 1000 characters)
- Production company (max 255 characters)
- Hiring contact (max 255 characters)
- Project location (max 255 characters)

## Testing

All components include comprehensive test coverage:

```bash
# Run project component tests
npm test components/projects

# Run specific test file
npm test components/projects/__tests__/project-form.test.tsx
```

## Integration

These components integrate with:
- React Hook Form for form state management
- Zod for validation schemas
- Tailwind CSS for styling
- shadcn/ui for base components