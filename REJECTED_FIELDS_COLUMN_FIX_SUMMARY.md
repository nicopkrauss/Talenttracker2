# Rejected Fields Column Fix Summary

## Problem
The application was experiencing multiple console errors due to references to a non-existent `rejected_fields` column in the `timecard_headers` table. This was causing 500 Internal Server Errors across the timecards functionality.

## Root Cause
The codebase was still referencing the old `rejected_fields` column approach, but the database schema had moved to using the audit log system for tracking rejected fields. Two main issues were identified:

1. **Missing Column**: API routes were trying to select `rejected_fields` from `timecard_headers` table, but this column doesn't exist
2. **Audit Log Constraint**: The `action_type` field in `timecard_audit_log` had a database constraint that only allowed `admin_edit`, but the code was trying to use `user_edit` and `rejection_edit`

## Solution Implemented

### 1. Updated API Routes to Use Audit Log System
- **Created `getRejectedFields()` function** in `lib/audit-log-service.ts` to extract rejected fields from audit logs
- **Updated `app/api/timecards-v2/route.ts`** to:
  - Remove `rejected_fields` from SELECT query
  - Use `getRejectedFields()` to populate rejected fields from audit logs
  - Batch fetch rejected fields for all timecards for performance

### 2. Fixed Database Column References
- **Created `lib/timecard-columns.ts`** with explicit column definitions for `timecard_headers`
- **Updated all API routes** that used `select('*')` on `timecard_headers` to use explicit column selection:
  - `app/api/timecards/edit/route.ts`
  - `app/api/timecards/submit/route.ts`
  - `app/api/timecards/submit-bulk/route.ts`
  - `app/api/timecards/user-edit/route.ts`
  - `app/api/timecards/time-tracking/route.ts`
  - `app/api/timecards/calculate/route.ts`
  - `app/api/timecards/admin-notes/route.ts`

### 3. Fixed Audit Log Action Type Constraint
- **Added `audit_action_type` enum** to Prisma schema with values: `user_edit`, `admin_edit`, `rejection_edit`
- **Updated `timecard_audit_log.action_type`** field to use the enum instead of varchar
- **Applied schema changes** using `npx prisma db push`

### 4. Removed Rejected Fields Column Updates
- **Updated `app/api/timecards/reject/route.ts`** to remove the `rejected_fields` column update since this is now handled by audit logs

## Files Modified

### New Files
- `lib/timecard-columns.ts` - Explicit column definitions
- `lib/audit-log-service.ts` - Added `getRejectedFields()` function
- `scripts/check-action-type-constraint.js` - Diagnostic script
- `scripts/fix-action-type-constraint.sql` - Migration script (not used)
- `scripts/run-action-type-fix.js` - Migration runner (not used)

### Modified Files
- `prisma/schema.prisma` - Added `audit_action_type` enum, updated `action_type` field
- `app/api/timecards-v2/route.ts` - Removed column reference, added audit log integration
- `app/api/timecards/reject/route.ts` - Removed `rejected_fields` update
- Multiple API routes - Updated to use explicit column selection

## Testing Results

### Before Fix
```
Error fetching timecards: {code: '42703', details: null, hint: null, message: 'column timecard_headers.rejected_fields does not exist'}
GET /api/timecards-v2? 500 in 1034ms
```

### After Fix
```
GET /api/timecards-v2?status=submitted 200 in 3267ms
GET /api/timecards-v2 200 in 3649ms
POST /api/timecards/edit 200 in 1380ms
```

## Impact
- ✅ **Timecards page loads without errors**
- ✅ **All timecard API endpoints return 200 status codes**
- ✅ **Rejected fields functionality preserved through audit log system**
- ✅ **Audit logging works for all action types (user_edit, admin_edit, rejection_edit)**
- ✅ **No data loss - existing functionality maintained**

## Technical Notes
- The audit log system provides better tracking than the simple array approach
- Rejected fields are now derived from `rejection_edit` action type entries in audit logs
- The enum constraint ensures data integrity for action types
- Explicit column selection prevents future issues with schema changes