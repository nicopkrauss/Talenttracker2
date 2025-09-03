-- ============================================================================
-- COORDINATOR ROLE MIGRATION - STEP 2: Migrate Data
-- Execute this AFTER step 1 has been completed and committed
-- ============================================================================

-- Migrate all existing data from 'talent_logistics_coordinator' to 'coordinator'
-- This must be done in a separate transaction after the enum values are committed

BEGIN;

-- Update profiles table (system_role)
UPDATE profiles 
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

COMMIT;

-- ============================================================================
-- Verification queries (run these after the migration)
-- ============================================================================

-- These should return 0 rows (no old role names remaining)
SELECT COUNT(*) as remaining_profiles FROM profiles WHERE role = 'talent_logistics_coordinator';
SELECT COUNT(*) as remaining_templates FROM project_role_templates WHERE role = 'talent_logistics_coordinator';
SELECT COUNT(*) as remaining_assignments FROM team_assignments WHERE role = 'talent_logistics_coordinator';

-- These should show the migrated counts
SELECT COUNT(*) as coordinator_profiles FROM profiles WHERE role = 'coordinator';
SELECT COUNT(*) as coordinator_templates FROM project_role_templates WHERE role = 'coordinator';
SELECT COUNT(*) as coordinator_assignments FROM team_assignments WHERE role = 'coordinator';

-- Expected results after migration:
-- coordinator_profiles: 18
-- coordinator_templates: 6
-- coordinator_assignments: 4
-- remaining_*: 0