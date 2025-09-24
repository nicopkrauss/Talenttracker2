# Edit & Return Functionality Implementation

## Overview
Replaced the old "Edit & Return" functionality that redirected to a separate `/edit` route with a new inline editing approach that keeps users on the timecard details page.

## Problem Solved
The "Edit & Return" button was still pointing to `/timecards/[id]/edit` route instead of using our new inline editing system. This created inconsistency and confusion in the user experience.

## Changes Made

### 1. Timecard Details Page (`app/(app)/timecards/[id]/page.tsx`)

#### Replaced `handleEdit` Function
**Before:**
```typescript
const handleEdit = () => {
  if (!timecard) return
  router.push(`/timecards/${timecard.id}/edit`)
}
```

**After:**
```typescript
const handleEditAndReturn = async () => {
  if (!timecard || !comments.trim()) return
  
  setActionLoading('edit-return')
  try {
    const response = await fetch('/api/timecards/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timecardId: timecard.id,
        updates: { status: 'draft' },
        adminNote: comments.trim(),
        returnToDraft: true
      }),
    })
    // Handle response and refresh data
  } catch (error) {
    // Error handling
  }
}
```

#### Added Edit & Return Dialog
- New `showEditReturnDialog` state
- Dialog component that explains the action and requires a reason
- Blue-themed dialog to distinguish from other actions
- Clear explanation of what happens when timecard is returned to draft

#### Updated Button Behavior
- "Edit & Return" button now opens dialog instead of navigating
- Added loading state with spinner
- Proper error handling and user feedback

### 2. API Route Updates (`app/api/timecards/edit/route.ts`)

#### Enhanced Schema
```typescript
const editTimecardSchema = z.object({
  // ... existing fields
  updates: z.object({
    // ... existing fields
    status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  }),
  returnToDraft: z.boolean().optional(), // New flag for Edit & Return
})
```

#### Permission Logic Updates
- **Return to Draft**: Only approvers can return submitted timecards to draft
- **Regular Editing**: Only draft timecards can be edited inline
- Clear separation between the two workflows

#### Status Handling
```typescript
if (returnToDraft) {
  updateData.status = 'draft'
  updateData.admin_edited = true
  updateData.last_edited_by = user.id
  updateData.submitted_at = null // Clear submission timestamp
}
```

### 3. Timecard List Component (`components/timecards/timecard-list.tsx`)

#### Updated Edit Button
**Before:**
```typescript
<Link href={`/timecards/${timecard.id}/edit`}>
```

**After:**
```typescript
<Link href={`/timecards/${timecard.id}`}>
```

Now the "Edit" button in the timecard list takes users directly to the details page where they can use inline editing.

## User Experience Flow

### For Approvers (Edit & Return)
1. **View submitted timecard** on details page
2. **Click "Edit & Return"** button (top right of Time Details)
3. **Edit mode activates** with blue warning notice
4. **Make changes** with real-time calculations
5. **Click "Save"** to open changes dialog
6. **Provide reason** and click "Save & Return to Draft"
7. **Timecard status changes** to draft with admin flag

### For Users (Inline Editing)
1. **View draft timecard** on details page
2. **Click "Edit Times"** button (top right of Time Details)
3. **Edit fields inline** with real-time calculations
4. **Click "Save"** and provide edit reason
5. **Changes saved** with proper audit trail

## Benefits

### 1. Consistent User Experience
- All editing happens on the same page
- No confusing navigation between routes
- Clear visual feedback for all actions
- No immediate popups - editing starts right away

### 2. Better Workflow
- "Edit & Return" immediately enters edit mode
- Blue warning clearly explains the mode
- Inline editing provides immediate feedback
- Real-time calculations show impact of changes
- Comment dialog only appears when saving

### 3. Improved Permissions
- Clear separation between return-to-draft and editing
- Proper audit trail for all changes
- Status-based access control

### 4. Simplified Codebase
- Removed dependency on separate edit route
- Consolidated editing logic in one place
- Consistent API patterns

## Technical Implementation

### State Management
- Added `showEditReturnDialog` state
- Proper loading states for all actions
- Error handling with user feedback

### API Design
- `returnToDraft` flag for Edit & Return action
- Enhanced permission checks
- Proper status transitions

### UI Components
- New Edit & Return dialog with clear messaging
- Updated button behaviors and loading states
- Consistent styling with other dialogs

## Testing

### Verified Functionality
- ✅ Edit & Return dialog opens and functions correctly
- ✅ API handles returnToDraft flag properly
- ✅ Permissions work for both workflows
- ✅ Timecard list edit button goes to details page
- ✅ Inline editing still works for draft timecards
- ✅ All loading states and error handling work

### Edge Cases Covered
- Non-approvers cannot return timecards to draft
- Only submitted timecards can be returned to draft
- Only draft timecards can be edited inline
- Proper audit trail for all changes

## Migration Notes

### Deprecated Routes
- `/timecards/[id]/edit` route is no longer used in the UI
- Route still exists for backward compatibility but should be removed in future cleanup

### Database Changes
- No schema changes required
- Existing `admin_edited`, `edit_comments`, and `status` fields handle all functionality

The implementation successfully modernizes the timecard editing experience while maintaining all security and audit requirements.