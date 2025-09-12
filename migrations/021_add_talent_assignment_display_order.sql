-- Add display_order column to talent_project_assignments for drag-to-reorder functionality
-- Migration: 021_add_talent_assignment_display_order.sql

-- Add display_order column with default value
ALTER TABLE talent_project_assignments 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_display_order 
ON talent_project_assignments(project_id, display_order);

-- Update existing records to have sequential display_order values
-- This ensures existing talent assignments have proper ordering
WITH ordered_assignments AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as new_order
  FROM talent_project_assignments
)
UPDATE talent_project_assignments 
SET display_order = ordered_assignments.new_order
FROM ordered_assignments 
WHERE talent_project_assignments.id = ordered_assignments.id;

-- Add comment for documentation
COMMENT ON COLUMN talent_project_assignments.display_order IS 'Display order for talent assignments within a project (for drag-to-reorder functionality)';