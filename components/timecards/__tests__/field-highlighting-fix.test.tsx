import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SimpleEditableField } from '../simple-editable-field'

describe('SimpleEditableField - Field Highlighting Logic', () => {
  it('should not highlight field when fieldEdits contains original value', () => {
    const originalValue = '2024-01-01T09:00:00.000Z'
    // Field has been "edited" but value matches original
    const fieldEdits = { test_field: '2024-01-01T09:00:00.000Z' }
    
    render(
      <SimpleEditableField
        fieldId="test_field"
        originalValue={originalValue}
        label="Test Field"
        isRejectionMode={true}
        fieldEdits={fieldEdits}
        onFieldEdit={() => {}}
      />
    )

    // Field should not be highlighted since value matches original
    const fieldContainer = screen.getByText('Test Field').nextElementSibling
    expect(fieldContainer).not.toHaveClass('border-blue-500')
    expect(fieldContainer).not.toHaveClass('bg-blue-50')
    
    // Should not show "Modified" indicator
    expect(screen.queryByText('✏️ Modified')).not.toBeInTheDocument()
  })

  it('should highlight field when fieldEdits contains different value', () => {
    const originalValue = '2024-01-01T09:00:00.000Z'
    // Field has been edited with different value
    const fieldEdits = { test_field: '2024-01-01T10:00:00.000Z' }
    
    render(
      <SimpleEditableField
        fieldId="test_field"
        originalValue={originalValue}
        label="Test Field"
        isRejectionMode={true}
        fieldEdits={fieldEdits}
        onFieldEdit={() => {}}
      />
    )

    // Field should be highlighted since value differs from original
    const fieldContainer = screen.getByText('Test Field').nextElementSibling
    expect(fieldContainer).toHaveClass('border-blue-500')
    
    // Should show "Modified" indicator
    expect(screen.getByText('✏️ Modified')).toBeInTheDocument()
  })

  it('should handle null original values correctly', () => {
    const originalValue = null
    // Field edited from null to a value
    const fieldEdits = { test_field: '2024-01-01T09:00:00.000Z' }
    
    render(
      <SimpleEditableField
        fieldId="test_field"
        originalValue={originalValue}
        label="Test Field"
        isRejectionMode={true}
        fieldEdits={fieldEdits}
        onFieldEdit={() => {}}
      />
    )

    // Field should be highlighted since null != time value
    const fieldContainer = screen.getByText('Test Field').nextElementSibling
    expect(fieldContainer).toHaveClass('border-blue-500')
    
    // Should show "Modified" indicator
    expect(screen.getByText('✏️ Modified')).toBeInTheDocument()
  })

  it('should not highlight when both original and edit are null', () => {
    const originalValue = null
    // Field "edited" but still null
    const fieldEdits = { test_field: null }
    
    render(
      <SimpleEditableField
        fieldId="test_field"
        originalValue={originalValue}
        label="Test Field"
        isRejectionMode={true}
        fieldEdits={fieldEdits}
        onFieldEdit={() => {}}
      />
    )

    // Field should not be highlighted since both are null
    const fieldContainer = screen.getByText('Test Field').nextElementSibling
    expect(fieldContainer).not.toHaveClass('border-blue-500')
    expect(fieldContainer).not.toHaveClass('bg-blue-50')
    
    // Should not show "Modified" indicator
    expect(screen.queryByText('✏️ Modified')).not.toBeInTheDocument()
  })

  it('should not highlight when field is not in fieldEdits', () => {
    const originalValue = '2024-01-01T09:00:00.000Z'
    const fieldEdits = {} // No edits
    
    render(
      <SimpleEditableField
        fieldId="test_field"
        originalValue={originalValue}
        label="Test Field"
        isRejectionMode={true}
        fieldEdits={fieldEdits}
        onFieldEdit={() => {}}
      />
    )

    // Field should not be highlighted
    const fieldContainer = screen.getByText('Test Field').nextElementSibling
    expect(fieldContainer).not.toHaveClass('border-blue-500')
    expect(fieldContainer).not.toHaveClass('bg-blue-50')
    
    // Should show "Tap to edit" instead of "Modified"
    expect(screen.getByText('Tap to edit')).toBeInTheDocument()
    expect(screen.queryByText('✏️ Modified')).not.toBeInTheDocument()
  })
})