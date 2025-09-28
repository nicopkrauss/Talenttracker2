# Audit Trail Individual Fields Fix

## Problem
The audit trail was grouping multiple field changes from a single rejection into one entry showing "4 fields on <date>". This made it difficult to see exactly what changes were made to each individual field.

## Solution
Modified the audit trail component to show individual field changes as separate rows instead of grouping them together.

## Changes Made

### 1. Updated AuditTrailSection Component (`components/timecards/audit-trail-section.tsx`)

**Key Changes:**
- Changed from `grouped: 'true'` to `grouped: 'false'` in API calls
- Updated state interface from `GroupedAuditEntry[]` to `AuditLogEntry[]`
- Modified rendering logic to handle individual entries instead of grouped entries
- Simplified the change summary to show individual field names with dates
- Updated pagination limit from 50 to 10 for better performance with individual entries

**Before:**
```typescript
// Fetched grouped entries and showed "4 fields on Jan 15"
const params = new URLSearchParams({
  limit: '50',
  offset: offset.toString(),
  grouped: 'true'
})
```

**After:**
```typescript
// Fetches individual entries and shows each field separately
const params = new URLSearchParams({
  limit: '10',
  offset: offset.toString(),
  grouped: 'false'
})
```

### 2. Updated Test File (`components/timecards/__tests__/audit-trail-components.test.tsx`)

**Key Changes:**
- Removed tests for `AuditLogEntryComponent` and `GroupedAuditEntryComponent` (no longer used)
- Updated all tests to work with the simplified component that loads data immediately
- Removed expand/collapse functionality tests
- Updated test expectations to match actual rendered text
- Fixed skeleton count expectations

## Result

Now when multiple fields are changed in a single rejection, each field change appears as its own separate row in the audit trail:

**Before:**
- "4 fields on Jan 15" (grouped entry)

**After:**
- "Check In Time on Jan 15" (individual entry)
- "Check Out Time on Jan 15" (individual entry)  
- "Break Start Time on Jan 15" (individual entry)
- "Break End Time on Jan 15" (individual entry)

Each row shows:
- The specific field that was changed
- The old value → new value
- The user who made the change
- The timestamp
- The appropriate action type icon (User Edit, Admin Edit, Rejection Edit)

## Benefits

1. **Better Visibility**: Users can see exactly which fields were changed and what the specific changes were
2. **Improved Audit Trail**: Each field change is tracked individually for better compliance
3. **Clearer History**: The change log is more detailed and easier to understand
4. **Better UX**: No need to expand/collapse entries to see details

## Testing

All tests pass, confirming that:
- Individual field changes are displayed correctly
- API calls use the correct parameters (`grouped=false`)
- Loading states work properly
- Error handling functions correctly
- Pagination works with individual entries