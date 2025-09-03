-- ============================================================================
-- COORDINATOR ROLE MIGRATION - STEP 1: Add Enum Values
-- Execute this FIRST, then run step 2 in a separate transaction
-- ============================================================================

-- Add coordinator enum values to both role enums
-- This must be done in a separate transaction before using the values

BEGIN;

-- Add 'coordinator' to system_role enum
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'coordinator';

-- Add 'coordinator' to project_role enum  
ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'coordinator';

COMMIT;

-- ============================================================================
-- After running this, proceed to coordinator-migration-step2-data.sql
-- ============================================================================