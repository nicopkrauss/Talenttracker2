# Audit Trail Grouped Parameter Fix

## Issue Identified

The audit trail component was requesting individual field changes (`grouped=false`) but the API was always returning grouped data. This caused:

1. **React Key Errors**: Component expected individual entries with `id` field, but got grouped entries with `change_id`
2. **"Unknown Field" Display**: Component expected `field_name` at root level, but it was nested in `changes` array
3. **Single Entry Display**: API returned 1 grouped entry containing 4 individual changes, instead of 4 separate entries

## Root Cause

The API route's query parameter validation was not properly parsing the string `"false"` to boolean `false`:

```typescript
// BEFORE - didn't properly handle string "false"
grouped: z.coerce.boolean().default(false)

// The z.coerce.boolean() was treating "false" as truthy (non-empty string)
```

## Debug Output Analysis

**What the API was returning (grouped):**
```json
{
  "change_id": "b57da1e7-...",
  "action_type": "rejection_edit", 
  "changes": [
    {
      "id": "f4bea10a-...",
      "field_name": "check_in",
      "old_value": "08:00:00",
      "new_value": "07:00:00"
    }
    // ... 3 more individual changes
  ]
}
```

**What the component expected (individual):**
```json
[
  {
    "id": "f4bea10a-...",
    "field_name": "check_in", 
    "old_value": "08:00:00",
    "new_value": "07:00:00"
  },
  {
    "id": "7d7c88da-...",
    "field_name": "check_in",
    "old_value": "08:00:00", 
    "new_value": "09:00:00"
  }
  // ... more individual entries
]
```

## Fix Applied

### 1. Fixed Query Parameter Parsing (`app/api/timecards/[id]/audit-logs/route.ts`)

```typescript
// AFTER - properly handles both boolean and string values
grouped: z.union([z.boolean(), z.string()]).optional().transform(val => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  return false;
}).default(false)
```

This ensures:
- `grouped=false` (string) → `false` (boolean)
- `grouped=true` (string) → `true` (boolean)  
- `grouped` (boolean) → passes through unchanged
- No parameter → defaults to `false`

### 2. Removed Debug Logging

Cleaned up console logs from both API route and component.

## Expected Result

Now when the component calls:
```
/api/timecards/{id}/audit-logs?grouped=false
```

The API will:
1. ✅ Properly parse `grouped=false` as boolean `false`
2. ✅ Call `auditLogService.getAuditLogs()` (individual entries)
3. ✅ Return array of individual audit log entries
4. ✅ Each entry has `id`, `field_name`, `old_value`, `new_value` at root level

The component will:
1. ✅ Receive 4 individual entries instead of 1 grouped entry
2. ✅ Display each field change as a separate row
3. ✅ Show proper field names ("Check In", "Break End", etc.)
4. ✅ Have unique React keys for each entry
5. ✅ Display old → new value changes correctly

## Files Modified

- `app/api/timecards/[id]/audit-logs/route.ts`: Fixed grouped parameter parsing
- `components/timecards/audit-trail-section.tsx`: Removed debug logging
- `app/(app)/timecards/[id]/page.tsx`: Removed debug component

## Testing

The audit trail should now show:
- ✅ Multiple individual field change entries
- ✅ Proper field names (not "Unknown Field")
- ✅ No React key errors
- ✅ Each rejection edit showing separate rows for each field changed