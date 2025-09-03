-- ============================================================================
-- COORDINATOR ROLE MIGRATION SQL COMMANDS
-- Execute these commands in your Supabase SQL Editor or psql
-- IMPORTANT: Execute in TWO separate transactions as shown below
-- ============================================================================

-- ============================================================================
-- TRANSACTION 1: Add enum values (Execute this first, then COMMIT)
-- ============================================================================
BEGIN;
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'coordinator';
ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'coordinator';
COMMIT;

-- ============================================================================
-- TRANSACTION 2: Migrate data (Execute this after the first transaction)
-- ============================================================================
BEGIN;
UPDATE profiles SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';
UPDATE project_role_templates SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';
UPDATE team_assignments SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';
COMMIT;

-- Step 3: Verify migration (these should return 0 rows)
SELECT COUNT(*) as remaining_profiles FROM profiles WHERE role = 'talent_logistics_coordinator';
SELECT COUNT(*) as remaining_templates FROM project_role_templates WHERE role = 'talent_logistics_coordinator';
SELECT COUNT(*) as remaining_assignments FROM team_assignments WHERE role = 'talent_logistics_coordinator';

-- Step 4: Check migrated data (these should show the migrated counts)
SELECT COUNT(*) as coordinator_profiles FROM profiles WHERE role = 'coordinator';
SELECT COUNT(*) as coordinator_templates FROM project_role_templates WHERE role = 'coordinator';
SELECT COUNT(*) as coordinator_assignments FROM team_assignments WHERE role = 'coordinator';

-- Expected results after migration:
-- coordinator_profiles: 18
-- coordinator_templates: 6
-- coordinator_assignments: 4

-- ============================================================================