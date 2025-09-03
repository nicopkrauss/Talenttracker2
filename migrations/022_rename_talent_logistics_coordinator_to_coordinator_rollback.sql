-- Rollback Migration: Revert 'coordinator' back to 'talent_logistics_coordinator' in role enums
-- Date: 2025-02-09
-- Description: Rollback script to revert the coordinator role rename migration
--              This script restores the original 'talent_logistics_coordinator' role name

-- ============================================================================
-- STEP 1: Verify current state before rollback
-- ============================================================================

-- Check if coordinator role exists and count records
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
    
    RAISE NOTICE 'Pre-rollback state:';
    RAISE NOTICE '  - Profiles with coordinator role: %', coordinator_profiles_count;
    RAISE NOTICE '  - Project roles with coordinator role: %', coordinator_project_roles_count;
    RAISE NOTICE '  - Project role templates with coordinator role: %', coordinator_templates_count;
    RAISE NOTICE '  - Team assignments with coordinator role: %', coordinator_assignments_count;
END $$;

-- ============================================================================
-- STEP 2: Add back the original enum values (if they don't exist)
-- ============================================================================

-- Add 'talent_logistics_coordinator' back to system_role enum
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'talent_logistics_coordinator';

-- Add 'talent_logistics_coordinator' back to project_role enum  
ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'talent_logistics_coordinator';

-- ============================================================================
-- STEP 3: Data Rollback - Revert all records back to original role name
-- ============================================================================

-- Revert profiles table (system_role)
UPDATE profiles 
SET role = 'talent_logistics_coordinator' 
WHERE role = 'coordinator';

-- Revert project_roles table (project_role)
UPDATE project_roles 
SET role = 'talent_logistics_coordinator' 
WHERE role = 'coordinator';

-- Revert project_role_templates table (project_role)
UPDATE project_role_templates 
SET role = 'talent_logistics_coordinator' 
WHERE role = 'coordinator';

-- Revert team_assignments table (project_role)
UPDATE team_assignments 
SET role = 'talent_logistics_coordinator' 
WHERE role = 'coordinator';

-- ============================================================================
-- STEP 4: Data Integrity Verification
-- ============================================================================

-- Verify no records still use the coordinator role name in profiles
DO $$
DECLARE
    coordinator_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO coordinator_role_count 
    FROM profiles 
    WHERE role = 'coordinator';
    
    IF coordinator_role_count > 0 THEN
        RAISE EXCEPTION 'Rollback failed: % profiles still have coordinator role', coordinator_role_count;
    END IF;
    
    RAISE NOTICE 'Profiles rollback verified: No records with coordinator role found';
END $$;

-- Verify no records still use the coordinator role name in project_roles
DO $$
DECLARE
    coordinator_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO coordinator_role_count 
    FROM project_roles 
    WHERE role = 'coordinator';
    
    IF coordinator_role_count > 0 THEN
        RAISE EXCEPTION 'Rollback failed: % project_roles still have coordinator role', coordinator_role_count;
    END IF;
    
    RAISE NOTICE 'Project roles rollback verified: No records with coordinator role found';
END $$;

-- Verify no records still use the coordinator role name in project_role_templates
DO $$
DECLARE
    coordinator_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO coordinator_role_count 
    FROM project_role_templates 
    WHERE role = 'coordinator';
    
    IF coordinator_role_count > 0 THEN
        RAISE EXCEPTION 'Rollback failed: % project_role_templates still have coordinator role', coordinator_role_count;
    END IF;
    
    RAISE NOTICE 'Project role templates rollback verified: No records with coordinator role found';
END $$;

-- Verify no records still use the coordinator role name in team_assignments
DO $$
DECLARE
    coordinator_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO coordinator_role_count 
    FROM team_assignments 
    WHERE role = 'coordinator';
    
    IF coordinator_role_count > 0 THEN
        RAISE EXCEPTION 'Rollback failed: % team_assignments still have coordinator role', coordinator_role_count;
    END IF;
    
    RAISE NOTICE 'Team assignments rollback verified: No records with coordinator role found';
END $$;

-- ============================================================================
-- STEP 5: Report rollback statistics
-- ============================================================================

-- Report how many records were rolled back
DO $$
DECLARE
    tlc_profiles_count INTEGER;
    tlc_project_roles_count INTEGER;
    tlc_templates_count INTEGER;
    tlc_assignments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tlc_profiles_count 
    FROM profiles 
    WHERE role = 'talent_logistics_coordinator';
    
    SELECT COUNT(*) INTO tlc_project_roles_count 
    FROM project_roles 
    WHERE role = 'talent_logistics_coordinator';
    
    SELECT COUNT(*) INTO tlc_templates_count 
    FROM project_role_templates 
    WHERE role = 'talent_logistics_coordinator';
    
    SELECT COUNT(*) INTO tlc_assignments_count 
    FROM team_assignments 
    WHERE role = 'talent_logistics_coordinator';
    
    RAISE NOTICE 'Rollback completed successfully:';
    RAISE NOTICE '  - Profiles with talent_logistics_coordinator role: %', tlc_profiles_count;
    RAISE NOTICE '  - Project roles with talent_logistics_coordinator role: %', tlc_project_roles_count;
    RAISE NOTICE '  - Project role templates with talent_logistics_coordinator role: %', tlc_templates_count;
    RAISE NOTICE '  - Team assignments with talent_logistics_coordinator role: %', tlc_assignments_count;
END $$;

-- Remove the migration record
DELETE FROM schema_migrations 
WHERE migration_name = '022_rename_talent_logistics_coordinator_to_coordinator';

-- Record rollback completion
INSERT INTO schema_migrations (migration_name, applied_at, notes) 
VALUES (
    '022_rename_talent_logistics_coordinator_to_coordinator_rollback',
    NOW(),
    'Rolled back coordinator role rename. All records reverted to talent_logistics_coordinator.'
);

RAISE NOTICE 'Rollback of migration 022_rename_talent_logistics_coordinator_to_coordinator completed successfully';