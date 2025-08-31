-- Migration: Enhance Existing Location Tracking System
-- Description: Enhance existing talent_locations table and add location tracking functionality
-- Date: 2025-01-29

BEGIN;

-- 1. Enhance existing talent_locations table
-- Add missing columns to the existing table
ALTER TABLE talent_locations 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'talent_locations_project_id_name_key' 
    AND conrelid = 'talent_locations'::regclass
  ) THEN
    ALTER TABLE talent_locations 
    ADD CONSTRAINT talent_locations_project_id_name_key 
    UNIQUE(project_id, name);
  END IF;
END $$;

-- 2. Talent Location Updates Table
-- Tracks when talent moves between locations within a project
CREATE TABLE IF NOT EXISTS talent_location_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES talent_locations(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES profiles(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enhance existing talent_status table
-- Add missing columns to the existing talent_status table
ALTER TABLE talent_status 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS current_location_id UUID REFERENCES talent_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'not_arrived',
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add status constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_talent_status_values' 
    AND conrelid = 'talent_status'::regclass
  ) THEN
    ALTER TABLE talent_status 
    ADD CONSTRAINT chk_talent_status_values 
    CHECK (status IN ('not_arrived', 'on_location', 'on_break', 'departed'));
  END IF;
END $$;

-- Add unique constraint for talent_id + project_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'talent_status_talent_project_unique' 
    AND conrelid = 'talent_status'::regclass
  ) THEN
    ALTER TABLE talent_status 
    ADD CONSTRAINT talent_status_talent_project_unique 
    UNIQUE(talent_id, project_id);
  END IF;
END $$;

-- 4. Update existing talent_locations with default values and add missing locations
-- Set display_order and descriptions for existing locations
UPDATE talent_locations SET 
  display_order = CASE 
    WHEN name = 'House' THEN 1
    WHEN name = 'Holding' THEN 2
    WHEN name = 'Stage' THEN 3
    WHEN name = 'Makeup' THEN 4
    WHEN name = 'Wardrobe' THEN 5
    ELSE 99
  END,
  is_default = CASE WHEN name = 'House' THEN true ELSE false END,
  description = CASE 
    WHEN name = 'House' THEN 'Main holding area'
    WHEN name = 'Holding' THEN 'Secondary holding area'
    WHEN name = 'Stage' THEN 'Performance/filming area'
    WHEN name = 'Makeup' THEN 'Hair and makeup area'
    WHEN name = 'Wardrobe' THEN 'Costume and wardrobe area'
    ELSE NULL
  END
WHERE display_order IS NULL OR display_order = 0;

-- Add missing default locations for existing projects
INSERT INTO talent_locations (project_id, name, description, is_default, display_order)
SELECT 
  p.id,
  location_name,
  location_description,
  is_default_location,
  order_num
FROM projects p
CROSS JOIN (
  VALUES 
    ('Makeup', 'Hair and makeup area', false, 4),
    ('Wardrobe', 'Costume and wardrobe area', false, 5)
) AS default_locations(location_name, location_description, is_default_location, order_num)
WHERE NOT EXISTS (
  SELECT 1 FROM talent_locations tl 
  WHERE tl.project_id = p.id 
  AND tl.name = location_name
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_talent_locations_project_id ON talent_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_talent_locations_display_order ON talent_locations(project_id, display_order);
CREATE INDEX IF NOT EXISTS idx_talent_location_updates_talent_id ON talent_location_updates(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_location_updates_project_id ON talent_location_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_talent_location_updates_talent_project ON talent_location_updates(talent_id, project_id);
CREATE INDEX IF NOT EXISTS idx_talent_location_updates_timestamp ON talent_location_updates(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_talent_status_project_id ON talent_status(project_id);
CREATE INDEX IF NOT EXISTS idx_talent_status_talent_id ON talent_status(talent_id);

-- 6. Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_talent_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_talent_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_talent_locations_updated_at ON talent_locations;
CREATE TRIGGER trigger_talent_locations_updated_at
  BEFORE UPDATE ON talent_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_locations_updated_at();

DROP TRIGGER IF EXISTS trigger_talent_status_updated_at ON talent_status;
CREATE TRIGGER trigger_talent_status_updated_at
  BEFORE UPDATE ON talent_status
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_status_updated_at();

-- 7. Create view for current talent locations per project
CREATE OR REPLACE VIEW talent_location_view AS
SELECT 
  ts.talent_id,
  ts.project_id,
  t.first_name,
  t.last_name,
  p.name as project_name,
  tl.name as current_location,
  ts.status,
  ts.last_updated,
  up.full_name as updated_by_name,
  -- Get the assigned escort for this talent on this project
  escort.full_name as escort_name,
  escort.id as escort_id
FROM talent_status ts
JOIN talent t ON ts.talent_id = t.id
JOIN projects p ON ts.project_id = p.id
LEFT JOIN talent_locations tl ON ts.current_location_id = tl.id
LEFT JOIN profiles up ON ts.updated_by = up.id
LEFT JOIN talent_project_assignments tpa ON (ts.talent_id = tpa.talent_id AND ts.project_id = tpa.project_id)
LEFT JOIN profiles escort ON tpa.escort_id = escort.id
WHERE ts.status != 'not_arrived';

-- 8. RLS removed for now - can be added later when team_assignments structure is clarified

-- 9. Record migration
INSERT INTO schema_migrations (migration_name, notes) 
VALUES ('006_enhance_location_tracking_system', 'Enhanced existing talent_locations and talent_status tables for project-based location tracking, added talent_location_updates table')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;