-- Migration: Create Readiness Performance Optimization System
-- This migration implements the materialized view and trigger system for optimal readiness performance

-- Drop existing materialized view if it exists (from previous optimization)
DROP MATERIALIZED VIEW IF EXISTS project_readiness_summary CASCADE;

-- Create the main materialized view for project readiness with feature availability
CREATE MATERIALIZED VIEW project_readiness_summary AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.status as project_status,
  
  -- Overall readiness status
  CASE 
    WHEN p.status = 'active' THEN 'active'
    WHEN (
      COALESCE(prt_count.count, 0) > 0 AND 
      COALESCE(ta_count.count, 0) > 0 AND 
      COALESCE(pl_count.count, 0) > 0
    ) THEN 'ready_for_activation'
    ELSE 'setup_required'
  END as readiness_status,
  
  -- Feature availability flags
  COALESCE(prt_count.count, 0) > 0 as has_role_templates,
  COALESCE(ta_count.count, 0) > 0 as has_team_assignments,
  COALESCE(pl_count.count, 0) > 0 as has_locations,
  COALESCE(tr_count.count, 0) > 0 as has_talent_roster,
  
  -- Feature availability based on project status and dependencies
  COALESCE(prt_count.count, 0) > 0 as team_management_available,
  (COALESCE(pl_count.count, 0) > 0 AND p.status = 'active') as talent_tracking_available,
  (COALESCE(ta_count.count, 0) > 0 AND COALESCE(prt_count.count, 0) > 0) as scheduling_available,
  p.status = 'active' as time_tracking_available,
  
  -- Blocking issues array
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(prt_count.count, 0) = 0 THEN 'missing_role_templates' END,
    CASE WHEN COALESCE(ta_count.count, 0) = 0 THEN 'missing_team_assignments' END,
    CASE WHEN COALESCE(pl_count.count, 0) = 0 THEN 'missing_locations' END
  ], NULL) as blocking_issues,
  
  -- Available features array
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(prt_count.count, 0) > 0 THEN 'team_management' END,
    CASE WHEN COALESCE(pl_count.count, 0) > 0 AND p.status = 'active' THEN 'talent_tracking' END,
    CASE WHEN COALESCE(ta_count.count, 0) > 0 AND COALESCE(prt_count.count, 0) > 0 THEN 'scheduling' END,
    CASE WHEN p.status = 'active' THEN 'time_tracking' END
  ], NULL) as available_features,
  
  -- Counts for reference
  COALESCE(prt_count.count, 0) as role_template_count,
  COALESCE(ta_count.count, 0) as team_assignment_count,
  COALESCE(pl_count.count, 0) as location_count,
  COALESCE(tr_count.count, 0) as talent_count,
  
  -- Metadata
  NOW() as calculated_at,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN (
  SELECT project_id, COUNT(*) as count
  FROM project_role_templates 
  GROUP BY project_id
) prt_count ON p.id = prt_count.project_id
LEFT JOIN (
  SELECT project_id, COUNT(*) as count
  FROM team_assignments 
  GROUP BY project_id
) ta_count ON p.id = ta_count.project_id
LEFT JOIN (
  SELECT project_id, COUNT(*) as count
  FROM project_locations 
  GROUP BY project_id
) pl_count ON p.id = pl_count.project_id
LEFT JOIN (
  SELECT project_id, COUNT(*) as count
  FROM talent_project_assignments 
  GROUP BY project_id
) tr_count ON p.id = tr_count.project_id;

-- Create unique index on the materialized view for concurrent refresh
CREATE UNIQUE INDEX idx_project_readiness_summary_project_id 
  ON project_readiness_summary(project_id);

-- Create additional indexes for common queries
CREATE INDEX idx_project_readiness_summary_status 
  ON project_readiness_summary(readiness_status);

CREATE INDEX idx_project_readiness_summary_project_status 
  ON project_readiness_summary(project_status);

CREATE INDEX idx_project_readiness_summary_features 
  ON project_readiness_summary(team_management_available, talent_tracking_available, scheduling_available, time_tracking_available);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_project_readiness_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Use concurrent refresh to avoid locking
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_readiness_summary;
  
  -- Notify real-time subscribers about readiness changes
  PERFORM pg_notify(
    'project_readiness_changed',
    json_build_object(
      'project_id', COALESCE(NEW.project_id, OLD.project_id, NEW.id, OLD.id),
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on dependency tables to refresh materialized view
CREATE TRIGGER project_role_templates_readiness_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project_role_templates
  FOR EACH ROW EXECUTE FUNCTION refresh_project_readiness_summary();

CREATE TRIGGER team_assignments_readiness_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON team_assignments
  FOR EACH ROW EXECUTE FUNCTION refresh_project_readiness_summary();

CREATE TRIGGER project_locations_readiness_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project_locations
  FOR EACH ROW EXECUTE FUNCTION refresh_project_readiness_summary();

CREATE TRIGGER talent_project_assignments_readiness_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON talent_project_assignments
  FOR EACH ROW EXECUTE FUNCTION refresh_project_readiness_summary();

CREATE TRIGGER projects_readiness_summary_trigger
  AFTER UPDATE ON projects
  FOR EACH ROW 
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION refresh_project_readiness_summary();

-- Note: Readiness query functions are defined in migration 034_fix_readiness_function_signatures.sql
-- This ensures proper type alignment with the materialized view structure

-- Create indexes for optimal query performance on related tables
CREATE INDEX IF NOT EXISTS idx_project_role_templates_project_performance 
  ON project_role_templates(project_id);

CREATE INDEX IF NOT EXISTS idx_team_assignments_project_performance 
  ON team_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_project_locations_project_performance 
  ON project_locations(project_id);

CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_project_performance 
  ON talent_project_assignments(project_id);

-- Create composite indexes for common readiness queries
CREATE INDEX IF NOT EXISTS idx_projects_status_created 
  ON projects(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_id_status 
  ON projects(id, status);

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW project_readiness_summary IS 'Pre-calculated project readiness data with feature availability flags for optimal performance';
COMMENT ON FUNCTION refresh_project_readiness_summary() IS 'Trigger function to refresh materialized view and notify real-time subscribers';
COMMENT ON FUNCTION get_project_readiness(UUID) IS 'Optimized function to get readiness data for a single project';
COMMENT ON FUNCTION get_projects_readiness(UUID[]) IS 'Optimized function to get readiness data for multiple projects';

-- Initial population of the materialized view
REFRESH MATERIALIZED VIEW project_readiness_summary;