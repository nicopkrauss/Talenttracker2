-- Fix for group assignment constraints
-- This addresses two issues:
-- 1. Make escort_id nullable in group_daily_assignments for scheduling without assignment
-- 2. Remove the problematic talent_project_assignments creation for groups

-- 1. Make escort_id nullable in group_daily_assignments
ALTER TABLE group_daily_assignments 
ALTER COLUMN escort_id DROP NOT NULL;

-- Update the unique constraint to handle nullable escort_id properly
-- Drop the existing constraint first
ALTER TABLE group_daily_assignments 
DROP CONSTRAINT IF EXISTS group_daily_assignments_group_id_project_id_assignment_date_escort_key;

-- Add a new unique constraint that allows multiple null escort_id values for the same group/date
-- This uses a partial unique index to handle the nullable escort_id properly
CREATE UNIQUE INDEX group_daily_assignments_unique_with_escort 
ON group_daily_assignments (group_id, project_id, assignment_date, escort_id) 
WHERE escort_id IS NOT NULL;

-- Allow only one null escort_id per group/project/date combination
CREATE UNIQUE INDEX group_daily_assignments_unique_without_escort 
ON group_daily_assignments (group_id, project_id, assignment_date) 
WHERE escort_id IS NULL;

-- Add a comment to explain the constraint logic
COMMENT ON TABLE group_daily_assignments IS 
'Tracks daily escort assignments for talent groups. escort_id can be null for scheduled but unassigned dates. Unique constraints ensure: 1) Only one escort per group/date when assigned, 2) Only one unassigned entry per group/date when not assigned.';