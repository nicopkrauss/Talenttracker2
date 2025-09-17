-- Fix readiness functions to match actual materialized view structure

-- Drop existing functions
DROP FUNCTION IF EXISTS get_project_readiness(UUID);
DROP FUNCTION IF EXISTS get_projects_readiness(UUID[]);

-- Create simplified function that matches the actual view structure
CREATE OR REPLACE FUNCTION get_project_readiness(p_project_id UUID)
RETURNS TABLE(
  project_id UUID,
  project_name VARCHAR,
  project_status VARCHAR,
  readiness_status VARCHAR,
  has_role_templates BOOLEAN,
  has_team_assignments BOOLEAN,
  has_locations BOOLEAN,
  has_talent_roster BOOLEAN,
  team_management_available BOOLEAN,
  talent_tracking_available BOOLEAN,
  scheduling_available BOOLEAN,
  time_tracking_available BOOLEAN,
  blocking_issues TEXT[],
  available_features TEXT[],
  calculated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    prs.project_id,
    prs.project_name,
    prs.project_status,
    prs.readiness_status,
    prs.has_role_templates,
    prs.has_team_assignments,
    prs.has_locations,
    prs.has_talent_roster,
    prs.team_management_available,
    prs.talent_tracking_available,
    prs.scheduling_available,
    prs.time_tracking_available,
    prs.blocking_issues,
    prs.available_features,
    prs.calculated_at
  FROM project_readiness_summary prs
  WHERE prs.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Create simplified function for multiple projects
CREATE OR REPLACE FUNCTION get_projects_readiness(p_project_ids UUID[] DEFAULT NULL)
RETURNS TABLE(
  project_id UUID,
  project_name VARCHAR,
  project_status VARCHAR,
  readiness_status VARCHAR,
  has_role_templates BOOLEAN,
  has_team_assignments BOOLEAN,
  has_locations BOOLEAN,
  has_talent_roster BOOLEAN,
  team_management_available BOOLEAN,
  talent_tracking_available BOOLEAN,
  scheduling_available BOOLEAN,
  time_tracking_available BOOLEAN,
  blocking_issues TEXT[],
  available_features TEXT[],
  calculated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    prs.project_id,
    prs.project_name,
    prs.project_status,
    prs.readiness_status,
    prs.has_role_templates,
    prs.has_team_assignments,
    prs.has_locations,
    prs.has_talent_roster,
    prs.team_management_available,
    prs.talent_tracking_available,
    prs.scheduling_available,
    prs.time_tracking_available,
    prs.blocking_issues,
    prs.available_features,
    prs.calculated_at
  FROM project_readiness_summary prs
  WHERE (p_project_ids IS NULL OR prs.project_id = ANY(p_project_ids))
  ORDER BY prs.project_name;
END;
$$ LANGUAGE plpgsql;