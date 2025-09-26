# Simplified Enhanced Rejection Mode

## The Problem with Current Implementation
The current implementation is too complex with multiple state layers:
- `isRejectionMode` + `selectedFields` + `isEditMode` + `fieldEdits`
- Complex prop drilling between components
- Conflicting click handlers
- Too many conditional states

## New Simplified Approach

### Single State Model
Instead of separate selection and edit modes, use a single approach:
1. Click "Reject" → Enter rejection mode
2. Click any field → It becomes immediately editable (no selection step)
3. Edited fields are automatically flagged for rejection
4. Click "Apply Changes" → Submit with edits

### State Management
```typescript
// Only these states needed:
const [isRejectionMode, setIsRejectionMode] = useState(false)
const [fieldEdits, setFieldEdits] = useState<Record<string, any>>({})
```

### Field Component Logic
```typescript
const EditableTimeField = ({ fieldId, originalValue, label }) => {
  const [isEditing, setIsEditing] = useState(false)
  const isEdited = fieldEdits[fieldId] !== undefined
  const currentValue = fieldEdits[fieldId] || originalValue

  const handleClick = () => {
    if (isRejectionMode && !isEditing) {
      setIsEditing(true) // Enter edit mode for this field
    }
  }

  const handleBlur = () => {
    setIsEditing(false) // Exit edit mode for this field
  }

  return (
    <div onClick={handleClick}>
      {isEditing ? (
        <Input 
          type="time" 
          value={formatTime(currentValue)}
          onChange={handleEdit}
          onBlur={handleBlur}
          autoFocus 
        />
      ) : (
        <div>
          {isEdited && <div>Original: {formatTime(originalValue)}</div>}
          <div>{formatTime(currentValue)}</div>
          {isRejectionMode && <div>Click to edit</div>}
        </div>
      )}
    </div>
  )
}
```

### Benefits
1. **Much simpler**: No selection step, no complex state management
2. **Intuitive UX**: Click field → edit immediately
3. **Clear visual feedback**: Edited fields are clearly marked
4. **No conflicts**: Single click handler per field
5. **Easier to debug**: Fewer moving parts

### Implementation Steps
1. Simplify approval component state
2. Remove complex button logic
3. Rewrite EditableTimeField with local editing state
4. Update props to only pass necessary data
5. Test the simplified flow

This approach eliminates the complexity that was causing the click handler conflicts.