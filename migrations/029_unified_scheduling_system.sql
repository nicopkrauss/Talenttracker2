-- Migration to implement unified scheduling system using daily assignment tables
-- This eliminates the hybrid model and uses a single source of truth

-- First, drop the problematic triggers and functions
DROP TRIGGER IF EXISTS trigger_update_talent_scheduled_dates_on_insert ON talent_daily_assignments;
DROP TRIGGER IF EXISTS trigger_update_talent_scheduled_dates_on_update ON talent_daily_assignments;
DROP TRIGGER IF EXISTS trigger_update_talent_scheduled_dates_on_delete ON talent_daily_assignments;
DROP TRIGGER IF EXISTS trigger_update_group_scheduled_dates_on_insert ON group_daily_assignments;
DROP TRIGGER IF EXISTS trigger_update_group_scheduled_dates_on_update ON group_daily_assignments;
DROP TRIGGER IF EXISTS trigger_update_group_scheduled_dates_on_delete ON group_daily_assignments;
DROP FUNCTION IF EXISTS update_talent_scheduled_dates();
DROP FUNCTION IF EXISTS update_group_scheduled_dates();

-- Modify daily assignment tables to allow NULL escort_id (for scheduling without assignment)
ALTER TABLE talent_daily_assignments ALTER COLUMN escort_id DROP NOT NULL;
ALTER TABLE group_daily_assignments ALTER COLUMN escort_id DROP NOT NULL;

-- Remove scheduled_dates columns from the old system (test data only)
ALTER TABLE talent_project_assignments DROP COLUMN IF EXISTS scheduled_dates;
ALTER TABLE talent_groups DROP COLUMN IF EXISTS scheduled_dates;

-- Create indexes for better performance on NULL escort_id queries
CREATE INDEX IF NOT EXISTS idx_talent_daily_assignments_null_escort 
  ON talent_daily_assignments(project_id, assignment_date) 
  WHERE escort_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_group_daily_assignments_null_escort 
  ON group_daily_assignments(project_id, assignment_date) 
  WHERE escort_id IS NULL;

-- Create indexes for assigned escorts
CREATE INDEX IF NOT EXISTS idx_talent_daily_assignments_assigned 
  ON talent_daily_assignments(project_id, assignment_date, escort_id) 
  WHERE escort_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_group_daily_assignments_assigned 
  ON group_daily_assignments(project_id, assignment_date, escort_id) 
  WHERE escort_id IS NOT NULL;

-- Add comments to document the new system
COMMENT ON TABLE talent_daily_assignments IS 'Unified scheduling and assignment table. escort_id NULL = scheduled but unassigned, escort_id NOT NULL = assigned';
COMMENT ON TABLE group_daily_assignments IS 'Unified scheduling and assignment table. escort_id NULL = scheduled but unassigned, escort_id NOT NULL = assigned';
COMMENT ON COLUMN talent_daily_assignments.escort_id IS 'NULL = scheduled but unassigned, UUID = assigned to specific escort';
COMMENT ON COLUMN group_daily_assignments.escort_id IS 'NULL = scheduled but unassigned, UUID = assigned to specific escort';