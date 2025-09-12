-- Migration: Add missing availability columns to team_assignments table
-- Date: 2025-01-09
-- Description: Add available_dates and confirmed_at columns that were accidentally removed

-- Add available_dates column to store array of available dates
ALTER TABLE team_assignments 
ADD COLUMN available_dates TEXT[] DEFAULT NULL;

-- Add confirmed_at column to track when availability was confirmed
ALTER TABLE team_assignments 
ADD COLUMN confirmed_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN team_assignments.available_dates IS 'Array of ISO date strings representing dates the team member is available';
COMMENT ON COLUMN team_assignments.confirmed_at IS 'Timestamp when the team member confirmed their availability';

-- Create index for efficient querying of availability
CREATE INDEX idx_team_assignments_confirmed_at ON team_assignments(confirmed_at);
CREATE INDEX idx_team_assignments_available_dates ON team_assignments USING GIN(available_dates);