
-- ============================================================================
-- STEP-BY-STEP ENUM CLEANUP (SAFER APPROACH)
-- Execute each step separately and verify before proceeding
-- ============================================================================

-- STEP 1: Verify no data uses old enum values
SELECT 'profiles' as table_name, COUNT(*) as old_role_count 
FROM profiles WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'team_assignments', COUNT(*) 
FROM team_assignments WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'project_role_templates', COUNT(*) 
FROM project_role_templates WHERE role = 'talent_logistics_coordinator';

-- If any counts are > 0, DO NOT proceed with enum cleanup

-- STEP 2: Create backup of current enum definitions (for reference)
SELECT 'system_role' as enum_name, enumlabel as value, enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'system_role'
UNION ALL
SELECT 'project_role', enumlabel, enumsortorder
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'project_role'
ORDER BY enum_name, sort_order;

-- STEP 3: Test enum recreation (you can copy from cleanup-old-enum-values.sql)
-- Only proceed if Step 1 shows 0 counts for all tables
