# Desktop Rejection Audit Logging Debug Status

## Current Status: 🔧 DEBUGGING IN PROGRESS

### Issues Identified and Fixed:

#### ✅ Issue 1: Schema Validation Too Restrictive
**Problem**: The Zod schema was too restrictive and didn't allow desktop format fields like `check_in_time_day_0`
**Solution**: Changed `updates` field to `z.record(z.any())` to allow any fields

#### ✅ Issue 2: Header Update Including Desktop Fields  
**Problem**: The API was trying to update `timecard_headers` table with desktop format fields that don't exist in that table
**Solution**: Added filtering to exclude desktop format fields from header updates:
```typescript
const timeFieldPattern = /^(check_in_time|break_start_time|break_end_time|check_out_time)_day_(\d+)$/
const headerUpdates = Object.fromEntries(
  Object.entries(updates).filter(([key]) => !timeFieldPattern.test(key))
)
```

### Current Debugging Added:

#### 🔍 Request Level Debugging:
- Raw request body logging
- Validation success/failure logging

#### 🔍 Rejection Edit Debugging:
- Rejection edit trigger confirmation
- Change ID and timestamp logging
- Desktop vs mobile format detection

#### 🔍 Desktop Format Processing:
- Desktop field pattern matching
- Daily entry lookup and comparison
- Field value conversion (ISO strings to time format)
- Audit entry creation with detailed logging

#### 🔍 Audit Insert Debugging:
- Audit entries count and content logging
- Insert success/failure logging

### Next Steps:

1. **Test through UI**: Make a desktop rejection edit through the actual UI
2. **Monitor Logs**: Watch dev server console for debugging output
3. **Verify Database**: Check if audit log entries are actually inserted
4. **Fix Any Remaining Issues**: Based on debugging output

### Expected Log Flow:

```
🔍 REQUEST DEBUG: Raw request body: { ... }
✅ VALIDATION SUCCESS: Request body validated
🔍 REJECTION EDIT DEBUG: Starting rejection edit audit logging
🔍 DESKTOP FORMAT DEBUG: Found desktop field updates
🔍 DESKTOP DAILY ENTRY DEBUG: Looking for daily entries
🔍 DESKTOP AUDIT DEBUG: Processing field changes
🔍 AUDIT INSERT DEBUG: Inserting X audit entries
✅ AUDIT INSERT SUCCESS: Inserted X audit entries
```

### Test Data Format:

Desktop rejection should send data like:
```json
{
  "timecardId": "uuid",
  "updates": {
    "status": "rejected",
    "check_in_time_day_0": "09:30:00",
    "break_start_time_day_0": "12:30:00",
    "check_out_time_day_1": "17:30:00"
  },
  "editComment": "Reason for rejection"
}
```

### Files Modified:
- `app/api/timecards/edit/route.ts` - Added comprehensive debugging and fixed header update filtering