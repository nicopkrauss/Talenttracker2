-- Migration: Create Project Readiness System
-- This migration replaces the rigid project_setup_checklist with a flexible readiness system

-- Create the new project_readiness table
CREATE TABLE IF NOT EXISTS project_readiness (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Locations
  has_default_locations BOOLEAN DEFAULT TRUE,
  custom_location_count INTEGER DEFAULT 0,
  locations_finalized BOOLEAN DEFAULT FALSE,
  locations_finalized_at TIMESTAMP WITH TIME ZONE,
  locations_finalized_by UUID REFERENCES profiles(id),
  locations_status VARCHAR(20) DEFAULT 'default-only' CHECK (locations_status IN ('default-only', 'configured', 'finalized')),
  
  -- Roles
  has_default_roles BOOLEAN DEFAULT TRUE,
  custom_role_count INTEGER DEFAULT 0,
  roles_finalized BOOLEAN DEFAULT FALSE,
  roles_finalized_at TIMESTAMP WITH TIME ZONE,
  roles_finalized_by UUID REFERENCES profiles(id),
  roles_status VARCHAR(20) DEFAULT 'default-only' CHECK (roles_status IN ('default-only', 'configured', 'finalized')),
  
  -- Team
  total_staff_assigned INTEGER DEFAULT 0,
  supervisor_count INTEGER DEFAULT 0,
  escort_count INTEGER DEFAULT 0,
  coordinator_count INTEGER DEFAULT 0,
  team_finalized BOOLEAN DEFAULT FALSE,
  team_finalized_at TIMESTAMP WITH TIME ZONE,
  team_finalized_by UUID REFERENCES profiles(id),
  team_status VARCHAR(20) DEFAULT 'none' CHECK (team_status IN ('none', 'partial', 'finalized')),
  
  -- Talent
  total_talent INTEGER DEFAULT 0,
  talent_finalized BOOLEAN DEFAULT FALSE,
  talent_finalized_at TIMESTAMP WITH TIME ZONE,
  talent_finalized_by UUID REFERENCES profiles(id),
  talent_status VARCHAR(20) DEFAULT 'none' CHECK (talent_status IN ('none', 'partial', 'finalized')),
  
  -- Assignment Progress
  assignments_status VARCHAR(20) DEFAULT 'none' CHECK (assignments_status IN ('none', 'partial', 'current', 'complete')),
  urgent_assignment_issues INTEGER DEFAULT 0,
  
  -- Overall
  overall_status VARCHAR(20) DEFAULT 'getting-started' CHECK (overall_status IN ('getting-started', 'operational', 'production-ready')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_readiness_overall_status ON project_readiness(overall_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_last_updated ON project_readiness(last_updated);
CREATE INDEX IF NOT EXISTS idx_project_readiness_urgent_issues ON project_readiness(urgent_assignment_issues);
CREATE INDEX IF NOT EXISTS idx_project_readiness_locations_status ON project_readiness(locations_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_roles_status ON project_readiness(roles_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_team_status ON project_readiness(team_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_talent_status ON project_readiness(talent_status);

-- Function to calculate readiness metrics
CREATE OR REPLACE FUNCTION calculate_project_readiness(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_custom_locations INTEGER;
  v_custom_roles INTEGER;
  v_total_staff INTEGER;
  v_supervisor_count INTEGER;
  v_escort_count INTEGER;
  v_coordinator_count INTEGER;
  v_total_talent INTEGER;
  v_locations_status VARCHAR(20);
  v_roles_status VARCHAR(20);
  v_team_status VARCHAR(20);
  v_talent_status VARCHAR(20);
  v_overall_status VARCHAR(20);
BEGIN
  -- Calculate location metrics
  SELECT COUNT(*) INTO v_custom_locations
  FROM project_locations 
  WHERE project_id = p_project_id AND is_default = FALSE;
  
  -- Calculate role metrics (custom role templates beyond defaults)
  SELECT COUNT(*) INTO v_custom_roles
  FROM project_role_templates 
  WHERE project_id = p_project_id AND is_default = FALSE;
  
  -- Calculate team metrics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN role = 'supervisor' THEN 1 END),
    COUNT(CASE WHEN role = 'talent_escort' THEN 1 END),
    COUNT(CASE WHEN role = 'coordinator' THEN 1 END)
  INTO v_total_staff, v_supervisor_count, v_escort_count, v_coordinator_count
  FROM team_assignments 
  WHERE project_id = p_project_id;
  
  -- Calculate talent metrics
  SELECT COUNT(*) INTO v_total_talent
  FROM talent_project_assignments 
  WHERE project_id = p_project_id;
  
  -- Determine status levels
  SELECT 
    CASE 
      WHEN locations_finalized THEN 'finalized'
      WHEN v_custom_locations > 0 THEN 'configured'
      ELSE 'default-only'
    END,
    CASE 
      WHEN roles_finalized THEN 'finalized'
      WHEN v_custom_roles > 0 THEN 'configured'
      ELSE 'default-only'
    END,
    CASE 
      WHEN team_finalized THEN 'finalized'
      WHEN v_total_staff > 0 THEN 'partial'
      ELSE 'none'
    END,
    CASE 
      WHEN talent_finalized THEN 'finalized'
      WHEN v_total_talent > 0 THEN 'partial'
      ELSE 'none'
    END
  INTO v_locations_status, v_roles_status, v_team_status, v_talent_status
  FROM project_readiness 
  WHERE project_id = p_project_id;
  
  -- Determine overall status
  IF v_total_staff > 0 AND v_total_talent > 0 AND v_escort_count > 0 THEN
    v_overall_status := 'operational';
    IF v_locations_status = 'finalized' AND v_roles_status = 'finalized' AND 
       v_team_status = 'finalized' AND v_talent_status = 'finalized' THEN
      v_overall_status := 'production-ready';
    END IF;
  ELSE
    v_overall_status := 'getting-started';
  END IF;
  
  -- Update the readiness record
  UPDATE project_readiness SET
    custom_location_count = v_custom_locations,
    custom_role_count = v_custom_roles,
    total_staff_assigned = v_total_staff,
    supervisor_count = v_supervisor_count,
    escort_count = v_escort_count,
    coordinator_count = v_coordinator_count,
    total_talent = v_total_talent,
    locations_status = v_locations_status,
    roles_status = v_roles_status,
    team_status = v_team_status,
    talent_status = v_talent_status,
    overall_status = v_overall_status,
    last_updated = NOW(),
    updated_at = NOW()
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update readiness when related data changes
CREATE OR REPLACE FUNCTION trigger_update_project_readiness()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle different table operations
  IF TG_TABLE_NAME = 'projects' THEN
    -- For projects table, use NEW.id or OLD.id
    IF TG_OP = 'DELETE' THEN
      -- Project deleted, readiness will be cascade deleted
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.id);
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'project_locations' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM calculate_project_readiness(OLD.project_id);
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.project_id);
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'project_role_templates' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM calculate_project_readiness(OLD.project_id);
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.project_id);
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'team_assignments' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM calculate_project_readiness(OLD.project_id);
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.project_id);
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'talent_project_assignments' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM calculate_project_readiness(OLD.project_id);
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.project_id);
      RETURN NEW;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic readiness updates
CREATE TRIGGER trigger_projects_readiness_update
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

CREATE TRIGGER trigger_project_locations_readiness_update
  AFTER INSERT OR UPDATE OR DELETE ON project_locations
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

CREATE TRIGGER trigger_project_role_templates_readiness_update
  AFTER INSERT OR UPDATE OR DELETE ON project_role_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

CREATE TRIGGER trigger_team_assignments_readiness_update
  AFTER INSERT OR UPDATE OR DELETE ON team_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

CREATE TRIGGER trigger_talent_assignments_readiness_update
  AFTER INSERT OR UPDATE OR DELETE ON talent_project_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

-- Migrate existing data from project_setup_checklist
INSERT INTO project_readiness (
  project_id,
  locations_finalized,
  locations_finalized_at,
  roles_finalized,
  roles_finalized_at,
  team_finalized,
  team_finalized_at,
  talent_finalized,
  talent_finalized_at,
  created_at,
  updated_at
)
SELECT 
  psc.project_id,
  psc.locations_completed,
  CASE WHEN psc.locations_completed THEN psc.updated_at END,
  psc.roles_and_pay_completed,
  CASE WHEN psc.roles_and_pay_completed THEN psc.updated_at END,
  psc.team_assignments_completed,
  CASE WHEN psc.team_assignments_completed THEN psc.updated_at END,
  psc.talent_roster_completed,
  CASE WHEN psc.talent_roster_completed THEN psc.updated_at END,
  psc.created_at,
  psc.updated_at
FROM project_setup_checklist psc
ON CONFLICT (project_id) DO NOTHING;

-- Create readiness records for projects that don't have checklist entries
INSERT INTO project_readiness (project_id)
SELECT p.id 
FROM projects p
WHERE p.id NOT IN (SELECT project_id FROM project_readiness)
ON CONFLICT (project_id) DO NOTHING;

-- Calculate initial readiness metrics for all projects
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT id FROM projects LOOP
    PERFORM calculate_project_readiness(project_record.id);
  END LOOP;
END $$;

-- Drop the old project_setup_checklist table
DROP TABLE IF EXISTS project_setup_checklist CASCADE;

-- Add comment for documentation
COMMENT ON TABLE project_readiness IS 'Flexible project readiness tracking system that replaces the rigid setup checklist';
COMMENT ON FUNCTION calculate_project_readiness(UUID) IS 'Calculates and updates all readiness metrics for a project based on current data';
COMMENT ON FUNCTION trigger_update_project_readiness() IS 'Trigger function to automatically update project readiness when related data changes';