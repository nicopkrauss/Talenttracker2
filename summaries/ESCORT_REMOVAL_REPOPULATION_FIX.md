# Escort Removal and Repopulation Fix

## Problem Description

In the assignment interface, when an escort was assigned to talent and then removed, they would not repopulate in the assignment dropdown menu. This meant that once an escort was removed from an assignment, they would disappear from the available options, making it impossible to reassign them without refreshing the page.

## Root Cause

The issue was in the optimistic update logic in `components/projects/tabs/assignments-tab.tsx`. The code properly handled the case when assigning an escort (moving them from "available" to "current_day_assigned" section), but it did not handle the reverse case when removing an escort (moving them back from "current_day_assigned" to "available" section).

### Original Problematic Code

```typescript
// Update available escorts status optimistically
if (normalizedEscortId) {
  setAvailableEscorts(prevEscorts =>
    prevEscorts.map(escort =>
      escort.escortId === normalizedEscortId
        ? {
            ...escort,
            section: 'current_day_assigned' as const,
            currentAssignment: {
              talentName: scheduledTalent.find(t => t.talentId === talentId)?.talentName || 'Unknown',
              date: selectedDate
            }
          }
        : escort
    )
  )
}
```

This code only executed when `normalizedEscortId` was truthy (when assigning), but did nothing when `escortId` was null (when removing).

## Solution

The fix involved updating the optimistic update logic to handle both assignment and removal cases:

### Fixed Code

```typescript
// Update available escorts status optimistically
setAvailableEscorts(prevEscorts => {
  return prevEscorts.map(escort => {
    // If we're assigning this escort, mark them as current_day_assigned
    if (normalizedEscortId && escort.escortId === normalizedEscortId) {
      return {
        ...escort,
        section: 'current_day_assigned' as const,
        currentAssignment: {
          talentName: scheduledTalent.find(t => t.talentId === talentId)?.talentName || 'Unknown',
          date: selectedDate
        }
      }
    }
    
    // If we're removing an escort (escortId is null), check if this escort was previously assigned to this talent
    if (!normalizedEscortId) {
      const currentTalent = scheduledTalent.find(t => t.talentId === talentId)
      if (currentTalent?.escortId === escort.escortId && escort.section === 'current_day_assigned') {
        // Check if this escort has any other assignments on this date
        const hasOtherAssignments = scheduledTalent.some(t => 
          t.talentId !== talentId && t.escortId === escort.escortId
        )
        
        if (!hasOtherAssignments) {
          // Move escort back to available section
          return {
            ...escort,
            section: 'available' as const,
            currentAssignment: undefined
          }
        }
      }
    }
    
    return escort
  })
})
```

## Changes Made

### 1. Single Assignment Handler (`handleAssignmentChange`)

- Added logic to detect when an escort is being removed (`!normalizedEscortId`)
- When removing, find the previously assigned escort and check if they have other assignments
- If no other assignments exist, move the escort back to the "available" section
- Clear the `currentAssignment` field

### 2. Multi-Dropdown Assignment Handler (`handleMultiDropdownChange`)

- Applied the same fix for multi-escort assignments
- Added more complex logic to check for other assignments within the same talent's multiple dropdowns
- Ensures escorts are only moved back to "available" if they have no assignments anywhere

### Key Logic Points

1. **Assignment Detection**: Check if `normalizedEscortId` is truthy (assignment) or falsy (removal)
2. **Previous Assignment Lookup**: Find which escort was previously assigned to the talent being modified
3. **Conflict Detection**: Check if the escort has other assignments that would keep them in "current_day_assigned"
4. **State Update**: Only move escort to "available" if they have no other assignments

## Files Modified

- `components/projects/tabs/assignments-tab.tsx` - Fixed optimistic update logic in both `handleAssignmentChange` and `handleMultiDropdownChange` functions

## Testing

### Manual Testing Scenarios

1. **Basic Assignment/Removal**:
   - Assign an available escort to talent
   - Verify escort moves to "current_day_assigned" section
   - Remove the escort assignment
   - Verify escort returns to "available" section

2. **Multiple Assignments**:
   - Assign same escort to multiple talent
   - Remove one assignment
   - Verify escort stays in "current_day_assigned" (due to other assignment)
   - Remove all assignments
   - Verify escort returns to "available"

3. **Multi-Dropdown Scenarios**:
   - Assign escort to talent with multiple escort dropdowns
   - Remove from one dropdown
   - Verify escort behavior based on remaining assignments

### UI Simulation Test

Created `scripts/test-ui-escort-removal.js` which simulates the UI behavior and confirms the fix works correctly:

```bash
node scripts/test-ui-escort-removal.js
```

Results show:
- ✅ Escorts correctly marked as assigned when assigned
- ✅ Escorts correctly returned to available section when removed
- ✅ Optimistic UI updates work for both assignment and removal

## Impact

This fix ensures that:

1. **User Experience**: Escorts can be reassigned after being removed without page refresh
2. **Data Consistency**: The UI state properly reflects the actual assignment state
3. **Workflow Efficiency**: Assignment managers can quickly reassign escorts as needed
4. **No Side Effects**: The fix only affects the specific escort being removed and doesn't impact other assignments

## Verification

The fix has been tested with:
- ✅ UI simulation showing correct state transitions
- ✅ Logic verification for edge cases (multiple assignments, multi-dropdowns)
- ✅ No regression in existing assignment functionality

The escort removal and repopulation issue is now resolved, and escorts will properly appear in the assignment dropdown after being removed from talent assignments.