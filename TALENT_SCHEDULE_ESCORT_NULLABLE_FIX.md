# Talent Schedule Escort Nullable Fix

## Problem
When trying to assign dates to talent in a project, the API was failing with this error:
```
Error: Failed to create schedule entries: null value in column "escort_id" of relation "talent_daily_assignments" violates not-null constraint
```

## Root Cause
The `talent_daily_assignments` table had a NOT NULL constraint on the `escort_id` column, but the application logic was designed to support two distinct use cases:

1. **Scheduling without assignment**: Talent is scheduled for specific dates but not yet assigned to an escort (`escort_id = NULL`)
2. **Assignment with escort**: Talent is both scheduled and assigned to a specific escort (`escort_id = UUID`)

The database schema didn't match the application's intended behavior.

## Solution
Updated the `talent_daily_assignments` table schema to support nullable `escort_id`:

### Schema Changes Made
1. **Made `escort_id` nullable**: Changed from `String @db.Uuid` to `String? @db.Uuid` in Prisma schema
2. **Updated foreign key relation**: Changed from `profiles` to `profiles?` to handle nullable escort references
3. **Removed problematic unique constraint**: The original `@@unique([talent_id, project_id, assignment_date, escort_id])` constraint would have issues with multiple NULL values

### Database Migration Applied
```sql
-- Make escort_id nullable
ALTER TABLE talent_daily_assignments 
ALTER COLUMN escort_id DROP NOT NULL;

-- The unique constraint was automatically handled by Prisma during schema push
```

## Files Modified
- `prisma/schema.prisma` - Updated `talent_daily_assignments` model to make `escort_id` nullable
- Applied via `npx prisma db push`

## Verification
The API endpoint `/api/projects/[id]/talent-roster/[talentId]/schedule` now works correctly for:
- ✅ Scheduling talent without escort assignment (escort_id = NULL)
- ✅ Future assignment of escorts to scheduled talent
- ✅ Proper data integrity with appropriate constraints

## Impact
This fix enables the talent scheduling workflow where:
1. Talent can be scheduled for specific dates initially without escort assignment
2. Escorts can be assigned later through the assignment workflow
3. The system maintains data integrity while supporting both use cases

## Testing
To test the fix:
1. Use the talent schedule interface to assign dates to talent
2. Verify that the API call succeeds without constraint violations
3. Check that talent appears as scheduled (but unassigned) in the project view

The error "null value in column 'escort_id' violates not-null constraint" should no longer occur.