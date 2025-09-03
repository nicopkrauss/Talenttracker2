-- Migration: Rename 'talent_logistics_coordinator' to 'coordinator' in role enums
-- Date: 2025-02-09
-- Description: Updates both system_role and project_role enums to use 'coordinator' instead of 'talent_logistics_coordinator'
--              and migrates all existing data to use the new role name.

-- ============================================================================
-- STEP 1: Add new 'coordinator' enum values to both enums
-- ============================================================================

-- Add 'coordinator' to system_role enum
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'coordinator';

-- Add 'coordinator' to project_role enum  
ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'coordinator';

-- ============================================================================
-- STEP 2: Data Migration - Update all existing records
-- ============================================================================

-- Update profiles table (system_role)
UPDATE profiles 
SET role = 'coordinator' 
WHERE role = 'talent_logistics_coordinator';

-- Update project_roles table (project_role)
UPDATE project_roles 
SET role = 'coordinator' 
WHERE role = 'talent_logistics_coordinator';

-- Update project_role_templates table (project_role)
UPDATE project_role_templates 
SET role = 'coordinator' 
WHERE role = 'talent_logistics_coordinator';

-- Update team_assignments table (project_role)
UPDATE team_assignments 
SET role = 'coordinator' 
WHERE role = 'talent_logistics_coordinator';

-- ============================================================================
-- STEP 3: Data Integrity Verification
-- ============================================================================

-- Verify no records still use the old role name in profiles
DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM profiles 
    WHERE role = 'talent_logistics_coordinator';
    
    IF old_role_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % profiles still have talent_logistics_coordinator role', old_role_count;
    END IF;
    
    RAISE NOTICE 'Profiles migration verified: No records with old role name found';
END $$;

-- Verify no records still use the old role name in project_roles
DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM project_roles 
    WHERE role = 'talent_logistics_coordinator';
    
    IF old_role_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % project_roles still have talent_logistics_coordinator role', old_role_count;
    END IF;
    
    RAISE NOTICE 'Project roles migration verified: No records with old role name found';
END $$;

-- Verify no records still use the old role name in project_role_templates
DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM project_role_templates 
    WHERE role = 'talent_logistics_coordinator';
    
    IF old_role_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % project_role_templates still have talent_logistics_coordinator role', old_role_count;
    END IF;
    
    RAISE NOTICE 'Project role templates migration verified: No records with old role name found';
END $$;

-- Verify no records still use the old role name in team_assignments
DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM team_assignments 
    WHERE role = 'talent_logistics_coordinator';
    
    IF old_role_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % team_assignments still have talent_logistics_coordinator role', old_role_count;
    END IF;
    
    RAISE NOTICE 'Team assignments migration verified: No records with old role name found';
END $$;

-- ============================================================================
-- STEP 4: Report migration statistics
-- ============================================================================

-- Report how many records were migrated
DO $$
DECLARE
    coordinator_profiles_count INTEGER;
    coordinator_project_roles_count INTEGER;
    coordinator_templates_count INTEGER;
    coordinator_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO coordinator_profiles_count 
    FROM profiles 
    WHERE role = 'coordinator';
    
    SELECT COUNT(*) INTO coordinator_project_roles_count 
    FROM project_roles 
    WHERE role = 'coordinator';
    
    SELECT COUNT(*) INTO coordinator_templates_count 
    FROM project_role_templates 
    WHERE role = 'coordinator';
    
    SELECT COUNT(*) INTO coordinator_assignments_count 
    FROM team_assignments 
    WHERE role = 'coordinator';
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '  - Profiles with coordinator role: %', coordinator_profiles_count;
    RAISE NOTICE '  - Project roles with coordinator role: %', coordinator_project_roles_count;
    RAISE NOTICE '  - Project role templates with coordinator role: %', coordinator_templates_count;
    RAISE NOTICE '  - Team assignments with coordinator role: %', coordinator_assignments_count;
END $$;

-- ============================================================================
-- STEP 5: Create enum recreation script for removing old values (manual step)
-- ============================================================================

-- Note: Removing enum values requires recreating the enum type, which is a more complex operation
-- that should be done as a separate migration after confirming all application code has been updated.
-- The following commands are provided for reference but should be executed manually after
-- all application code has been updated to use 'coordinator':

/*
-- WARNING: This step should only be executed after all application code has been updated
-- and thoroughly tested with the new 'coordinator' role name.

-- Step 1: Create new enum types without the old values
CREATE TYPE system_role_new AS ENUM ('admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort');
CREATE TYPE project_role_new AS ENUM ('supervisor', 'coordinator', 'talent_escort');

-- Step 2: Update all columns to use new enum types
ALTER TABLE profiles ALTER COLUMN role TYPE system_role_new USING role::text::system_role_new;
ALTER TABLE project_roles ALTER COLUMN role TYPE project_role_new USING role::text::project_role_new;
ALTER TABLE project_role_templates ALTER COLUMN role TYPE project_role_new USING role::text::project_role_new;
ALTER TABLE team_assignments ALTER COLUMN role TYPE project_role_new USING role::text::project_role_new;

-- Step 3: Drop old enum types and rename new ones
DROP TYPE system_role;
DROP TYPE project_role;
ALTER TYPE system_role_new RENAME TO system_role;
ALTER TYPE project_role_new RENAME TO project_role;
*/

-- Record migration completion
INSERT INTO schema_migrations (migration_name, applied_at, notes) 
VALUES (
    '022_rename_talent_logistics_coordinator_to_coordinator',
    NOW(),
    'Renamed talent_logistics_coordinator to coordinator in both system_role and project_role enums. Data migration completed successfully.'
);

RAISE NOTICE 'Migration 022_rename_talent_logistics_coordinator_to_coordinator completed successfully';