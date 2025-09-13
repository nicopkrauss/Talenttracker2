-- Migration: Create day-specific assignment tables and triggers
-- This migration implements the new architecture for multi-day escort assignments
-- Addresses Requirements: 1.1, 1.2, 4.1, 4.2, 4.3

-- Create talent_daily_assignments table
CREATE TABLE talent_daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  escort_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate assignments of same escort to same talent on same date
  UNIQUE(talent_id, project_id, assignment_date, escort_id)
);

-- Create group_daily_assignments table
CREATE TABLE group_daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES talent_groups(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  escort_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate assignments of same escort to same group on same date
  UNIQUE(group_id, project_id, assignment_date, escort_id)
);

-- Create indexes for performance optimization
CREATE INDEX idx_talent_daily_assignments_project_date 
  ON talent_daily_assignments(project_id, assignment_date);

CREATE INDEX idx_talent_daily_assignments_escort_date 
  ON talent_daily_assignments(escort_id, assignment_date);

CREATE INDEX idx_talent_daily_assignments_talent_project 
  ON talent_daily_assignments(talent_id, project_id);

CREATE INDEX idx_group_daily_assignments_project_date 
  ON group_daily_assignments(project_id, assignment_date);

CREATE INDEX idx_group_daily_assignments_escort_date 
  ON group_daily_assignments(escort_id, assignment_date);

CREATE INDEX idx_group_daily_assignments_group_project 
  ON group_daily_assignments(group_id, project_id);

-- Create function to validate assignment dates are within project range
CREATE OR REPLACE FUNCTION validate_assignment_date_range()
RETURNS TRIGGER AS $$
DECLARE
  project_start_date DATE;
  project_end_date DATE;
BEGIN
  -- Get project date range
  SELECT start_date, end_date 
  INTO project_start_date, project_end_date
  FROM projects 
  WHERE id = NEW.project_id;
  
  -- Check if assignment date is within project range
  IF NEW.assignment_date < project_start_date OR NEW.assignment_date > project_end_date THEN
    RAISE EXCEPTION 'Assignment date % is outside project date range (% to %)', 
      NEW.assignment_date, project_start_date, project_end_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update talent_project_assignments.scheduled_dates
CREATE OR REPLACE FUNCTION update_talent_scheduled_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update scheduled_dates array based on daily assignments
  UPDATE talent_project_assignments 
  SET scheduled_dates = (
    SELECT COALESCE(
      ARRAY_AGG(DISTINCT assignment_date::text ORDER BY assignment_date::text),
      '{}'::text[]
    )
    FROM talent_daily_assignments 
    WHERE talent_id = COALESCE(NEW.talent_id, OLD.talent_id)
      AND project_id = COALESCE(NEW.project_id, OLD.project_id)
  ),
  updated_at = NOW()
  WHERE talent_id = COALESCE(NEW.talent_id, OLD.talent_id)
    AND project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update talent_groups.scheduled_dates
CREATE OR REPLACE FUNCTION update_group_scheduled_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update scheduled_dates array based on daily assignments
  UPDATE talent_groups 
  SET scheduled_dates = (
    SELECT COALESCE(
      ARRAY_AGG(DISTINCT assignment_date::text ORDER BY assignment_date::text),
      '{}'::text[]
    )
    FROM group_daily_assignments 
    WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create date validation triggers for talent_daily_assignments
CREATE TRIGGER trigger_validate_talent_assignment_date
  BEFORE INSERT OR UPDATE ON talent_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION validate_assignment_date_range();

-- Create date validation triggers for group_daily_assignments
CREATE TRIGGER trigger_validate_group_assignment_date
  BEFORE INSERT OR UPDATE ON group_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION validate_assignment_date_range();

-- Create triggers for talent_daily_assignments scheduled_dates maintenance
CREATE TRIGGER trigger_update_talent_scheduled_dates_on_insert
  AFTER INSERT ON talent_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION update_talent_scheduled_dates();

CREATE TRIGGER trigger_update_talent_scheduled_dates_on_update
  AFTER UPDATE ON talent_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION update_talent_scheduled_dates();

CREATE TRIGGER trigger_update_talent_scheduled_dates_on_delete
  AFTER DELETE ON talent_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION update_talent_scheduled_dates();

-- Create triggers for group_daily_assignments scheduled_dates maintenance
CREATE TRIGGER trigger_update_group_scheduled_dates_on_insert
  AFTER INSERT ON group_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION update_group_scheduled_dates();

CREATE TRIGGER trigger_update_group_scheduled_dates_on_update
  AFTER UPDATE ON group_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION update_group_scheduled_dates();

CREATE TRIGGER trigger_update_group_scheduled_dates_on_delete
  AFTER DELETE ON group_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION update_group_scheduled_dates();

-- Add updated_at trigger for talent_daily_assignments
CREATE TRIGGER trigger_talent_daily_assignments_updated_at
  BEFORE UPDATE ON talent_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for group_daily_assignments  
CREATE TRIGGER trigger_group_daily_assignments_updated_at
  BEFORE UPDATE ON group_daily_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE talent_daily_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_daily_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy for talent_daily_assignments - users can access assignments for projects they're assigned to
CREATE POLICY "Users can access talent daily assignments for their projects" 
ON talent_daily_assignments
FOR ALL USING (
  -- Admin and in_house can see all assignments
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'in_house')
  )
  OR
  -- Other users can see assignments for projects they're assigned to
  project_id IN (
    SELECT project_id FROM team_assignments 
    WHERE user_id = auth.uid()
  )
);

-- RLS Policy for group_daily_assignments - users can access assignments for projects they're assigned to
CREATE POLICY "Users can access group daily assignments for their projects" 
ON group_daily_assignments
FOR ALL USING (
  -- Admin and in_house can see all assignments
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'in_house')
  )
  OR
  -- Other users can see assignments for projects they're assigned to
  project_id IN (
    SELECT project_id FROM team_assignments 
    WHERE user_id = auth.uid()
  )
);

-- Add comments for documentation
COMMENT ON TABLE talent_daily_assignments IS 'Stores day-specific escort assignments for individual talent. Replaces the single escort_id field in talent_project_assignments to support different escorts on different dates.';

COMMENT ON TABLE group_daily_assignments IS 'Stores day-specific escort assignments for talent groups. Supports multiple escorts per group per date. Replaces the redundant escort fields in talent_groups table.';

COMMENT ON FUNCTION validate_assignment_date_range() IS 'Validates that assignment dates fall within the project date range. Replaces CHECK constraints which cannot use subqueries.';

COMMENT ON FUNCTION update_talent_scheduled_dates() IS 'Automatically maintains the scheduled_dates array in talent_project_assignments based on talent_daily_assignments records.';

COMMENT ON FUNCTION update_group_scheduled_dates() IS 'Automatically maintains the scheduled_dates array in talent_groups based on group_daily_assignments records.';

-- Grant necessary permissions
GRANT ALL ON talent_daily_assignments TO authenticated;
GRANT ALL ON group_daily_assignments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;