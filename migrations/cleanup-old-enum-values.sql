
-- ============================================================================
-- ENUM CLEANUP: Remove talent_logistics_coordinator from enums
-- Execute these commands to remove old enum values
-- WARNING: This is a complex operation that recreates the enum types
-- ============================================================================

-- Step 1: Create new enum types without the old values
CREATE TYPE system_role_new AS ENUM ('admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort');
CREATE TYPE project_role_new AS ENUM ('supervisor', 'coordinator', 'talent_escort');

-- Step 2: Update all columns to use new enum types
-- Note: This assumes all data has already been migrated to 'coordinator'

-- Update profiles table
ALTER TABLE profiles 
ALTER COLUMN role TYPE system_role_new 
USING role::text::system_role_new;

-- Update project_roles table
ALTER TABLE project_roles 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

-- Update project_role_templates table
ALTER TABLE project_role_templates 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

-- Update team_assignments table
ALTER TABLE team_assignments 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

-- Step 3: Drop old enum types and rename new ones
DROP TYPE system_role;
DROP TYPE project_role;
ALTER TYPE system_role_new RENAME TO system_role;
ALTER TYPE project_role_new RENAME TO project_role;

-- Step 4: Verify cleanup
-- These queries should fail with "invalid input value for enum" if cleanup was successful
-- SELECT COUNT(*) FROM profiles WHERE role = 'talent_logistics_coordinator';
-- SELECT COUNT(*) FROM team_assignments WHERE role = 'talent_logistics_coordinator';

-- ============================================================================
-- IMPORTANT NOTES:
-- 1. This operation will briefly lock the affected tables
-- 2. All applications should be stopped during this operation
-- 3. Test this on a backup/staging database first
-- 4. This assumes all data has been migrated to 'coordinator' already
-- ============================================================================
