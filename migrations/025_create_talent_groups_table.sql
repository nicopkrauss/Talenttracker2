-- Migration: Create talent_groups table for multi-day scheduling groups feature
-- This table stores talent groups (bands, dance troupes, etc.) that can be managed as a unit

CREATE TABLE IF NOT EXISTS talent_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_name VARCHAR(255) NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name: "John Doe", role: "Lead Guitar"}, ...]
  scheduled_dates DATE[] NOT NULL DEFAULT '{}',
  assigned_escort_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_talent_groups_project_id ON talent_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_talent_groups_scheduled_dates ON talent_groups USING GIN(scheduled_dates);
CREATE INDEX IF NOT EXISTS idx_talent_groups_assigned_escort ON talent_groups(assigned_escort_id);

-- Add constraint to ensure group name is unique within a project
ALTER TABLE talent_groups ADD CONSTRAINT unique_group_name_per_project 
  UNIQUE (project_id, group_name);

-- Add constraint to ensure members array is valid
ALTER TABLE talent_groups ADD CONSTRAINT valid_members_array 
  CHECK (jsonb_typeof(members) = 'array');

-- Note: Updated_at trigger will be handled by application logic for now

-- Add RLS policies for talent_groups table
ALTER TABLE talent_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access groups for projects they have access to
CREATE POLICY "talent_groups_access_policy" ON talent_groups
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE 
        -- Admin and in_house can see all projects
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'in_house')
        )
        OR
        -- Other users can see projects they're assigned to
        id IN (
          SELECT project_id FROM team_assignments 
          WHERE user_id = auth.uid()
        )
    )
  );

-- Add comment for documentation
COMMENT ON TABLE talent_groups IS 'Stores talent groups (bands, dance troupes, etc.) for multi-day scheduling';
COMMENT ON COLUMN talent_groups.members IS 'JSONB array of group members with name and role fields';
COMMENT ON COLUMN talent_groups.scheduled_dates IS 'Array of dates when this group is scheduled to perform';