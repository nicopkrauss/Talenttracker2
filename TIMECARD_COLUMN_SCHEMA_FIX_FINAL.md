# Timecard Column Schema Fix - Final

## Issue Identified
The rejection mode was failing with "Timecard not found" because the API was trying to select non-existent columns from the `timecard_headers` table.

## Root Cause
The `TIMECARD_HEADERS_COLUMNS` list included columns that don't exist in the database:
- ❌ `approved_at` - does not exist
- ❌ `approved_by` - does not exist

And was missing a column that DOES exist:
- ✅ `rejected_fields` - exists and should be used

## Database Schema Reality Check
Actual columns in `timecard_headers` table:
```
✅ id, user_id, project_id, status, submitted_at
✅ rejection_reason, rejected_fields, admin_notes
✅ period_start_date, period_end_date
✅ total_hours, total_break_duration, total_pay, pay_rate
✅ manually_edited, edit_comments, admin_edited, last_edited_by, edit_type
✅ created_at, updated_at
```

## Fixes Applied

### 1. Updated `lib/timecard-columns.ts`
```typescript
// REMOVED: 'approved_at', 'approved_by'
// ADDED: 'rejected_fields'
export const TIMECARD_HEADERS_COLUMNS = [
  'id', 'user_id', 'project_id', 'status', 'submitted_at',
  'rejection_reason', 'rejected_fields', 'admin_notes',
  // ... rest of existing columns
]
```

### 2. Restored `rejected_fields` functionality in APIs
- **Edit API**: Restored `updateData.rejected_fields = editedFields`
- **Reject API**: Restored `rejected_fields: rejectedFields || []`
- **Submitted API**: Restored `rejected_fields` in select and response

## Expected Results
Now the rejection mode should work correctly:

1. ✅ **Database queries succeed** - no more missing column errors
2. ✅ **Timecard lookup works** - can find submitted timecards
3. ✅ **Field edits are captured** - time picker values stored properly
4. ✅ **Rejected fields tracked** - which fields were edited during rejection
5. ✅ **Audit logging works** - proper old/new value tracking
6. ✅ **Status updates** - timecard status changes to 'rejected'

## Test the Fix
The rejection mode should now work end-to-end:
1. Enter rejection mode
2. Edit time fields with CustomTimePicker
3. Click "Apply Changes & Return"
4. Timecard should be rejected with proper audit trail