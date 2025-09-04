# Superseded Migrations Archive

This folder contains migration files that were superseded by other implementations or are no longer needed.

## Files Archived

### Coordinator Migration Alternatives
These files were alternative approaches to the coordinator migration that were superseded by the main migration file:

- `022_rename_talent_logistics_coordinator_to_coordinator_rollback.sql` - Rollback script (superseded)
- `022_verify_coordinator_migration.sql` - Verification script (superseded)
- `coordinator-migration-manual.sql` - Manual version (superseded)
- `cleanup-old-enum-values.sql` - Enum cleanup (superseded)
- `cleanup-old-enum-values-fixed.sql` - Fixed enum cleanup (superseded)
- `enum-cleanup-steps.sql` - Step-by-step cleanup (superseded)

### Documentation
- `ENUM_CLEANUP_GUIDE.md` - Enum cleanup guide (superseded)
- `ROLE_TEMPLATE_IMPROVEMENT_SUMMARY.md` - Role template summary (completed)

## Status
These files represent completed work or alternative approaches that are no longer needed for the active migration process.

The main coordinator migration is handled by:
- `migrations/022_rename_talent_logistics_coordinator_to_coordinator.sql`
- `migrations/coordinator-migration-step1-enums.sql`
- `migrations/coordinator-migration-step2-data.sql`
- `COORDINATOR_MIGRATION_EXECUTION_GUIDE.md`