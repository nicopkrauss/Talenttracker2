# Edit & Return Button Consistency Fix

## Problem
When clicking "Edit & Return" on a submitted timecard, the original action buttons (Approve, Reject, Edit & Return) remained visible instead of switching to the standard editing buttons (Cancel, Save) like regular inline editing.

## Solution
Updated the button logic to prioritize the editing state (`isEditing`) over the timecard status, ensuring consistent button behavior across all editing modes.

## Changes Made

### Before (Inconsistent)
```typescript
// Submitted timecard buttons were always shown
{timecard.status === "submitted" && canApprove && (
  // Always showed Approve, Reject, Edit & Return
)}

// Draft editing buttons were separate
{timecard.status === "draft" && isEditing && (
  // Only showed Cancel/Save for draft timecards
)}
```

### After (Consistent)
```typescript
// Editing state takes priority
{isEditing ? (
  // Always show Cancel/Save when editing (any timecard type)
  <Cancel/Save buttons>
) : (
  // Show status-appropriate buttons when not editing
  <Status-based action buttons>
)}
```

## Button States

### Submitted Timecard (Not Editing)
- **Shows**: [Edit & Return] [Reject] [Approve]
- **Behavior**: User can choose their action

### After Clicking "Edit & Return"
- **Shows**: [Cancel] [Save]
- **Behavior**: Standard editing interface
- **Visual**: Yellow "Edit & Return Mode" warning and white dialog button
- **Functionality**: Real-time calculations, inline editing

### Draft Timecard (Not Editing)
- **Shows**: [Edit Times]
- **Behavior**: Single edit button

### After Clicking "Edit Times" (Draft)
- **Shows**: [Cancel] [Save]
- **Behavior**: Standard editing interface
- **Visual**: Yellow "Admin Edit Notice" (if admin)

## Benefits

### 1. Consistent User Experience
- Same button pattern for all editing modes
- No confusion about available actions
- Predictable interface behavior

### 2. Clear State Indication
- Editing mode is visually obvious
- Consistent yellow warnings for all edit types
- Consistent button positioning and styling

### 3. Simplified Logic
- Single condition controls button display
- Easier to maintain and understand
- Reduced complexity in component logic

## User Flow

1. **View submitted timecard** → See action buttons
2. **Click "Edit & Return"** → Enter edit mode immediately
3. **See Cancel/Save buttons** → Standard editing interface
4. **Make changes** → Real-time calculations
5. **Click Save** → Reason dialog opens
6. **Provide reason** → Changes saved, returned to draft

The interface now behaves consistently regardless of how editing mode is entered, providing a much better user experience.