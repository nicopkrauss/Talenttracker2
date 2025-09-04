# Archived Migrations

This directory contains migration files that were created during development but were never applied, superseded by other implementations, or are no longer needed.

## Archive Structure

### `/multiple-021-migrations/`
Contains migration files that were numbered as 021 but have been integrated into the database through other means:
- Registration fields (nearest_major_city, willing_to_fly)
- Role template improvements (is_default field)
- City constraints (handled at application level)

### `/superseded-migrations/`
Contains alternative approaches to migrations that were superseded by the main implementation files.

### Root Archive Files
These migrations were part of earlier development iterations:

- `000_create_migration_tracking.sql` - Early migration tracking system (superseded by current schema_migrations table)
- `001_talent_info_enhancement_corrected.sql` - Talent info enhancement (functionality implemented via other means)
- `002_cleanup_old_structure_fixed.sql` - Database cleanup (no longer needed)
- `003_notifications_table.sql` - Notifications table creation (table exists via other implementation)
- `006_create_location_tracking_system.sql` - Location tracking system (implemented differently)
- `007_update_profiles_role_to_enum.sql` - Role enum update (handled via Prisma schema)
- `009_simple_auth_logging.sql` - Auth logging system (not implemented)
- `017_fix_project_locations_trigger.sql` - Project locations trigger fix (not needed)

## Current Migration Status

The active migrations are in the parent `/migrations/` directory. The database schema is managed through:
1. Applied SQL migrations (tracked in schema_migrations table)
2. Prisma schema for type generation and introspection
3. Pending coordinator role migration (ready to apply)

## Note

These archived files are preserved for historical reference, audit purposes, and understanding the evolution of the database design.