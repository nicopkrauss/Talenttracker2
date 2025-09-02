-- Migration: Create project role templates table
-- Date: 2024-01-20
-- Description: Creates a table for project-specific role templates with customizable pay rates and settings

-- Create the project_role_templates table
CREATE TABLE project_role_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role project_role NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    base_pay_rate DECIMAL(10,2) NOT NULL,
    time_type VARCHAR(20) NOT NULL DEFAULT 'hourly' CHECK (time_type IN ('hourly', 'daily')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique role per project
    UNIQUE(project_id, role)
);

-- Create indexes for performance
CREATE INDEX idx_project_role_templates_project_id ON project_role_templates(project_id);
CREATE INDEX idx_project_role_templates_role ON project_role_templates(role);
CREATE INDEX idx_project_role_templates_active ON project_role_templates(project_id, is_active);
CREATE INDEX idx_project_role_templates_sort ON project_role_templates(project_id, sort_order);

-- Create default role templates for existing projects
INSERT INTO project_role_templates (project_id, role, display_name, base_pay_rate, time_type, sort_order)
SELECT 
    p.id as project_id,
    'supervisor' as role,
    'Supervisor' as display_name,
    300.00 as base_pay_rate,
    'daily' as time_type,
    1 as sort_order
FROM projects p
WHERE p.status IN ('prep', 'active');

INSERT INTO project_role_templates (project_id, role, display_name, base_pay_rate, time_type, sort_order)
SELECT 
    p.id as project_id,
    'talent_logistics_coordinator' as role,
    'Talent Logistics Coordinator' as display_name,
    350.00 as base_pay_rate,
    'daily' as time_type,
    2 as sort_order
FROM projects p
WHERE p.status IN ('prep', 'active');

INSERT INTO project_role_templates (project_id, role, display_name, base_pay_rate, time_type, sort_order)
SELECT 
    p.id as project_id,
    'talent_escort' as role,
    'Escort' as display_name,
    20.00 as base_pay_rate,
    'hourly' as time_type,
    3 as sort_order
FROM projects p
WHERE p.status IN ('prep', 'active');

-- Add trigger to automatically create default role templates for new projects
CREATE OR REPLACE FUNCTION create_default_role_templates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default role templates for new project
    INSERT INTO project_role_templates (project_id, role, display_name, base_pay_rate, time_type, sort_order)
    VALUES 
        (NEW.id, 'supervisor', 'Supervisor', 300.00, 'daily', 1),
        (NEW.id, 'talent_logistics_coordinator', 'Talent Logistics Coordinator', 350.00, 'daily', 2),
        (NEW.id, 'talent_escort', 'Escort', 20.00, 'hourly', 3);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_role_templates
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_default_role_templates();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_project_role_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_role_templates_updated_at
    BEFORE UPDATE ON project_role_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_project_role_templates_updated_at();