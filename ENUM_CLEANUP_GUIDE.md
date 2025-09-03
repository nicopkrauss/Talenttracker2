# Enum Cleanup Guide - Remove talent_logistics_coordinator

## Overview
While the data migration is complete, the old `talent_logistics_coordinator` enum values still exist in the database schema. This guide provides instructions to completely remove them.

## Current Status
✅ **Data Migration Complete**: All 28 records successfully migrated to `coordinator`  
✅ **Application Code Updated**: All code uses `coordinator`  
❌ **Enum Values**: Old `talent_logistics_coordinator` values still exist in schema  

## Why Remove Old Enum Values?
- **Clean Schema**: Removes unused enum values from database
- **Prevents Confusion**: Eliminates possibility of accidentally using old values
- **Complete Migration**: Ensures the migration is 100% complete
- **Future Safety**: Prevents any future code from accidentally referencing old values

## Risk Assessment
**Risk Level**: 🟡 **MEDIUM**
- **Data Risk**: LOW (no data will be lost)
- **Downtime Risk**: LOW (brief table locks during enum recreation)
- **Complexity**: MEDIUM (requires enum type recreation)

## Prerequisites
Before proceeding, ensure:
1. ✅ All data has been migrated (verified above)
2. ✅ All application code uses `coordinator` 
3. ✅ No active transactions are using the old enum values
4. 🔄 **Recommended**: Stop application during cleanup (optional but safer)

## Step-by-Step Instructions

### Step 1: Verify Data Migration (Required)
Run this verification query first:

```sql
-- This should return 0 for all tables
SELECT 'profiles' as table_name, COUNT(*) as old_role_count 
FROM profiles WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'team_assignments', COUNT(*) 
FROM team_assignments WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'project_role_templates', COUNT(*) 
FROM project_role_templates WHERE role = 'talent_logistics_coordinator';
```

**Expected Result**: All counts should be 0. If any count is > 0, DO NOT proceed.

### Step 2: Backup Current Enum Definitions (Optional)
```sql
-- Save current enum values for reference
SELECT 'system_role' as enum_name, enumlabel as value, enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'system_role'
UNION ALL
SELECT 'project_role', enumlabel, enumsortorder
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'project_role'
ORDER BY enum_name, sort_order;
```

### Step 3: Execute Enum Cleanup (The Main Operation)

**Option A: All at Once (Faster)**
Execute the entire contents of `migrations/cleanup-old-enum-values.sql` in one transaction.

**Option B: Step by Step (Safer)**
Execute each section separately:

```sql
-- 3a. Create new enum types
CREATE TYPE system_role_new AS ENUM ('admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort');
CREATE TYPE project_role_new AS ENUM ('supervisor', 'coordinator', 'talent_escort');
```

```sql
-- 3b. Update table columns (execute each separately)
ALTER TABLE profiles 
ALTER COLUMN role TYPE system_role_new 
USING role::text::system_role_new;

ALTER TABLE project_role_templates 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

ALTER TABLE team_assignments 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;
```

```sql
-- 3c. Replace old enums with new ones
DROP TYPE system_role;
DROP TYPE project_role;
ALTER TYPE system_role_new RENAME TO system_role;
ALTER TYPE project_role_new RENAME TO project_role;
```

### Step 4: Verify Cleanup Success
After the cleanup, these queries should fail with "invalid input value for enum":

```sql
-- These should now fail (which is what we want)
SELECT COUNT(*) FROM profiles WHERE role = 'talent_logistics_coordinator';
SELECT COUNT(*) FROM team_assignments WHERE role = 'talent_logistics_coordinator';
```

If they fail with enum errors, the cleanup was successful! ✅

### Step 5: Test Application
1. Restart your application (if you stopped it)
2. Test coordinator role functionality
3. Verify no errors in application logs

## Verification Script
After cleanup, run the verification:
```bash
node scripts/search-database-references.js
```

Expected output: "Database is clean of talent_logistics_coordinator references"

## Troubleshooting

### If Enum Cleanup Fails
- **Error: "type X is being used by table Y"**
  - Some table still references the old enum
  - Check for any missed tables or columns
  
- **Error: "cannot drop type because other objects depend on it"**
  - There may be views, functions, or other objects using the enum
  - Identify and update these objects first

### If You Need to Rollback
If something goes wrong, you can recreate the original enums:
```sql
-- Recreate original enums (only if cleanup failed)
CREATE TYPE system_role AS ENUM ('admin', 'in_house', 'supervisor', 'coordinator', 'talent_logistics_coordinator', 'talent_escort');
CREATE TYPE project_role AS ENUM ('supervisor', 'coordinator', 'talent_logistics_coordinator', 'talent_escort');
```

## Alternative: Leave Old Enum Values
**If you prefer not to do the enum cleanup:**
- The old enum values don't cause any problems
- All functionality works correctly with them present
- You can clean them up during a future maintenance window
- The migration is functionally complete without this step

## Files for This Operation
- `migrations/enum-cleanup-steps.sql` - Step-by-step verification queries
- `migrations/cleanup-old-enum-values.sql` - Complete cleanup SQL
- `scripts/remove-old-enum-values.js` - Script that generated these files
- `scripts/search-database-references.js` - Verification script

## Timeline
- **Verification**: 1 minute
- **Enum Cleanup**: 2-3 minutes  
- **Testing**: 5 minutes
- **Total**: ~10 minutes

## Success Criteria
✅ Old enum values removed from schema  
✅ All queries for old enum values fail with enum errors  
✅ Application works correctly with coordinator role  
✅ No references to talent_logistics_coordinator remain  

This completes the final cleanup of the coordinator role migration! 🎉