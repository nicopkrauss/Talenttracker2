-- Add trigger functions for project lifecycle management
-- This migration adds the trigger functions that were in the original migration but may not have been applied

-- Step 1: Create trigger to automatically update phase_updated_at when status changes
CREATE OR REPLACE FUNCTION update_project_phase_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update phase_updated_at if the status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.phase_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS project_phase_update_trigger ON projects;
CREATE TRIGGER project_phase_update_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_phase_timestamp();

-- Step 2: Create function to log phase transitions in project_audit_log
CREATE OR REPLACE FUNCTION log_phase_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if the status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO project_audit_log (
      project_id,
      user_id,
      action,
      details,
      created_at
    ) VALUES (
      NEW.id,
      COALESCE(
        -- Try to get current user from auth context
        (SELECT auth.uid()),
        -- Fallback to system user if no auth context
        (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
      ),
      'phase_transition',
      jsonb_build_object(
        'from_phase', OLD.status,
        'to_phase', NEW.status,
        'auto_transition', COALESCE(NEW.auto_transitions_enabled, true),
        'timezone', NEW.timezone,
        'rehearsal_start_date', NEW.rehearsal_start_date,
        'show_end_date', NEW.show_end_date
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS project_phase_audit_trigger ON projects;
CREATE TRIGGER project_phase_audit_trigger
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_phase_transition();

-- Step 3: Create a view for easy phase transition monitoring
CREATE OR REPLACE VIEW project_phase_status AS
SELECT 
  p.id,
  p.name,
  p.status as current_phase,
  p.phase_updated_at,
  p.auto_transitions_enabled,
  p.timezone,
  p.rehearsal_start_date,
  p.show_end_date,
  p.created_at,
  ps.archive_month,
  ps.archive_day,
  ps.post_show_transition_hour,
  -- Calculate next transition date based on current phase
  CASE 
    WHEN p.status = 'prep' THEN NULL -- Manual transition to staffing
    WHEN p.status = 'staffing' THEN NULL -- Manual transition to pre_show
    WHEN p.status = 'pre_show' AND p.rehearsal_start_date IS NOT NULL THEN 
      (p.rehearsal_start_date::timestamp AT TIME ZONE COALESCE(p.timezone, 'UTC'))
    WHEN p.status = 'active' AND p.show_end_date IS NOT NULL THEN 
      ((p.show_end_date + INTERVAL '1 day')::timestamp + 
       (COALESCE(ps.post_show_transition_hour, 6) || ' hours')::interval 
       AT TIME ZONE COALESCE(p.timezone, 'UTC'))
    WHEN p.status = 'post_show' THEN NULL -- Manual transition to complete
    WHEN p.status IN ('complete', 'completed') THEN 
      make_date(
        EXTRACT(YEAR FROM p.created_at)::int + 
        CASE WHEN EXTRACT(MONTH FROM p.created_at) > COALESCE(ps.archive_month, 4) THEN 1 ELSE 0 END,
        COALESCE(ps.archive_month, 4),
        COALESCE(ps.archive_day, 1)
      )::timestamp AT TIME ZONE COALESCE(p.timezone, 'UTC')
    ELSE NULL
  END as next_transition_at
FROM projects p
LEFT JOIN project_settings ps ON p.id = ps.project_id;

-- Grant appropriate permissions on the view
GRANT SELECT ON project_phase_status TO authenticated;

-- Step 4: Create function to get projects ready for automatic transition
CREATE OR REPLACE FUNCTION get_projects_ready_for_transition()
RETURNS TABLE (
  project_id UUID,
  current_phase project_status,
  target_phase project_status,
  transition_due_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pps.id,
    pps.current_phase,
    CASE 
      WHEN pps.current_phase = 'pre_show' AND pps.next_transition_at <= NOW() THEN 'active'::project_status
      WHEN pps.current_phase = 'active' AND pps.next_transition_at <= NOW() THEN 'post_show'::project_status
      WHEN pps.current_phase IN ('complete', 'completed') AND pps.next_transition_at <= NOW() THEN 'archived'::project_status
      ELSE NULL::project_status
    END,
    pps.next_transition_at
  FROM project_phase_status pps
  WHERE pps.auto_transitions_enabled = true
    AND pps.next_transition_at IS NOT NULL
    AND pps.next_transition_at <= NOW()
    AND pps.current_phase IN ('pre_show', 'active', 'complete', 'completed');
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_projects_ready_for_transition() TO authenticated;

-- Step 5: Add comments for documentation
COMMENT ON COLUMN projects.phase_updated_at IS 'Timestamp when the project phase (status) was last updated';
COMMENT ON COLUMN projects.auto_transitions_enabled IS 'Whether automatic phase transitions are enabled for this project';
COMMENT ON COLUMN projects.timezone IS 'Project timezone for phase transition calculations (e.g., America/New_York)';
COMMENT ON COLUMN projects.rehearsal_start_date IS 'Date when rehearsals begin (triggers transition to active phase)';
COMMENT ON COLUMN projects.show_end_date IS 'Date when the show ends (triggers transition to post_show phase)';

COMMENT ON COLUMN project_settings.auto_transitions_enabled IS 'Default setting for automatic phase transitions on new projects';
COMMENT ON COLUMN project_settings.archive_month IS 'Month (1-12) when projects should be automatically archived';
COMMENT ON COLUMN project_settings.archive_day IS 'Day of month (1-31) when projects should be automatically archived';
COMMENT ON COLUMN project_settings.post_show_transition_hour IS 'Hour (0-23) after show end date when transition to post_show occurs';