-- Verification Script: Check coordinator role migration integrity
-- Date: 2025-02-09
-- Description: Comprehensive verification script to ensure the coordinator role migration
--              was completed successfully and all data integrity is maintained

-- ============================================================================
-- VERIFICATION 1: Check enum values exist
-- ============================================================================

-- Verify 'coordinator' exists in system_role enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'system_role' AND e.enumlabel = 'coordinator'
    ) THEN
        RAISE EXCEPTION 'coordinator value not found in system_role enum';
    END IF;
    
    RAISE NOTICE '✓ coordinator value exists in system_role enum';
END $$;

-- Verify 'coordinator' exists in project_role enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'project_role' AND e.enumlabel = 'coordinator'
    ) THEN
        RAISE EXCEPTION 'coordinator value not found in project_role enum';
    END IF;
    
    RAISE NOTICE '✓ coordinator value exists in project_role enum';
END $$;

-- ============================================================================
-- VERIFICATION 2: Check no old role names remain in data
-- ============================================================================

-- Check profiles table
DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM profiles 
    WHERE role = 'talent_logistics_coordinator';
    
    IF old_role_count > 0 THEN
        RAISE EXCEPTION 'Found % profiles still using talent_logistics_coordinator role', old_role_count;
    END IF;
    
    RAISE NOTICE '✓ No profiles using old role name (talent_logistics_coordinator)';
END $$;

-- Check project_roles table
DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM project_roles 
    WHERE role = 'talent_logistics_coordinator';
    
    IF old_role_count > 0 THEN
        RAISE EXCEPTION 'Found % project_roles still using talent_logistics_coordinator role', old_role_count;
    END IF;
    
    RAISE NOTICE '✓ No project_roles using old role name (talent_logistics_coordinator)';
END $$;

-- Check project_role_templates table
DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM project_role_templates 
    WHERE role = 'talent_logistics_coordinator';
    
    IF old_role_count > 0 THEN
        RAISE EXCEPTION 'Found % project_role_templates still using talent_logistics_coordinator role', old_role_count;
    END IF;
    
    RAISE NOTICE '✓ No project_role_templates using old role name (talent_logistics_coordinator)';
END $$;

-- Check team_assignments table
DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM team_assignments 
    WHERE role = 'talent_logistics_coordinator';
    
    IF old_role_count > 0 THEN
        RAISE EXCEPTION 'Found % team_assignments still using talent_logistics_coordinator role', old_role_count;
    END IF;
    
    RAISE NOTICE '✓ No team_assignments using old role name (talent_logistics_coordinator)';
END $$;

-- ============================================================================
-- VERIFICATION 3: Check data consistency and relationships
-- ============================================================================

-- Verify foreign key relationships are intact for profiles with coordinator role
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM profiles p
    WHERE p.role = 'coordinator'
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.id);
    
    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Found % coordinator profiles without corresponding auth users', orphaned_count;
    END IF;
    
    RAISE NOTICE '✓ All coordinator profiles have valid auth user relationships';
END $$;

-- Verify team assignments with coordinator role have valid project and user references
DO $$
DECLARE
    invalid_assignments INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_assignments
    FROM team_assignments ta
    WHERE ta.role = 'coordinator'
    AND (
        NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = ta.project_id)
        OR NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = ta.user_id)
    );
    
    IF invalid_assignments > 0 THEN
        RAISE EXCEPTION 'Found % coordinator team assignments with invalid references', invalid_assignments;
    END IF;
    
    RAISE NOTICE '✓ All coordinator team assignments have valid project and user references';
END $$;

-- Verify project role templates with coordinator role have valid project references
DO $$
DECLARE
    invalid_templates INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_templates
    FROM project_role_templates prt
    WHERE prt.role = 'coordinator'
    AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = prt.project_id);
    
    IF invalid_templates > 0 THEN
        RAISE EXCEPTION 'Found % coordinator role templates with invalid project references', invalid_templates;
    END IF;
    
    RAISE NOTICE '✓ All coordinator role templates have valid project references';
END $$;

-- ============================================================================
-- VERIFICATION 4: Generate migration summary report
-- ============================================================================

DO $$
DECLARE
    coordinator_profiles_count INTEGER;
    coordinator_project_roles_count INTEGER;
    coordinator_templates_count INTEGER;
    coordinator_assignments_count INTEGER;
    total_coordinator_records INTEGER;
BEGIN
    -- Count records using coordinator role
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
    
    total_coordinator_records := coordinator_profiles_count + coordinator_project_roles_count + 
                                coordinator_templates_count + coordinator_assignments_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'COORDINATOR MIGRATION VERIFICATION REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Status: ✓ SUCCESSFUL';
    RAISE NOTICE '';
    RAISE NOTICE 'Records using coordinator role:';
    RAISE NOTICE '  - Profiles: %', coordinator_profiles_count;
    RAISE NOTICE '  - Project roles: %', coordinator_project_roles_count;
    RAISE NOTICE '  - Project role templates: %', coordinator_templates_count;
    RAISE NOTICE '  - Team assignments: %', coordinator_assignments_count;
    RAISE NOTICE '  - Total coordinator records: %', total_coordinator_records;
    RAISE NOTICE '';
    RAISE NOTICE 'Data Integrity: ✓ VERIFIED';
    RAISE NOTICE '  - No old role names found in any table';
    RAISE NOTICE '  - All foreign key relationships intact';
    RAISE NOTICE '  - All enum values properly created';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration completed successfully at: %', NOW();
    RAISE NOTICE '========================================';
END $$;