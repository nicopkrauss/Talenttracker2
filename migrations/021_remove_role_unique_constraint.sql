-- Migration: Remove unique constraint on project_id, role to allow multiple templates per role
-- Date: 2024-01-20
-- Description: Allows multiple role templates for the same role within a project (e.g., Senior Coordinator, Junior Coordinator)

-- Drop the unique constraint that prevents multiple templates per role
ALTER TABLE project_role_templates DROP CONSTRAINT project_role_templates_project_id_role_key;

-- Add a unique constraint on project_id, role, display_name instead
-- This prevents duplicate display names for the same role within a project
ALTER TABLE project_role_templates ADD CONSTRAINT project_role_templates_project_role_name_unique 
    UNIQUE(project_id, role, display_name);

-- Update the Prisma schema comment
COMMENT ON CONSTRAINT project_role_templates_project_role_name_unique ON project_role_templates 
    IS 'Ensures unique display names per role within a project';