# Coordinator Role Migration Execution Guide

## Overview
This guide provides step-by-step instructions to complete the database migration from `talent_logistics_coordinator` to `coordinator` role names.

## Current Status
- ✅ All application code has been updated to use `coordinator`
- ✅ TypeScript types have been updated
- ✅ UI components have been updated
- ✅ API routes have been updated
- ✅ Test files have been updated
- ✅ Documentation has been updated
- ❌ **DATABASE MIGRATION PENDING** ← This is what we need to complete

## Database State
Based on the analysis, the database currently contains:
- **18 profiles** with `talent_logistics_coordinator` role
- **6 project role templates** with `talent_logistics_coordinator` role  
- **4 team assignments** with `talent_logistics_coordinator` role
- **Total: 28 records** need to be migrated

## Required Actions

### Step 1: Execute SQL Migration Commands

You need to run the SQL commands manually because enum modifications require direct database access.

**Option A: Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. **First**: Copy and paste the SQL commands from `migrations/coordinator-migration-step1-enums.sql` and click **Run**
4. **Then**: Copy and paste the SQL commands from `migrations/coordinator-migration-step2-data.sql` and click **Run**

**Option B: Command Line (if you have psql access)**
1. Connect to your database using psql
2. **First**: Run `\i migrations/coordinator-migration-step1-enums.sql`
3. **Then**: Run `\i migrations/coordinator-migration-step2-data.sql`

**Option C: Manual Transaction Execution**
1. Execute the enum addition commands in one transaction
2. Wait for it to complete and commit
3. Execute the data migration commands in a separate transaction

### Step 2: SQL Commands to Execute

**IMPORTANT**: The migration must be executed in TWO separate transactions due to PostgreSQL enum constraints.

**STEP 2A: Add Enum Values (Execute First)**
```sql
BEGIN;
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'coordinator';
ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'coordinator';
COMMIT;
```

**STEP 2B: Migrate Data (Execute After Step 2A)**
```sql
BEGIN;
UPDATE profiles SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';
UPDATE project_role_templates SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';
UPDATE team_assignments SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';
COMMIT;
```

**STEP 2C: Verify Migration (Execute After Step 2B)**
```sql
-- These should return 0 rows
SELECT COUNT(*) as remaining_profiles FROM profiles WHERE role = 'talent_logistics_coordinator';
SELECT COUNT(*) as remaining_templates FROM project_role_templates WHERE role = 'talent_logistics_coordinator';
SELECT COUNT(*) as remaining_assignments FROM team_assignments WHERE role = 'talent_logistics_coordinator';

-- These should show the migrated counts
SELECT COUNT(*) as coordinator_profiles FROM profiles WHERE role = 'coordinator';
SELECT COUNT(*) as coordinator_templates FROM project_role_templates WHERE role = 'coordinator';
SELECT COUNT(*) as coordinator_assignments FROM team_assignments WHERE role = 'coordinator';
```

### Step 3: Verify Migration

After executing the SQL commands, run the verification script:

```bash
node scripts/verify-coordinator-migration.js
```

Expected output:
- ✅ No old role names remain in database
- ✅ Coordinator roles found in database  
- ✅ Data migration completed successfully

### Step 4: Comprehensive Data Integrity Check

Run the comprehensive check to ensure all data relationships are intact:

```bash
node scripts/comprehensive-data-integrity-check.js
```

Expected results:
- **coordinator_profiles: 18**
- **coordinator_templates: 6** 
- **coordinator_assignments: 4**
- **remaining old roles: 0**

## Troubleshooting

### If You Get "unsafe use of new value" Error
This error occurs when trying to use enum values in the same transaction where they're created. **Solution**:
1. Execute Step 2A (enum addition) first and let it complete
2. Wait for the transaction to commit
3. Then execute Step 2B (data migration) in a separate transaction

### If SQL Commands Fail
- Check that you have proper database permissions
- Ensure you're connected to the correct database
- Review any error messages in the Supabase dashboard
- Make sure to execute the steps in the correct order (enums first, then data)

### If Verification Fails
- Re-run the SQL UPDATE commands
- Check for any remaining old role references
- Run the comprehensive integrity check for detailed analysis

### If You Need to Rollback
A rollback script is available at `scripts/rollback-coordinator-migration.js`, but it should only be used if there are critical issues.

## Expected Timeline
- **SQL Execution**: 1-2 minutes
- **Verification**: 1 minute  
- **Total**: 3-5 minutes

## Success Criteria
✅ All verification scripts pass  
✅ No old role names remain in database  
✅ All data relationships intact  
✅ Application functions correctly with coordinator role  

## Next Steps After Migration
1. Test the application thoroughly
2. Verify coordinator role functionality works as expected
3. **Optional**: Remove old enum values from schema (see `ENUM_CLEANUP_GUIDE.md`)
4. Update any external documentation or integrations

## Additional Cleanup (Optional)
The data migration is complete, but old `talent_logistics_coordinator` enum values may still exist in the database schema. While these don't affect functionality, you can remove them for a completely clean schema:

**To check if cleanup is needed:**
```bash
node scripts/search-database-references.js
```

**To perform enum cleanup:**
See `ENUM_CLEANUP_GUIDE.md` for detailed instructions.

## Files Created for This Migration
- `migrations/coordinator-migration-step1-enums.sql` - Step 1: Add enum values (execute first)
- `migrations/coordinator-migration-step2-data.sql` - Step 2: Migrate data (execute second)
- `migrations/coordinator-migration-manual.sql` - Combined SQL commands with transaction blocks
- `scripts/migration-instructions.js` - Generates migration instructions
- `scripts/verify-coordinator-migration.js` - Verifies migration completion
- `scripts/comprehensive-data-integrity-check.js` - Full integrity validation
- `scripts/complete-coordinator-migration.js` - Automated migration (requires enum setup)

## Support
If you encounter any issues during the migration:
1. Check the error messages carefully
2. Run the verification scripts to understand the current state
3. Review the troubleshooting section above
4. Consider running the rollback script if needed