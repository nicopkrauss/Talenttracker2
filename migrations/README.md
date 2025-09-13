# Database Migrations

This directory contains SQL migration scripts for the Talent Tracker database.

## Current Structure

### Applied Migrations
These migrations have been successfully applied to the database:

- `005_add_missing_timecard_columns.sql` - Added missing columns to timecards table
- `008_separate_system_and_project_roles.sql` - Separated system and project role management
- `010_create_project_setup_checklist_table.sql` - Created project setup checklist functionality
- `011_rename_talent_locations_to_project_locations.sql` - Renamed table for better clarity
- `012_add_project_locations_fields.sql` - Enhanced project locations with additional fields
- `013_update_talent_status_foreign_key.sql` - Updated foreign key relationships
- `014_add_project_setup_indexes.sql` - Added performance indexes for project setup
- `015_create_default_setup_checklists.sql` - Created default setup checklists
- `016_update_default_locations.sql` - Updated default location configurations
- `017_add_talent_expected_field.sql` - Added talent expected count to projects
- `018_add_project_locations_color.sql` - Added color and abbreviation fields to locations
- `019_fix_project_locations_data.sql` - Fixed location data and sort orders
- `020_create_project_role_templates.sql` - Created role templates system
- `021_remove_role_unique_constraint.sql` - Updated role templates to allow multiple per role

### Pending Migrations
These migrations are ready to be applied:

- `022_rename_talent_logistics_coordinator_to_coordinator.sql` - **PENDING** - Rename role from talent_logistics_coordinator to coordinator
- `coordinator-migration-step1-enums.sql` - **PENDING** - Step 1: Add coordinator enum values
- `coordinator-migration-step2-data.sql` - **PENDING** - Step 2: Migrate data to coordinator role
- `027_create_daily_assignment_tables.sql` - **NEW** - Create day-specific assignment tables and triggers for multi-day escort assignments

### Archived Migrations
Superseded or obsolete migrations have been moved to the `archive/` directory for historical reference.

## Current Database Schema Management

The project now primarily uses **Prisma** for schema management and migrations. The SQL migrations in this directory represent the historical evolution of the database schema and should be preserved for audit and reference purposes.

## Running New Migrations

For new database changes, use the established migration workflow:

### Using the Node.js Migration Script
```bash
node scripts/run-migration.js path/to/migration.sql
```

### Direct Database Inspection
```bash
node scripts/inspect-database.js
```

## Migration History

You can view the complete migration history by checking the `schema_migrations` table:

```sql
SELECT migration_name, applied_at, notes 
FROM schema_migrations 
ORDER BY applied_at;
```

## Best Practices

1. **New Migrations**: Create new migration files with sequential numbering
2. **Testing**: Always test migrations on a development database first
3. **Documentation**: Include clear descriptions and rollback instructions
4. **Prisma Integration**: Consider using Prisma migrations for new schema changes
5. **Backup**: Always backup production data before applying migrations

## Archive Directory

The `archive/` directory contains migrations that were created during development but never applied. These are preserved for:
- Historical reference
- Understanding the evolution of the database design
- Potential future reference or adaptation

See `archive/README.md` for details on archived migrations.