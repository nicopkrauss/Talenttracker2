# Desktop Rejection Mode Audit Logging Fix Summary

## Problem
The desktop version of the approve tab rejection mode was not properly recording audit logs according to the specified requirements:

- **change_id** should be a unique ID for the interaction (same for all fields changed in one rejection)
- **field_name** should be one of: `check_in`, `break_start`, `break_end`, `check_out`
- **old_value** should be the current value from timecard daily entries
- **new_value** should be the modified value from user input
- **changed_by** should be the ID of the person who made the change
- **changed_at** should be the timestamp when the change occurred
- **action_type** should be `rejection_edit`
- **work_date** should be the day that had its field changed

## Root Cause
The desktop rejection mode sends field edits in a different format than the mobile version:

- **Desktop format**: Field IDs like `check_in_time_day_0`, `break_start_time_day_1` in the `updates` object
- **Mobile format**: Day-based updates in the `dailyUpdates` object with keys like `day_0`, `day_1`

The API was only handling the mobile format, so desktop rejection edits weren't creating proper audit log entries.

## Solution

### 1. Updated API Route (`app/api/timecards/edit/route.ts`)

Enhanced the rejection edit handling to support both desktop and mobile formats:

```typescript
// Handle both desktop and mobile rejection formats
const auditEntries: any[] = []

// Check if we have desktop format (field IDs like "check_in_time_day_0") in updates
const desktopFieldUpdates: Record<string, any> = {}
const timeFieldPattern = /^(check_in_time|break_start_time|break_end_time|check_out_time)_day_(\d+)$/

for (const [key, value] of Object.entries(updates)) {
  const match = key.match(timeFieldPattern)
  if (match) {
    const [, fieldType, dayIndex] = match
    desktopFieldUpdates[key] = { fieldType, dayIndex: parseInt(dayIndex), value }
  }
}

// Process desktop format updates
if (Object.keys(desktopFieldUpdates).length > 0) {
  // Group by day index and process each day's updates
  // Create audit entries with proper field name mapping
  // Update daily entries with converted time values
}

// Process mobile format updates (existing logic)
if (dailyUpdates && Object.keys(dailyUpdates).length > 0) {
  // Existing mobile format handling
}
```

### 2. Field Name Mapping

Ensured consistent field name mapping for audit logs:

```typescript
const fieldMappings = {
  'check_in_time': 'check_in',
  'break_start_time': 'break_start', 
  'break_end_time': 'break_end',
  'check_out_time': 'check_out'
}
```

### 3. Time Format Handling

Added proper time format conversion for desktop format (which may send ISO strings):

```typescript
// Convert ISO string to time format for database storage
let newValue = fieldValue
if (typeof fieldValue === 'string' && fieldValue.includes('T')) {
  // If it's an ISO string, extract just the time part
  const date = new Date(fieldValue)
  newValue = date.toTimeString().slice(0, 8)
} else if (typeof fieldValue === 'string' && fieldValue.match(/^\d{2}:\d{2}:\d{2}$/)) {
  // If it's already in HH:MM:SS format, use as is
  newValue = fieldValue
}
```

## Testing

### 1. Created Comprehensive Test Script

`scripts/test-desktop-mobile-rejection-audit.js` tests both formats:

- **Desktop Format Test**: Sends field edits like `check_in_time_day_0: '09:30:00'`
- **Mobile Format Test**: Sends day-based updates in `dailyUpdates` object
- **Verification**: Confirms audit log entries have correct structure and values

### 2. Test Results

```
🖥️  TESTING DESKTOP FORMAT
✅ Desktop check_in: 09:00:00 → 09:30:00
✅ Desktop break_start: 12:00:00 → 12:30:00
✅ Desktop check_out: 17:00:00 → 17:30:00

📱 TESTING MOBILE FORMAT
✅ Mobile check_in: 09:00:00 → 09:15:00
✅ Mobile break_end: 13:00:00 → 13:15:00
✅ Mobile break_start: 12:00:00 → 12:15:00

🎉 ALL TESTS PASSED!
```

## Verification

The fix ensures that desktop rejection mode now properly creates audit log entries with:

✅ **Unique change_id** for each rejection interaction  
✅ **Correct field names** (`check_in`, `break_start`, `break_end`, `check_out`)  
✅ **Old values** from timecard daily entries  
✅ **New values** from user input (properly converted)  
✅ **Changed_by** user ID  
✅ **Accurate changed_at** timestamp  
✅ **Action type** set to `rejection_edit`  
✅ **Work date** for each changed day  

## Files Modified

1. `app/api/timecards/edit/route.ts` - Enhanced rejection edit handling
2. `scripts/test-desktop-mobile-rejection-audit.js` - Comprehensive test script

## Impact

- Desktop rejection mode now creates proper audit trails
- Both desktop and mobile rejection formats are supported
- Audit log entries follow the specified requirements
- No breaking changes to existing functionality
- Maintains backward compatibility with mobile format

The desktop rejection mode audit logging is now working correctly and meets all the specified requirements.