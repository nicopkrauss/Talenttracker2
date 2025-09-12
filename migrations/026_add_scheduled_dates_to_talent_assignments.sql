-- Migration: Add scheduled_dates column to talent_project_assignments for multi-day scheduling
-- This allows individual talent to be scheduled for specific days

-- Add scheduled_dates column to talent_project_assignments
ALTER TABLE talent_project_assignments 
ADD COLUMN IF NOT EXISTS scheduled_dates DATE[] NOT NULL DEFAULT '{}';

-- Add index for performance on date array queries
CREATE INDEX IF NOT EXISTS idx_talent_assignments_scheduled_dates 
ON talent_project_assignments USING GIN(scheduled_dates);

-- Add comment for documentation
COMMENT ON COLUMN talent_project_assignments.scheduled_dates IS 'Array of dates when this talent is scheduled to perform';