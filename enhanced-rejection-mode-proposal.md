# Enhanced Rejection Mode with Inline Editing

## Overview
Integrate timecard editing capabilities directly into the rejection workflow, allowing admins to flag problematic fields AND optionally correct them before returning the timecard to the user.

## Enhanced User Flow

### Current Flow
1. Enter rejection mode
2. Click fields to flag issues
3. Click "Confirm Rejection"
4. Add rejection reason
5. Submit rejection

### Enhanced Flow
1. Enter rejection mode
2. Click fields to flag issues
3. **[NEW]** Optionally edit flagged field values inline
4. Click "Confirm Rejection" (or "Return with Changes")
5. Add rejection reason/edit explanation
6. Choose action: "Reject Only" or "Edit & Return"

## UI/UX Design

### Field States in Enhanced Rejection Mode
- **Normal Field**: Standard appearance, not clickable
- **Flagged Field**: Red border, clickable to edit
- **Flagged + Edited Field**: Blue border, shows original vs new value
- **Previously Rejected Field**: Orange border (existing behavior)

### Enhanced Rejection Dialog
```
┌─────────────────────────────────────────┐
│ Return Timecard                         │
├─────────────────────────────────────────┤
│ Flagged Fields:                         │
│ [Jan 15 - Check In] [Jan 16 - Break End]│
│                                         │
│ Changes Made:                           │
│ • Jan 15 Check In: 8:00 AM → 8:30 AM   │
│ • Jan 16 Break End: 2:00 PM → 2:30 PM  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Reason/Explanation:                 │ │
│ │ [Text area for admin comments]      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Cancel] [Reject Only] [Edit & Return]  │
└─────────────────────────────────────────┘
```

## Technical Implementation

### 1. Enhanced State Management
```typescript
// Add to existing rejection mode state
const [fieldEdits, setFieldEdits] = useState<Record<string, any>>({})
const [showOriginalValues, setShowOriginalValues] = useState(true)

// Enhanced field interaction
const handleFieldClick = (fieldId: string, currentValue: any) => {
  if (isRejectionMode) {
    // Toggle field selection (existing behavior)
    toggleFieldSelection(fieldId)
    
    // If field is now selected, enable inline editing
    if (!selectedFields.includes(fieldId)) {
      setFieldEdits(prev => ({
        ...prev,
        [fieldId]: currentValue
      }))
    }
  }
}
```

### 2. Inline Editing Components
```typescript
const EditableField = ({ 
  fieldId, 
  value, 
  isSelected, 
  isEdited,
  onValueChange 
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  return (
    <div className={`
      ${isSelected ? 'border-red-500 bg-red-50' : 'border-border'}
      ${isEdited ? 'border-blue-500 bg-blue-50' : ''}
      transition-all cursor-pointer
    `}>
      {isEditing && isSelected ? (
        <input
          type="time"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            setIsEditing(false)
            onValueChange(fieldId, editValue)
          }}
          className="w-full bg-transparent"
          autoFocus
        />
      ) : (
        <div onClick={() => isSelected && setIsEditing(true)}>
          {isEdited && showOriginalValues && (
            <div className="text-xs text-muted-foreground line-through">
              {value}
            </div>
          )}
          <div className={isEdited ? 'font-semibold text-blue-600' : ''}>
            {editValue || value}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 3. Enhanced API Integration
```typescript
// Modify existing reject API to handle edits
const submitRejectionWithEdits = async () => {
  const hasEdits = Object.keys(fieldEdits).length > 0
  
  if (hasEdits) {
    // First apply edits and return to draft
    await fetch('/api/timecards/edit', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: currentTimecard.id,
        updates: fieldEdits,
        editComment: rejectionReason,
        returnToDraft: true
      })
    })
  } else {
    // Standard rejection without edits
    await fetch('/api/timecards/reject', {
      method: 'POST',
      body: JSON.stringify({
        timecardId: currentTimecard.id,
        comments: rejectionReason,
        rejectedFields: selectedFields
      })
    })
  }
}
```

## Benefits of This Approach

### For Admins
- **Efficiency**: Fix obvious errors immediately instead of round-trip communication
- **Context**: See exactly what was wrong and what was corrected
- **Flexibility**: Can choose to just flag issues OR fix them
- **Audit Trail**: Clear record of what was changed and why

### For Users
- **Faster Resolution**: Get corrected timecard back immediately
- **Learning**: See exactly what was wrong and how it was fixed
- **Less Frustration**: Avoid multiple rejection cycles for simple errors

### For System
- **Reduced Cycles**: Fewer back-and-forth submissions
- **Better Data**: More accurate timecards with admin corrections
- **Clear Intent**: Distinction between "needs user attention" vs "admin corrected"

## Implementation Phases

### Phase 1: Basic Integration
- Add edit capability to flagged fields
- Enhance rejection dialog to show changes
- Update API to handle edit+return workflow

### Phase 2: Advanced Features
- Bulk edit capabilities
- Change preview/comparison view
- Keyboard shortcuts for common corrections

### Phase 3: Intelligence
- Suggest corrections based on patterns
- Auto-flag common issues
- Learning from admin corrections

## Alternative: Keep Separate but Enhance

If integration feels too complex, an alternative is to keep separate buttons but enhance the relationship:

```
[Reject] [Edit & Reject] [Approve]
```

Where "Edit & Reject" opens the same field-flagging interface but allows inline editing before returning to draft status.