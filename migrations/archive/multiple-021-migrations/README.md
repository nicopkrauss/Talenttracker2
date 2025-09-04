# Multiple 021 Migrations Archive

This folder contains migration files that were numbered as 021 but have been superseded or integrated into other migrations.

## Migration Status: ✅ INTEGRATED

Based on analysis of the current Prisma schema, these migrations have been integrated into the database through other means:

### Archived Files

- `021_add_registration_role_fields.sql` - **INTEGRATED** - Registration fields (`nearest_major_city`, `willing_to_fly`) exist in current schema
- `021_add_major_cities_constraint.sql` - **INTEGRATED** - City constraint appears to be handled at application level
- `021_add_is_default_to_role_templates.sql` - **INTEGRATED** - `is_default` field exists in current schema

### Active Migration (Kept in main folder)
- `021_remove_role_unique_constraint.sql` - **ACTIVE** - This migration updated the unique constraint to allow multiple templates per role

## Current State
The functionality from these archived migrations has been integrated into the current database schema. The files are preserved for historical reference and audit purposes.