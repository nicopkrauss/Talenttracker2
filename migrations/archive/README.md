# Archived Migrations

This directory contains migration files that were created during development but were never applied to the database. They are preserved here for historical reference and potential future use.

## Archived Files

These migrations were part of earlier development iterations but were superseded by other approaches or became obsolete:

- `000_create_migration_tracking.sql` - Early migration tracking system (superseded by current schema_migrations table)
- `001_talent_info_enhancement_corrected.sql` - Talent info enhancement (functionality implemented via other means)
- `002_cleanup_old_structure_fixed.sql` - Database cleanup (no longer needed)
- `003_notifications_table.sql` - Notifications table creation (table exists via other implementation)
- `006_create_location_tracking_system.sql` - Location tracking system (implemented differently)
- `007_update_profiles_role_to_enum.sql` - Role enum update (handled via Prisma schema)
- `009_simple_auth_logging.sql` - Auth logging system (not implemented)
- `017_fix_project_locations_trigger.sql` - Project locations trigger fix (not needed)

## Note

These files are kept for reference only. The current database schema is managed primarily through Prisma migrations and the applied SQL migrations in the parent directory.