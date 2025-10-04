-- Fix talent_daily_assignments table to allow NULL escort_id for scheduling without assignment
-- This allows talent to be scheduled for dates without being assigned to a specific escort

-- Make escort_id nullable in talent_daily_assignments table
ALTER TABLE talent_daily_assignments 
ALTER COLUMN escort_id DROP NOT NULL;

-- Update the unique constraint to handle NULL escort_id properly
-- Drop the existing unique constraint
ALTER TABLE talent_daily_assignments 
DROP CONSTRAINT IF EXISTS talent_daily_assignments_talent_id_project_id_assignment_date_key;

-- Add a new unique constraint that allows multiple NULL escort_id values for the same talent/project/date
-- This constraint ensures that a talent can only be assigned to one escort per date, but allows scheduling without assignment
CREATE UNIQUE INDEX talent_daily_assignments_unique_assignment 
ON talent_daily_assignments (talent_id, project_id, assignment_date, escort_id)
WHERE escort_id IS NOT NULL;

-- Add a separate unique constraint for scheduling entries (where escort_id is NULL)
-- This ensures only one scheduling entry per talent/project/date when no escort is assigned
CREATE UNIQUE INDEX talent_daily_assignments_unique_scheduling
ON talent_daily_assignments (talent_id, project_id, assignment_date)
WHERE escort_id IS NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN talent_daily_assignments.escort_id IS 'Escort assigned to this talent for this date. NULL indicates talent is scheduled but not yet assigned to an escort.';