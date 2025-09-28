# Rejection Edit Audit Logging Fix

## Problem Statement

The rejection API audit logging was not working correctly according to the specified requirements. The audit log entries for rejection edits needed to follow specific rules:

1. **change_id** should be a unique ID for the interaction (if 5 fields are changed in one rejection, they should all have the same change_id)
2. **field_name** should be one of: "check_in", "break_start", "break_end", "check_out" 
3. **old_value** should be the current value from timecard daily entries before the edit
4. **new_value** should be the modified value from the user's time picker input
5. **changed_by** should be the ID of the person who made the change
6. **changed_at** should be when the change happened
7. **action_type** should be "rejection_edit"
8. **work_date** should be the day that had its field changed

## Solution Implementation

### 1. Fixed Edit API (`app/api/timecards/edit/route.ts`)

**Key Changes:**
- Added special handling for `rejection_edit` action type
- Generate a unique `change_id` using `crypto.randomUUID()` for each rejection interaction
- Fetch current timecard data before making changes to capture old values
- Compare old vs new values for each field and only create audit entries for actual changes
- Use proper field name mapping:
  - `check_in_time` → `check_in`
  - `check_out_time` → `check_out`
  - `break_start_time` → `break_start`
  - `break_end_time` → `break_end`
- Extract work date from daily entry data
- Insert audit entries directly to database with correct structure

**Implementation Details:**
```typescript
// Generate unique change_id for this rejection interaction
const changeId = crypto.randomUUID()
const timestamp = new Date()

// Field mappings for audit log
const fieldMappings = {
  'check_in_time': 'check_in',
  'check_out_time': 'check_out', 
  'break_start_time': 'break_start',
  'break_end_time': 'break_end'
}

// Create audit entries for each changed field
for (const [fieldKey, fieldValue] of Object.entries(dayData)) {
  if (fieldValue !== undefined && fieldKey in fieldMappings) {
    const auditFieldName = fieldMappings[fieldKey]
    const oldValue = currentDayEntry[fieldKey]
    const newValue = fieldValue

    // Only create audit entry if values are actually different
    if (oldValue !== newValue) {
      auditEntries.push({
        timecard_id: timecardId,
        change_id: changeId,
        field_name: auditFieldName,
        old_value: oldValue ? String(oldValue) : null,
        new_value: newValue ? String(newValue) : null,
        changed_by: user.id,
        changed_at: timestamp.toISOString(),
        action_type: 'rejection_edit',
        work_date: workDate.toISOString().split('T')[0]
      })
    }
  }
}
```

### 2. Fixed Rejection API (`app/api/timecards/reject/route.ts`)

**Key Changes:**
- Removed unnecessary audit logging for simple rejections (without edits)
- Simple rejection only updates timecard status - no audit entries needed
- Audit entries are only created when rejection includes field edits

### 3. Database Schema Alignment

The implementation aligns with the existing `timecard_audit_log` table structure:
```sql
model timecard_audit_log {
  id               String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  timecard_id      String           @db.Uuid
  change_id        String           @db.Uuid
  field_name       String           @db.VarChar(100)
  old_value        String?
  new_value        String?
  changed_by       String           @db.Uuid
  changed_at       DateTime         @default(now()) @db.Timestamptz(6)
  action_type      audit_action_type
  work_date        DateTime?        @db.Date
}
```

## Testing

Created comprehensive test suite (`app/api/timecards/edit/__tests__/rejection-edit-audit-fix.test.ts`) that verifies:

1. **Correct audit entry structure** - All required fields populated correctly
2. **Same change_id for related changes** - Multiple field changes in one rejection share the same change_id
3. **Only changed fields logged** - No audit entries for fields that didn't change
4. **Proper field name mapping** - Database field names correctly mapped to audit field names
5. **Correct timestamps and user tracking** - All metadata properly recorded

## Benefits

1. **Compliance** - Audit logging now meets the specified requirements
2. **Traceability** - Each rejection interaction can be tracked as a group
3. **Accuracy** - Only actual changes are logged, reducing noise
4. **Performance** - Efficient single-transaction approach for audit logging
5. **Maintainability** - Clear separation between rejection types (simple vs with edits)

## Usage Examples

### Rejection with Field Edits
When a user rejects a timecard and modifies check-in and break start times:
- Single `change_id` generated (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Two audit entries created:
  1. `field_name: "check_in"`, `old_value: "09:00:00"`, `new_value: "09:30:00"`
  2. `field_name: "break_start"`, `old_value: "12:00:00"`, `new_value: "12:30:00"`
- Both entries share the same `change_id`, `changed_by`, `changed_at`, and `work_date`

### Simple Rejection
When a user rejects a timecard without making edits:
- No audit entries created
- Only timecard status updated to "rejected"
- Rejection reason stored in `rejection_reason` field

## Migration Notes

- No database schema changes required
- Existing audit log entries remain unchanged
- New rejection edits will follow the corrected format
- Backward compatible with existing audit log queries