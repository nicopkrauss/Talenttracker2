# Time Type Implementation Summary

## Overview
Added a `time_type` column to the `team_assignments` table to directly store whether each assignment is paid hourly or daily, eliminating the need to look up role templates for pay rate display.

## Database Changes

### Migration: `043_add_time_type_to_team_assignments.sql`
- Adds `time_type` column with CHECK constraint (`'hourly'` or `'daily'`)
- Updates existing assignments based on role patterns:
  - `talent_escort` → `hourly`
  - `supervisor`, `coordinator` → `daily`
- Falls back to role templates for any remaining assignments
- Sets NOT NULL constraint after data population
- Adds performance index

### Manual Migration Required
The migration SQL must be run manually in Supabase SQL editor:

```sql
-- Add the time_type column
ALTER TABLE team_assignments 
ADD COLUMN time_type VARCHAR(10) CHECK (time_type IN ('hourly', 'daily'));

-- Update existing assignments based on role patterns
UPDATE team_assignments SET time_type = 'hourly' WHERE role = 'talent_escort';
UPDATE team_assignments SET time_type = 'daily' WHERE role IN ('supervisor', 'coordinator');

-- Update based on role templates for remaining assignments
UPDATE team_assignments 
SET time_type = (
  SELECT prt.time_type 
  FROM project_role_templates prt 
  WHERE prt.project_id = team_assignments.project_id 
    AND prt.role = team_assignments.role 
    AND prt.is_default = true
  LIMIT 1
)
WHERE time_type IS NULL;

-- Set default for any remaining null values
UPDATE team_assignments SET time_type = 'hourly' WHERE time_type IS NULL;

-- Make column NOT NULL
ALTER TABLE team_assignments ALTER COLUMN time_type SET NOT NULL;

-- Add index
CREATE INDEX idx_team_assignments_time_type ON team_assignments(time_type);
```

## Code Changes

### TypeScript Interface Updates
- Updated `TeamAssignment` interface in `lib/types.ts` to include `time_type: 'hourly' | 'daily'`

### API Updates
1. **Team Assignments API** (`app/api/projects/[id]/team-assignments/route.ts`):
   - GET: Added `time_type` to SELECT queries
   - POST: Determines `time_type` from role templates when creating assignments
   - Fallback logic for role-based defaults

2. **Individual Assignment API** (`app/api/projects/[id]/team-assignments/[assignmentId]/route.ts`):
   - Added `time_type` to SELECT queries

### Frontend Updates
1. **Roles Team Tab** (`components/projects/tabs/roles-team-tab.tsx`):
   - Updated pay rate display logic to use `assignment.time_type` directly
   - Simplified from role template lookup to direct field access
   - Shows `/h` suffix only for hourly assignments

### Pay Rate Display Logic
```typescript
// Before (complex role template lookup)
${assignment.pay_rate}{roleTemplates.find(t => t.role === assignment.role && t.is_default)?.time_type === 'hourly' ? '/h' : ''}

// After (simple direct field access)
${assignment.pay_rate}{assignment.time_type === 'hourly' ? '/h' : ''}
```

## Display Examples

### Hourly Assignments (talent_escort)
- **Before**: `$25` (unclear if hourly or daily)
- **After**: `$25/h` (clearly hourly)

### Daily Assignments (supervisor, coordinator)
- **Before**: `$300` (unclear if hourly or daily)
- **After**: `$300` (clearly daily, no suffix)

## Benefits
1. **Performance**: No need to join with role templates for display
2. **Reliability**: Direct field access eliminates lookup failures
3. **Clarity**: Explicit time type per assignment
4. **Flexibility**: Assignments can have different time types than their role default
5. **Consistency**: Standardized pay rate display across the application

## Testing
- Created `scripts/test-time-type-assignments.js` to verify functionality
- Tests assignment fetching, creation, and display logic
- Validates pay rate formatting with time type suffixes

## Migration Steps
1. Run the migration SQL in Supabase SQL editor
2. Verify existing assignments have correct time_type values
3. Test assignment creation through the UI
4. Confirm pay rate displays show correct suffixes

## Future Considerations
- Consider adding time_type validation in frontend forms
- May want to add audit logging for time_type changes
- Could extend to support other time types (weekly, monthly) if needed