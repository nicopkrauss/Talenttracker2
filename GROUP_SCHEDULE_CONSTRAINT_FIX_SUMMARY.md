# Group Schedule Constraint Fix Summary

## Problem
When trying to add a group talent to a project in the assignments tab, the application was throwing a database constraint error:

```
Error: Failed to create schedule entries
Console Error: null value in column "escort_id" of relation "group_daily_assignments" violates not-null constraint
```

## Root Cause
The `group_daily_assignments` table had a NOT NULL constraint on the `escort_id` column, but the API was trying to insert records with `escort_id: null` to represent scheduled but unassigned dates.

## Solution Implemented
Instead of trying to fix the database constraint (which would require direct database access), I modified the group schedule API to use a different approach:

### Before (Problematic Approach)
- Stored scheduled dates in `group_daily_assignments` table with `escort_id: null`
- This violated the NOT NULL constraint

### After (Fixed Approach)
- Store scheduled dates directly in the `talent_groups.scheduled_dates` field (String[] array)
- Only use `group_daily_assignments` table for actual escort assignments (when `escort_id` is not null)

## Files Modified
- `app/api/projects/[id]/talent-groups/[groupId]/schedule/route.ts`
  - Removed code that tried to insert into `group_daily_assignments` with null `escort_id`
  - Updated to store scheduled dates in `talent_groups.scheduled_dates` field
  - Updated response to use the stored `scheduled_dates` from the database

## Technical Details
The `talent_groups` table already had a `scheduled_dates` field of type `String[]` in the Prisma schema:

```prisma
model talent_groups {
  // ...
  scheduled_dates         String[]                  @default([])
  // ...
}
```

This field was designed for exactly this purpose - storing scheduled dates without requiring escort assignments.

## Testing Results
- ✅ API endpoint now returns 200 status instead of 500 error
- ✅ Scheduled dates are properly stored in `talent_groups.scheduled_dates`
- ✅ No more constraint violations
- ✅ UI can successfully add group talent to project assignments

## Future Considerations
The database constraint fix script exists at `scripts/database/fix-group-assignment-constraints.sql` and should eventually be applied to allow the `group_daily_assignments` table to handle null `escort_id` values for consistency with the `talent_daily_assignments` table. However, the current solution works without requiring database schema changes.

## Impact
- Group talent scheduling now works correctly
- No breaking changes to existing functionality
- Consistent with how individual talent scheduling works (storing in main table, using assignments table only for actual assignments)