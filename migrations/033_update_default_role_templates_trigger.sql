-- Migration: Update default role templates trigger
-- Date: 2024-01-29
-- Description: Updates the trigger function to use correct role names and add is_default flag

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_create_default_role_templates ON projects;
DROP FUNCTION IF EXISTS create_default_role_templates();

-- Add is_default column if it doesn't exist
ALTER TABLE project_role_templates 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Create updated trigger function with correct role names and is_default flag
CREATE OR REPLACE FUNCTION create_default_role_templates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default role templates for new project with updated role names
    INSERT INTO project_role_templates (
        project_id, 
        role, 
        display_name, 
        base_pay_rate, 
        time_type, 
        sort_order, 
        is_default,
        description
    )
    VALUES 
        (
            NEW.id, 
            'supervisor', 
            'Supervisor', 
            300.00, 
            'daily', 
            1, 
            true,
            'On-site management with day rate tracking'
        ),
        (
            NEW.id, 
            'coordinator', 
            'Coordinator', 
            350.00, 
            'daily', 
            2, 
            true,
            'Informational oversight role with day rate tracking'
        ),
        (
            NEW.id, 
            'talent_escort', 
            'Talent Escort', 
            25.00, 
            'hourly', 
            3, 
            true,
            'On-the-ground operations with hourly tracking'
        );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_create_default_role_templates
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_default_role_templates();

-- Update existing role templates to fix any old role names (if any exist)
UPDATE project_role_templates 
SET role = 'coordinator' 
WHERE role = 'talent_logistics_coordinator';

-- Update display names to be more consistent
UPDATE project_role_templates 
SET display_name = 'Talent Escort' 
WHERE role = 'talent_escort' AND display_name = 'Escort';

-- Set default flags for existing templates (one per role per project)
WITH ranked_templates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY project_id, role ORDER BY created_at ASC) as rn
    FROM project_role_templates
    WHERE is_default IS NULL OR is_default = false
)
UPDATE project_role_templates 
SET is_default = true 
WHERE id IN (
    SELECT id FROM ranked_templates WHERE rn = 1
);

-- Create unique constraint for default templates (only one default per role per project)
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_role_templates_default_unique 
ON project_role_templates (project_id, role) 
WHERE is_default = true;

-- Add comment to the table
COMMENT ON TABLE project_role_templates IS 'Project-specific role templates with customizable pay rates and settings. Default templates are automatically created when a project is created.';
COMMENT ON COLUMN project_role_templates.is_default IS 'Indicates if this is the default template for this role in this project. Only one default per role per project is allowed.';