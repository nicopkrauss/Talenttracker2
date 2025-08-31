-- Migration: Fix project_locations trigger after table rename
-- Description: Update trigger and function names to reference project_locations instead of talent_locations
-- Date: 2025-01-31

BEGIN;

-- Drop the old trigger that references the renamed table
DROP TRIGGER IF EXISTS trigger_talent_locations_updated_at ON project_locations;

-- Rename the function to match the new table name
ALTER FUNCTION update_talent_locations_updated_at() RENAME TO update_project_locations_updated_at;

-- Create the new trigger with the correct table and function names
CREATE TRIGGER trigger_project_locations_updated_at
  BEFORE UPDATE ON project_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_project_locations_updated_at();

-- Record migration
INSERT INTO schema_migrations (migration_name, notes) 
VALUES ('017_fix_project_locations_trigger', 'Fixed trigger and function names after talent_locations was renamed to project_locations')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;