-- Migration: Fix Readiness Function Signatures
-- This migration corrects the function return types to match the actual materialized view structure

-- Drop existing functions with incorrect signatures
DROP FUNCTION IF EXISTS get_project_readiness(UUID);
DROP FUNCTION IF EXISTS get_projects_readiness(UUID[]);

-- Create properly typed function for single project readiness
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
  role_template_count BIGINT,
  team_assignment_count BIGINT,
  location_count BIGINT,
  talent_count BIGINT,
  calculated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
    prs.role_template_count,
    prs.team_assignment_count,
    prs.location_count,
    prs.talent_count,
    prs.calculated_at,
    prs.created_at,
    prs.updated_at
  FROM project_readiness_summary prs
  WHERE prs.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Create properly typed function for multiple projects readiness
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
  role_template_count BIGINT,
  team_assignment_count BIGINT,
  location_count BIGINT,
  talent_count BIGINT,
  calculated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
    prs.role_template_count,
    prs.team_assignment_count,
    prs.location_count,
    prs.talent_count,
    prs.calculated_at,
    prs.created_at,
    prs.updated_at
  FROM project_readiness_summary prs
  WHERE (p_project_ids IS NULL OR prs.project_id = ANY(p_project_ids))
  ORDER BY prs.project_name;
END;
$$ LANGUAGE plpgsql;

-- Add function for getting readiness statistics (useful for dashboards)
CREATE OR REPLACE FUNCTION get_readiness_statistics()
RETURNS TABLE(
  total_projects BIGINT,
  setup_required_count BIGINT,
  ready_for_activation_count BIGINT,
  active_count BIGINT,
  team_management_available_count BIGINT,
  talent_tracking_available_count BIGINT,
  scheduling_available_count BIGINT,
  time_tracking_available_count BIGINT,
  avg_role_templates NUMERIC,
  avg_team_assignments NUMERIC,
  avg_locations NUMERIC,
  avg_talent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_projects,
    COUNT(*) FILTER (WHERE readiness_status = 'setup_required')::BIGINT as setup_required_count,
    COUNT(*) FILTER (WHERE readiness_status = 'ready_for_activation')::BIGINT as ready_for_activation_count,
    COUNT(*) FILTER (WHERE readiness_status = 'active')::BIGINT as active_count,
    COUNT(*) FILTER (WHERE team_management_available = true)::BIGINT as team_management_available_count,
    COUNT(*) FILTER (WHERE talent_tracking_available = true)::BIGINT as talent_tracking_available_count,
    COUNT(*) FILTER (WHERE scheduling_available = true)::BIGINT as scheduling_available_count,
    COUNT(*) FILTER (WHERE time_tracking_available = true)::BIGINT as time_tracking_available_count,
    AVG(role_template_count) as avg_role_templates,
    AVG(team_assignment_count) as avg_team_assignments,
    AVG(location_count) as avg_locations,
    AVG(talent_count) as avg_talent
  FROM project_readiness_summary;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION get_project_readiness(UUID) IS 'Returns complete readiness information for a single project from the materialized view';
COMMENT ON FUNCTION get_projects_readiness(UUID[]) IS 'Returns readiness information for multiple projects, or all projects if no IDs provided';
COMMENT ON FUNCTION get_readiness_statistics() IS 'Returns aggregated readiness statistics across all projects for dashboard use';

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION get_project_readiness(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_projects_readiness(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_readiness_statistics() TO authenticated;