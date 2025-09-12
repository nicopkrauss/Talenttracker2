-- Migration: Add availability tracking columns to team_assignments table
-- This supports the multi-day scheduling team availability confirmation workflow

-- Add availability tracking columns
ALTER TABLE team_assignments 
ADD COLUMN available_dates DATE[] DEFAULT '{}',
ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of availability dates
CREATE INDEX idx_team_assignments_available_dates ON team_assignments USING GIN (available_dates);

-- Add index for confirmed_at for filtering confirmed vs pending assignments
CREATE INDEX idx_team_assignments_confirmed_at ON team_assignments (confirmed_at);

-- Add comment to document the new columns
COMMENT ON COLUMN team_assignments.available_dates IS 'Array of dates when the team member is available for the project';
COMMENT ON COLUMN team_assignments.confirmed_at IS 'Timestamp when the team member availability was confirmed';