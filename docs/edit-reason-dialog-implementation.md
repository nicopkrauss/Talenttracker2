# Edit Reason Dialog Implementation

## Overview

This implementation adds a required edit reason dialog when saving timecard changes and consolidates the `admin_edit_reason` and `edit_comments` fields into a single, consistent system.

## Key Changes

### 1. Edit Reason Dialog

**New Dialog Flow:**
- When user clicks "Save" after editing times, a dialog appears
- User must provide a reason for the changes before saving
- Dialog shows a summary of the calculated changes
- Save button is disabled until reason is provided

**Dialog Features:**
- **Required Reason Field**: Text area for explaining changes
- **Change Summary**: Shows calculated total hours, break duration, and total pay
- **Validation**: Cannot save without providing a reason
- **Cancel Option**: Can cancel and return to editing

### 2. Consolidated Edit Comments

**Database Strategy:**
- **Primary Field**: `edit_comments` - used for all edit reasons (user and admin)
- **Backward Compatibility**: `admin_edit_reason` - still populated for admin edits
- **Display Logic**: Shows `edit_comments` first, falls back to `admin_edit_reason`

**Benefits:**
- Single source of truth for edit reasons
- Consistent audit trail across all edits
- Maintains backward compatibility with existing data
- Simplified display logic

### 3. Updated User Interface

**Edit Comments Display:**
- Consolidated into single card for all edited timecards
- Shows appropriate title based on edit type (admin vs user)
- Displays edit reason with timestamp
- Consistent styling across draft and submitted timecards

**Visual Improvements:**
- Clear distinction between admin and user edits
- Consistent iconography and color coding
- Better information hierarchy

## Technical Implementation

### Frontend Changes (`app/(app)/timecards/[id]/page.tsx`)

#### New State Management
```typescript
const [showEditReasonDialog, setShowEditReasonDialog] = useState(false)
const [editReason, setEditReason] = useState("")
```

#### Updated Save Flow
```typescript
// Original save function now shows dialog
const saveChanges = () => {
  setShowEditReasonDialog(true)
}

// New function handles actual saving with reason
const saveChangesWithReason = async () => {
  // Save with edit reason
  const response = await fetch('/api/timecards/edit', {
    method: 'POST',
    body: JSON.stringify({
      timecardId: timecard.id,
      updates: { /* timecard updates */ },
      adminNote: editReason.trim()
    })
  })
}
```

#### Edit Reason Dialog Component
```typescript
<Dialog open={showEditReasonDialog} onOpenChange={setShowEditReasonDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Save Timecard Changes</DialogTitle>
      <DialogDescription>
        Please provide a reason for these changes...
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      <Textarea
        value={editReason}
        onChange={(e) => setEditReason(e.target.value)}
        placeholder="Explain why these changes were made..."
        required
      />
      
      {/* Change Summary */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <p>Changes Summary:</p>
        <p>Total Hours: {calculatedValues.total_hours.toFixed(1)} • 
           Break: {Math.round(calculatedValues.break_duration)} min • 
           Total Pay: ${calculatedValues.total_pay.toFixed(2)}</p>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setShowEditReasonDialog(false)}>
        Cancel
      </Button>
      <Button 
        onClick={saveChangesWithReason}
        disabled={!editReason.trim()}
      >
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Backend Changes (`app/api/timecards/edit/route.ts`)

#### Consolidated Field Handling
```typescript
// Add edit comments for all edits (both user and admin)
if (adminNote) {
  updateData.edit_comments = adminNote
}

// If admin is editing someone else's timecard, mark as admin edited
if (!isOwner && canApprove) {
  updateData.admin_edited = true
  updateData.admin_edit_reason = adminNote || 'Admin inline edit' // Backward compatibility
  updateData.last_edited_by = user.id
}
```

#### Updated Display Logic
```typescript
// Consolidated display - shows edit_comments first, falls back to admin_edit_reason
{(timecard.edit_comments || timecard.admin_edit_reason) && (
  <Card>
    <CardHeader>
      <CardTitle>
        {timecard.admin_edited ? 'Edit History' : 'Edit Comments'}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p>{timecard.edit_comments || timecard.admin_edit_reason}</p>
    </CardContent>
  </Card>
)}
```

## User Experience Flow

### For Regular Users
1. **Edit Times**: Click "Edit Times" button in Time Details section
2. **Modify Fields**: Change check-in, break, or check-out times
3. **Real-time Feedback**: See calculations update immediately
4. **Save**: Click "Save" button
5. **Provide Reason**: Edit reason dialog appears
6. **Enter Reason**: Type explanation (e.g., "Corrected check-in time")
7. **Confirm**: Click "Save Changes" to complete

### For Administrators
1. **Same Flow**: Identical process for inline editing
2. **Admin Flagging**: Edits are automatically marked as admin edits
3. **Audit Trail**: Both `edit_comments` and `admin_edit_reason` are populated
4. **User Notification**: User sees admin edit flag and reason

## Benefits

### 1. **Transparency**
- All timecard edits require documented reasons
- Clear audit trail for compliance and review
- Users understand why changes were made

### 2. **Consistency**
- Single field (`edit_comments`) for all edit reasons
- Consistent display across different edit types
- Unified user experience for all editing scenarios

### 3. **Accountability**
- Required reason prevents accidental or undocumented changes
- Clear distinction between user and admin edits
- Proper tracking of who made changes and when

### 4. **User Experience**
- Intuitive dialog flow with clear expectations
- Real-time change summary helps users understand impact
- Cancel option allows users to reconsider changes

## Migration Strategy

### Backward Compatibility
- Existing `admin_edit_reason` data is preserved
- Display logic checks both fields for maximum compatibility
- New edits populate both fields for transition period

### Data Consolidation (Future)
```sql
-- Future migration to consolidate fields
UPDATE timecards 
SET edit_comments = admin_edit_reason 
WHERE edit_comments IS NULL 
  AND admin_edit_reason IS NOT NULL;
```

### Cleanup (After Transition)
- Once all systems use `edit_comments`, `admin_edit_reason` can be deprecated
- Display logic can be simplified to only check `edit_comments`
- Database column can eventually be removed if desired

## Testing Checklist

### Manual Testing
- [ ] Edit reason dialog appears when saving changes
- [ ] Dialog shows correct change summary
- [ ] Save button disabled without reason
- [ ] Cancel button works correctly
- [ ] Edit reason is saved and displayed properly
- [ ] Admin edits are properly flagged
- [ ] Backward compatibility with existing data

### Edge Cases
- [ ] Empty reason field validation
- [ ] Very long reason text handling
- [ ] Network errors during save
- [ ] Concurrent edit scenarios
- [ ] Different user roles and permissions

### Browser Compatibility
- [ ] Dialog displays correctly on mobile
- [ ] Textarea resizes appropriately
- [ ] Touch interactions work properly
- [ ] Keyboard navigation functions

## Future Enhancements

### Potential Improvements
1. **Reason Templates**: Pre-defined common reasons for quick selection
2. **Edit History**: Full history of all changes with timestamps
3. **Approval Comments**: Link edit reasons to approval/rejection comments
4. **Bulk Editing**: Apply same reason to multiple timecard edits
5. **Rich Text**: Support for formatted edit reasons with links/references

### Integration Opportunities
1. **Notification System**: Include edit reasons in change notifications
2. **Reporting**: Analytics on common edit reasons and patterns
3. **Audit Logs**: Enhanced audit trail with detailed change tracking
4. **Mobile App**: Native mobile support for edit reason dialogs