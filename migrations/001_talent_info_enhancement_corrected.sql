-- Migration: Talent Info Enhancement (Corrected for actual schema)
-- Description: Add representative fields, remove emergency contact fields, and create talent-project assignments table
-- Date: 2025-01-28

-- Start transaction
BEGIN;

-- Step 1: Archive existing emergency contact data before removal (if any exists in contact_info JSONB)
-- This preserves data for compliance purposes
CREATE TABLE IF NOT EXISTS talent_emergency_contacts_archive (
  id UUID,
  emergency_contact_data JSONB,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Archive existing emergency contact data from contact_info JSONB field
INSERT INTO talent_emergency_contacts_archive (id, emergency_contact_data)
SELECT 
  id,
  contact_info
FROM talent 
WHERE contact_info IS NOT NULL 
  AND (
    contact_info ? 'emergency_contact_name' OR
    contact_info ? 'emergency_contact_phone' OR
    contact_info ? 'emergency_contact_relationship'
  );

-- Step 2: Add new representative information columns to talent table
ALTER TABLE talent 
ADD COLUMN IF NOT EXISTS rep_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS rep_email VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS rep_phone VARCHAR(20) NOT NULL DEFAULT '';

-- Step 3: Update contact_info JSONB to remove emergency contact fields
UPDATE talent 
SET contact_info = contact_info - 'emergency_contact_name' - 'emergency_contact_phone' - 'emergency_contact_relationship'
WHERE contact_info IS NOT NULL;

-- Step 4: Create talent_project_assignments table for many-to-many relationships
-- Note: This replaces the existing talent_assignments table functionality
CREATE TABLE IF NOT EXISTS talent_project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  escort_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique active assignments per talent-project pair
  UNIQUE(talent_id, project_id, status)
);

-- Step 5: Migrate existing data from talent_assignments to talent_project_assignments
INSERT INTO talent_project_assignments (talent_id, project_id, escort_id, assigned_at, status)
SELECT 
  talent_id,
  project_id,
  escort_id,
  created_at as assigned_at,
  'active' as status
FROM talent_assignments;

-- Step 6: Migrate existing project_id from talent table to talent_project_assignments
INSERT INTO talent_project_assignments (talent_id, project_id, assigned_at, status)
SELECT 
  id as talent_id,
  project_id,
  created_at as assigned_at,
  'active' as status
FROM talent 
WHERE project_id IS NOT NULL
ON CONFLICT (talent_id, project_id, status) DO NOTHING;

-- Step 7: Remove project_id column from talent table (now handled by talent_project_assignments)
ALTER TABLE talent DROP COLUMN IF EXISTS project_id;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_talent_id 
ON talent_project_assignments(talent_id);

CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_project_id 
ON talent_project_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_status 
ON talent_project_assignments(status);

CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_assigned_at 
ON talent_project_assignments(assigned_at);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_talent_status 
ON talent_project_assignments(talent_id, status);

-- Step 9: Add constraints for data integrity
-- Email format validation
ALTER TABLE talent 
ADD CONSTRAINT chk_rep_email_format 
CHECK (rep_email = '' OR rep_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone format validation (supports various formats)
ALTER TABLE talent 
ADD CONSTRAINT chk_rep_phone_format 
CHECK (rep_phone = '' OR rep_phone ~* '^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$');

-- Ensure rep_name is not empty when other rep fields are filled
ALTER TABLE talent 
ADD CONSTRAINT chk_rep_name_required 
CHECK (
  (rep_name = '' AND rep_email = '' AND rep_phone = '') OR 
  (rep_name != '' AND rep_email != '' AND rep_phone != '')
);

-- Step 10: Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_talent_project_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_talent_project_assignments_updated_at
  BEFORE UPDATE ON talent_project_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_project_assignments_updated_at();

-- Step 11: Drop the old talent_assignments table since it's replaced by talent_project_assignments
-- Comment out if you want to keep it for reference
DROP TABLE IF EXISTS talent_assignments;

-- Step 12: Record migration in tracking table (if it exists)
INSERT INTO schema_migrations (migration_name, notes) 
VALUES ('001_talent_info_enhancement', 'Added representative fields, removed emergency contact fields, created talent-project assignments table, migrated from talent_assignments')
ON CONFLICT (migration_name) DO NOTHING;

-- Commit transaction
COMMIT;