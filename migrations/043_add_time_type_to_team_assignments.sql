-- Migration: Add time_type column to team_assignments table
-- This will store whether the assignment is 'hourly' or 'daily' directly on the assignment
-- eliminating the need to look up role templates for pay rate display

-- Add the time_type column
ALTER TABLE team_assignments 
ADD COLUMN time_type VARCHAR(10) CHECK (time_type IN ('hourly', 'daily'));

-- Update existing assignments based on their role templates
-- First, update based on common role patterns
UPDATE team_assignments 
SET time_type = 'hourly' 
WHERE role = 'talent_escort';

UPDATE team_assignments 
SET time_type = 'daily' 
WHERE role IN ('supervisor', 'coordinator');

-- For any remaining assignments, update based on their project's role templates
UPDATE team_assignments 
SET time_type = (
  SELECT prt.time_type 
  FROM project_role_templates prt 
  WHERE prt.project_id = team_assignments.project_id 
    AND prt.role = team_assignments.role 
    AND prt.is_default = true
  LIMIT 1
)
WHERE time_type IS NULL;

-- Set a default for any remaining null values (fallback to hourly)
UPDATE team_assignments 
SET time_type = 'hourly' 
WHERE time_type IS NULL;

-- Make the column NOT NULL after populating data
ALTER TABLE team_assignments 
ALTER COLUMN time_type SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_team_assignments_time_type ON team_assignments(time_type);

-- Add comment
COMMENT ON COLUMN team_assignments.time_type IS 'Whether this assignment is paid hourly or daily';