# Group Assignment Constraint Fix Summary

## Issues Identified

When adding a group to a project, two database constraint violations were occurring:

### 1. Foreign Key Constraint Violation
**Error**: `insert or update on table "talent_project_assignments" violates foreign key constraint "talent_project_assignments_talent_id_fkey"`

**Root Cause**: The API was attempting to create a `talent_project_assignments` record using the group ID as `talent_id`, but groups are separate entities from talent and don't exist in the `talent` table.

**Location**: `app/api/projects/[id]/talent-groups/route.ts` lines 150-162

### 2. Not-Null Constraint Violation  
**Error**: `null value in column "escort_id" of relation "group_daily_assignments" violates not-null constraint`

**Root Cause**: The `group_daily_assignments.escort_id` field was defined as NOT NULL in the database schema, but the API was trying to insert `null` values when creating schedule entries without escort assignments.

**Location**: `app/api/projects/[id]/talent-groups/[groupId]/schedule/route.ts` lines 85-90

## Fixes Implemented

### 1. Database Schema Fix
**File**: `scripts/database/fix-group-assignment-constraints.sql`

- Made `escort_id` nullable in `group_daily_assignments` table
- Updated unique constraints to properly handle nullable `escort_id` values
- Created partial unique indexes to ensure data integrity:
  - One escort per group/date when assigned
  - Only one unassigned entry per group/date when not assigned

### 2. API Logic Fix
**File**: `app/api/projects/[id]/talent-groups/route.ts`

- Removed the problematic `talent_project_assignments` creation for groups
- Groups are now properly handled as separate entities that appear in the roster through their own `talent_groups` table
- Scheduling is handled via `group_daily_assignments` table

### 3. Prisma Schema Update
**File**: `prisma/schema.prisma`

- Updated `group_daily_assignments.escort_id` to be nullable (`String?`)
- Updated the `profiles` relation to be optional (`profiles?`)
- Removed the problematic unique constraint that couldn't handle nullable values
- Regenerated Prisma client to reflect schema changes

## Database Migration Applied

```sql
-- Make escort_id nullable
ALTER TABLE group_daily_assignments 
ALTER COLUMN escort_id DROP NOT NULL;

-- Update unique constraints for nullable escort_id
DROP CONSTRAINT IF EXISTS group_daily_assignments_group_id_project_id_assignment_date_escort_key;

-- Partial unique indexes for proper constraint handling
CREATE UNIQUE INDEX group_daily_assignments_unique_with_escort 
ON group_daily_assignments (group_id, project_id, assignment_date, escort_id) 
WHERE escort_id IS NOT NULL;

CREATE UNIQUE INDEX group_daily_assignments_unique_without_escort 
ON group_daily_assignments (group_id, project_id, assignment_date) 
WHERE escort_id IS NULL;
```

## Result

- Groups can now be created and scheduled without constraint violations
- Scheduled dates can be added to groups without requiring escort assignments
- Data integrity is maintained through proper unique constraints
- Groups are properly separated from talent entities in the database design

## Testing

The fixes address the specific error messages:
- ✅ Foreign key constraint violation resolved
- ✅ Not-null constraint violation resolved
- ✅ Groups can be created with scheduled dates
- ✅ Schedule updates work without escort assignments

## Files Modified

1. `scripts/database/fix-group-assignment-constraints.sql` - Database migration
2. `app/api/projects/[id]/talent-groups/route.ts` - Removed problematic talent assignment creation
3. `prisma/schema.prisma` - Updated schema to reflect nullable escort_id
4. Prisma client regenerated with `npx prisma generate`