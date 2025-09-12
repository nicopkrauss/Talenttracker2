-- Migration: Add display_order to talent_groups for unified ordering
-- This allows talent and groups to be ordered together in the same sequence

-- Add display_order column to talent_groups
ALTER TABLE talent_groups 
ADD COLUMN display_order INT DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX idx_talent_groups_display_order 
ON talent_groups(project_id, display_order);

-- Initialize display_order for existing groups
-- Set them to high values so they appear after existing talent
UPDATE talent_groups 
SET display_order = (
  SELECT COALESCE(MAX(display_order), 0) + ROW_NUMBER() OVER (ORDER BY created_at) + 1000
  FROM talent_project_assignments 
  WHERE talent_project_assignments.project_id = talent_groups.project_id
)
WHERE display_order = 0;

-- Update Prisma schema comment
COMMENT ON COLUMN talent_groups.display_order IS 'Display order for unified talent/group sorting. Shares sequence with talent_project_assignments.display_order';