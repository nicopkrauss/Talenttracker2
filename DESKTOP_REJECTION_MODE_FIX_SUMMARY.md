# Desktop Rejection Mode Fix Summary

## Issues Fixed

The desktop version of the approve tab had several issues with rejection mode:

1. **Edits were not being applied** - When using the edit feature in rejection mode, the time changes were not being saved
2. **Status was not being set to rejected** - Timecards with edits were being returned to draft status instead of rejected
3. **Rejected fields were not being tracked** - The system wasn't storing which fields were flagged during rejection

## Root Cause

The main issue was in the `submitRejection` function in `components/timecards/project-timecard-approval.tsx`. When there were edits, it was calling the edit API with `returnToDraft: true`, which:

- Set the timecard status to 'draft' instead of 'rejected'
- Didn't properly flag the timecard as rejected
- Lost the rejection context

## Fixes Implemented

### 1. Database Schema Update
- Added `rejected_fields` column to `timecard_headers` table
- Column type: `String[]` (array of field names)
- Default value: empty array `[]`

### 2. Frontend Component Fix (`project-timecard-approval.tsx`)
```typescript
// OLD CODE (incorrect)
if (hasEdits) {
  const response = await fetch('/api/timecards/edit', {
    body: JSON.stringify({
      timecardId: currentTimecard.id,
      updates: fieldEdits,
      editComment: rejectionReason.trim(),
      returnToDraft: true, // ❌ This was wrong - sets status to draft
    }),
  })
}

// NEW CODE (correct)
if (hasEdits) {
  const response = await fetch('/api/timecards/edit', {
    body: JSON.stringify({
      timecardId: currentTimecard.id,
      updates: {
        ...fieldEdits,
        status: 'rejected' // ✅ Explicitly set status to rejected
      },
      editComment: rejectionReason.trim(),
      adminNote: `Rejected with edits to: ${rejectedFields.map(field => getFieldDisplayName(field)).join(', ')}`,
      returnToDraft: false, // ✅ Don't return to draft, we want to reject
    }),
  })
}
```

### 3. Edit API Enhancement (`app/api/timecards/edit/route.ts`)

#### Permission Updates
- Allow editing submitted timecards when `updates.status === 'rejected'`
- Only approvers can perform rejection edits on submitted timecards

#### Rejection Edit Handling
```typescript
// Handle rejection edits
if (updates.status === 'rejected') {
  updateData.admin_edited = true
  updateData.last_edited_by = user.id
  updateData.edit_type = 'rejection_edit'
  
  // Store rejection reason in the rejection_reason field
  if (editComment) {
    updateData.rejection_reason = editComment
  }
  
  // Store rejected fields (fields that were edited)
  const editedFields = Object.keys(updates).filter(key => key !== 'status')
  if (editedFields.length > 0) {
    updateData.rejected_fields = editedFields
  }
  
  // Store admin notes separately
  if (adminNote && canApprove) {
    updateData.admin_notes = adminNote
  }
}
```

#### Audit Logging Updates
- Properly classify rejection edits as `actionType: 'rejection_edit'`
- Distinguish between regular admin edits and rejection edits

### 4. Rejection API Enhancement (`app/api/timecards/reject/route.ts`)
- Updated to store `rejected_fields` array when rejecting without edits
- Maintains backward compatibility for standard rejections

## Testing Verification

Created and ran comprehensive tests to verify:
- ✅ `rejected_fields` column exists and can be queried/updated
- ✅ Edit API accepts rejection edits with `status: 'rejected'`
- ✅ Rejection API stores `rejected_fields` properly
- ✅ Database schema changes applied successfully

## Workflow Now Works As Expected

### Rejection Mode with Edits:
1. User enters rejection mode and edits fields (e.g., changes total_hours from 8.0 to 7.5)
2. User provides rejection reason
3. System calls edit API with:
   - `updates: { total_hours: 7.5, status: 'rejected' }`
   - `editComment: rejectionReason`
   - `adminNote: "Rejected with edits to: Total Hours"`
4. Timecard status is set to 'rejected' (not draft)
5. Edited values are saved
6. `rejected_fields: ['total_hours']` is stored
7. Audit log records `actionType: 'rejection_edit'`

### Rejection Mode without Edits:
1. User clicks reject without editing fields
2. System calls rejection API with rejection reason
3. Status set to 'rejected'
4. `rejected_fields: []` (empty array)

## Files Modified

1. `prisma/schema.prisma` - Added `rejected_fields` column
2. `components/timecards/project-timecard-approval.tsx` - Fixed rejection logic
3. `app/api/timecards/edit/route.ts` - Enhanced to handle rejection edits
4. `app/api/timecards/reject/route.ts` - Added rejected_fields support
5. `scripts/run-rejected-fields-migration.js` - Migration verification script

## Impact

- ✅ Desktop rejection mode now properly applies edits
- ✅ Timecards are correctly flagged as rejected (not draft)
- ✅ Rejected fields are tracked for audit purposes
- ✅ Maintains full audit trail for rejection edits
- ✅ Backward compatible with existing rejection workflows