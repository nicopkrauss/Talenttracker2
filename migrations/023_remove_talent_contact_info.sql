-- Migration: Remove talent contact_info field and clean up location tracking
-- This migration removes the legacy contact_info JSON field from the talent table
-- 
-- IMPORTANT: Talent location tracking is PROJECT-SPECIFIC and should not be part
-- of the global talent database. Location tracking is handled through:
-- - talent_status table (current location per project)
-- - project_locations table (available locations per project)
-- - These are used in project-specific contexts, not global talent profiles

-- 1. Remove contact_info column from talent table
ALTER TABLE talent DROP COLUMN IF EXISTS contact_info;

-- 2. Ensure talent_status table exists with proper structure
-- (This should already exist from previous migrations, but we'll verify)
CREATE TABLE IF NOT EXISTS talent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  current_location_id UUID REFERENCES project_locations(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'not_arrived',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(talent_id, project_id)
);

-- 3. Ensure project_locations table exists with proper structure
-- (This should already exist from previous migrations, but we'll verify)
CREATE TABLE IF NOT EXISTS project_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(3),
  color VARCHAR(7) DEFAULT '#3b82f6',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- 4. Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_talent_status_talent_id ON talent_status(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_status_project_id ON talent_status(project_id);
CREATE INDEX IF NOT EXISTS idx_talent_status_talent_project ON talent_status(talent_id, project_id);
CREATE INDEX IF NOT EXISTS idx_talent_status_location ON talent_status(current_location_id);
CREATE INDEX IF NOT EXISTS idx_talent_status_updated ON talent_status(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_project_locations_project_id ON project_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_locations_sort_order ON project_locations(project_id, sort_order);

-- 5. Drop legacy location_updates table if it exists
-- This table is being replaced by the talent_status and project_locations structure
DROP TABLE IF EXISTS location_updates;

-- 6. Record migration
INSERT INTO schema_migrations (migration_name, notes) 
VALUES ('023_remove_talent_contact_info', 'Removed contact_info JSON field from talent table. Note: Location tracking is project-specific and handled separately.')
ON CONFLICT (migration_name) DO NOTHING;