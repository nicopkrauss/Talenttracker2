-- ============================================================================
-- ENUM CLEANUP: Remove talent_logistics_coordinator from enums (FIXED VERSION)
-- Execute these commands to remove old enum values
-- This version includes the project_roles table that was missed
-- ============================================================================

-- Step 0: Check what data exists in project_roles table
SELECT 'project_roles' as table_name, role, COUNT(*) as count
FROM project_roles 
GROUP BY role
ORDER BY role;

-- Verify no old role data exists in any table
SELECT 'profiles' as table_name, COUNT(*) as old_role_count 
FROM profiles WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'project_roles', COUNT(*) 
FROM project_roles WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'team_assignments', COUNT(*) 
FROM team_assignments WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'project_role_templates', COUNT(*) 
FROM project_role_templates WHERE role = 'talent_logistics_coordinator';

-- If any counts above are > 0, DO NOT proceed with the cleanup below

-- ============================================================================
-- ENUM CLEANUP EXECUTION (only proceed if all counts above are 0)
-- ============================================================================

-- Step 1: Create new enum types without the old values
CREATE TYPE system_role_new AS ENUM ('admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort');
CREATE TYPE project_role_new AS ENUM ('supervisor', 'coordinator', 'talent_escort');

-- Step 2: Update all columns to use new enum types
-- Note: This assumes all data has already been migrated to 'coordinator'

-- Update profiles table (system_role)
ALTER TABLE profiles 
ALTER COLUMN role TYPE system_role_new 
USING role::text::system_role_new;

-- Update project_roles table (project_role) - THIS WAS MISSING BEFORE
ALTER TABLE project_roles 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

-- Update project_role_templates table (project_role)
ALTER TABLE project_role_templates 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

-- Update team_assignments table (project_role)
ALTER TABLE team_assignments 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

-- Step 3: Drop old enum types and rename new ones
DROP TYPE system_role;
DROP TYPE project_role;
ALTER TYPE system_role_new RENAME TO system_role;
ALTER TYPE project_role_new RENAME TO project_role;

-- Step 4: Verify cleanup success
-- These queries should now fail with "invalid input value for enum" errors
-- (That's what we want - it means the old enum values are gone)

-- Uncomment these to test (they should fail):
-- SELECT COUNT(*) FROM profiles WHERE role = 'talent_logistics_coordinator';
-- SELECT COUNT(*) FROM project_roles WHERE role = 'talent_logistics_coordinator';
-- SELECT COUNT(*) FROM team_assignments WHERE role = 'talent_logistics_coordinator';
-- SELECT COUNT(*) FROM project_role_templates WHERE role = 'talent_logistics_coordinator';

-- Step 5: Verify new enum structure
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

-- ============================================================================
-- SUCCESS CRITERIA:
-- 1. All ALTER TABLE commands complete without errors
-- 2. Old enum types are dropped and renamed successfully  
-- 3. Final enum query shows no talent_logistics_coordinator values
-- 4. Test queries for old enum values fail with enum errors
-- ============================================================================