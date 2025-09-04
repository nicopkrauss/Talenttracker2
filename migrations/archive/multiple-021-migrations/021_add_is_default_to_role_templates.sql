-- Add is_default column to project_role_templates table
-- This allows marking one template per role as the default for quick assignment

-- Add the is_default column
ALTER TABLE project_role_templates 
ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- Create a unique constraint to ensure only one default per role per project
CREATE UNIQUE INDEX idx_project_role_templates_default_unique 
ON project_role_templates (project_id, role) 
WHERE is_default = true;

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_project_role_templates_default_unique IS 
'Ensures only one default template per role per project';

-- Update existing templates to set the first one for each role as default
-- This handles existing data gracefully
WITH first_templates AS (
  SELECT DISTINCT ON (project_id, role) 
    id, project_id, role
  FROM project_role_templates 
  WHERE is_active = true
  ORDER BY project_id, role, created_at ASC
)
UPDATE project_role_templates 
SET is_default = true 
WHERE id IN (SELECT id FROM first_templates);