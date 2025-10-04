-- Modify talent_daily_assignments table to support floater assignments
-- Make talent_id nullable so NULL values can represent floater assignments

-- Step 1: Make talent_id nullable
ALTER TABLE talent_daily_assignments 
ALTER COLUMN talent_id DROP NOT NULL;

-- Step 2: Add a check constraint to ensure either talent_id OR escort_id is provided
-- (We don't want completely empty assignments)
ALTER TABLE talent_daily_assignments 
ADD CONSTRAINT talent_daily_assignments_valid_assignment 
CHECK (talent_id IS NOT NULL OR escort_id IS NOT NULL);

-- Step 3: Update the foreign key constraint to be nullable
ALTER TABLE talent_daily_assignments 
DROP CONSTRAINT IF EXISTS talent_daily_assignments_talent_id_fkey;

ALTER TABLE talent_daily_assignments 
ADD CONSTRAINT talent_daily_assignments_talent_id_fkey 
FOREIGN KEY (talent_id) REFERENCES talent(id) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Step 4: Add an index for floater queries (where talent_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_talent_daily_assignments_floaters 
ON talent_daily_assignments (project_id, assignment_date) 
WHERE talent_id IS NULL;

-- Step 5: Add a comment to document the floater functionality
COMMENT ON COLUMN talent_daily_assignments.talent_id IS 'References specific talent. NULL indicates this is a floater assignment (escort can manage any talent)';

-- Step 6: Update the unique constraint to handle floaters properly
-- Drop existing constraint if it exists
ALTER TABLE talent_daily_assignments 
DROP CONSTRAINT IF EXISTS talent_daily_assignments_talent_id_project_id_assignment_date_key;

-- Create a unique index that handles both talent assignments and floater assignments
-- For talent assignments: unique on (talent_id, project_id, assignment_date, escort_id) where talent_id IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS talent_daily_assignments_talent_unique
ON talent_daily_assignments (talent_id, project_id, assignment_date, escort_id)
WHERE talent_id IS NOT NULL;

-- For floater assignments: allow multiple floaters per date but unique escort assignments
CREATE UNIQUE INDEX IF NOT EXISTS talent_daily_assignments_floater_unique
ON talent_daily_assignments (project_id, assignment_date, escort_id)
WHERE talent_id IS NULL AND escort_id IS NOT NULL;