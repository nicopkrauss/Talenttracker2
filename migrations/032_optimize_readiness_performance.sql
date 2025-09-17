-- Migration: Optimize Project Readiness Performance
-- Add additional indexes and optimize queries for better performance

-- Additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_project_readiness_composite_status 
  ON project_readiness(project_id, overall_status, last_updated);

CREATE INDEX IF NOT EXISTS idx_project_readiness_team_metrics 
  ON project_readiness(project_id, total_staff_assigned, escort_count, supervisor_count);

CREATE INDEX IF NOT EXISTS idx_project_readiness_talent_metrics 
  ON project_readiness(project_id, total_talent, talent_status);

CREATE INDEX IF NOT EXISTS idx_project_readiness_finalization_status 
  ON project_readiness(project_id, locations_finalized, roles_finalized, team_finalized, talent_finalized);

-- Indexes for assignment progress calculations
CREATE INDEX IF NOT EXISTS idx_talent_daily_assignments_project_date 
  ON talent_daily_assignments(project_id, assignment_date, escort_id);

CREATE INDEX IF NOT EXISTS idx_group_daily_assignments_project_date 
  ON group_daily_assignments(project_id, assignment_date, escort_id);

CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_project 
  ON talent_project_assignments(project_id, talent_id);

CREATE INDEX IF NOT EXISTS idx_talent_groups_project 
  ON talent_groups(project_id, id);

-- Optimize the readiness calculation function for better performance
CREATE OR REPLACE FUNCTION calculate_project_readiness_optimized(p_project_id UUID)
RETURNS VOID AS $
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
  v_current_readiness RECORD;
BEGIN
  -- Get current readiness state to avoid unnecessary updates
  SELECT * INTO v_current_readiness
  FROM project_readiness 
  WHERE project_id = p_project_id;
  
  -- If no readiness record exists, create one
  IF NOT FOUND THEN
    INSERT INTO project_readiness (project_id) VALUES (p_project_id);
    SELECT * INTO v_current_readiness
    FROM project_readiness 
    WHERE project_id = p_project_id;
  END IF;
  
  -- Use single queries with aggregation for better performance
  -- Calculate location metrics
  SELECT COALESCE(COUNT(*), 0) INTO v_custom_locations
  FROM project_locations 
  WHERE project_id = p_project_id AND is_default = FALSE;
  
  -- Calculate role metrics
  SELECT COALESCE(COUNT(*), 0) INTO v_custom_roles
  FROM project_role_templates 
  WHERE project_id = p_project_id AND is_default = FALSE;
  
  -- Calculate team metrics in single query
  SELECT 
    COALESCE(COUNT(*), 0),
    COALESCE(COUNT(*) FILTER (WHERE role = 'supervisor'), 0),
    COALESCE(COUNT(*) FILTER (WHERE role = 'talent_escort'), 0),
    COALESCE(COUNT(*) FILTER (WHERE role = 'coordinator'), 0)
  INTO v_total_staff, v_supervisor_count, v_escort_count, v_coordinator_count
  FROM team_assignments 
  WHERE project_id = p_project_id;
  
  -- Calculate talent metrics
  SELECT COALESCE(COUNT(*), 0) INTO v_total_talent
  FROM talent_project_assignments 
  WHERE project_id = p_project_id;
  
  -- Determine status levels using current finalization state
  v_locations_status := CASE 
    WHEN v_current_readiness.locations_finalized THEN 'finalized'
    WHEN v_custom_locations > 0 THEN 'configured'
    ELSE 'default-only'
  END;
  
  v_roles_status := CASE 
    WHEN v_current_readiness.roles_finalized THEN 'finalized'
    WHEN v_custom_roles > 0 THEN 'configured'
    ELSE 'default-only'
  END;
  
  v_team_status := CASE 
    WHEN v_current_readiness.team_finalized THEN 'finalized'
    WHEN v_total_staff > 0 THEN 'partial'
    ELSE 'none'
  END;
  
  v_talent_status := CASE 
    WHEN v_current_readiness.talent_finalized THEN 'finalized'
    WHEN v_total_talent > 0 THEN 'partial'
    ELSE 'none'
  END;
  
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
  
  -- Only update if values have changed to reduce write operations
  IF v_current_readiness.custom_location_count != v_custom_locations OR
     v_current_readiness.custom_role_count != v_custom_roles OR
     v_current_readiness.total_staff_assigned != v_total_staff OR
     v_current_readiness.supervisor_count != v_supervisor_count OR
     v_current_readiness.escort_count != v_escort_count OR
     v_current_readiness.coordinator_count != v_coordinator_count OR
     v_current_readiness.total_talent != v_total_talent OR
     v_current_readiness.locations_status != v_locations_status OR
     v_current_readiness.roles_status != v_roles_status OR
     v_current_readiness.team_status != v_team_status OR
     v_current_readiness.talent_status != v_talent_status OR
     v_current_readiness.overall_status != v_overall_status THEN
    
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
  END IF;
END;
$ LANGUAGE plpgsql;

-- Replace the old function with the optimized version
DROP FUNCTION IF EXISTS calculate_project_readiness(UUID);
CREATE OR REPLACE FUNCTION calculate_project_readiness(p_project_id UUID)
RETURNS VOID AS $
BEGIN
  PERFORM calculate_project_readiness_optimized(p_project_id);
END;
$ LANGUAGE plpgsql;

-- Create a materialized view for dashboard aggregations (optional, for high-traffic scenarios)
CREATE MATERIALIZED VIEW IF NOT EXISTS project_readiness_summary AS
SELECT 
  pr.overall_status,
  COUNT(*) as project_count,
  AVG(pr.total_staff_assigned) as avg_staff,
  AVG(pr.total_talent) as avg_talent,
  COUNT(*) FILTER (WHERE pr.locations_finalized) as locations_finalized_count,
  COUNT(*) FILTER (WHERE pr.roles_finalized) as roles_finalized_count,
  COUNT(*) FILTER (WHERE pr.team_finalized) as team_finalized_count,
  COUNT(*) FILTER (WHERE pr.talent_finalized) as talent_finalized_count
FROM project_readiness pr
GROUP BY pr.overall_status;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_readiness_summary_status 
  ON project_readiness_summary(overall_status);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_project_readiness_summary()
RETURNS VOID AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_readiness_summary;
END;
$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON INDEX idx_project_readiness_composite_status IS 'Composite index for efficient project readiness queries';
COMMENT ON INDEX idx_project_readiness_team_metrics IS 'Index for team-related readiness calculations';
COMMENT ON INDEX idx_project_readiness_talent_metrics IS 'Index for talent-related readiness calculations';
COMMENT ON FUNCTION calculate_project_readiness_optimized(UUID) IS 'Optimized version of readiness calculation with reduced database writes';
COMMENT ON MATERIALIZED VIEW project_readiness_summary IS 'Aggregated readiness statistics for dashboard performance';