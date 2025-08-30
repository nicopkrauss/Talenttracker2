-- Cleanup Migration: Remove old project assignment structure (Fixed)
-- Description: Complete the migration by updating RLS policies and removing old project_id column
-- Date: 2025-01-28

BEGIN;

-- Step 1: Ensure all existing project assignments are migrated to talent_project_assignments
-- Migrate any remaining data from talent.project_id that wasn't captured
INSERT INTO talent_project_assignments (talent_id, project_id, assigned_at, status)
SELECT 
  id as talent_id,
  project_id,
  created_at as assigned_at,
  'active' as status
FROM talent 
WHERE project_id IS NOT NULL
ON CONFLICT (talent_id, project_id, status) DO NOTHING;

-- Step 2: Migrate any remaining data from talent_assignments that wasn't captured
INSERT INTO talent_project_assignments (talent_id, project_id, escort_id, assigned_at, status)
SELECT 
  talent_id,
  project_id,
  escort_id,
  created_at as assigned_at,
  'active' as status
FROM talent_assignments
ON CONFLICT (talent_id, project_id, status) DO NOTHING;

-- Step 3: Update the RLS policies that depend on project_id column
-- Drop the two policies that specifically reference talent.project_id
DROP POLICY IF EXISTS "Admin and In-House full access to talent" ON talent;
DROP POLICY IF EXISTS "Team members can view talent for their projects" ON talent;

-- Recreate the Admin and In-House policy to work with talent_project_assignments
CREATE POLICY "Admin and In-House full access to talent" ON talent
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM team_assignments ta
    JOIN profiles p ON (p.id = ta.user_id)
    JOIN talent_project_assignments tpa ON (ta.project_id = tpa.project_id)
    WHERE ta.user_id = auth.uid() 
    AND ta.role = ANY (ARRAY['admin'::project_role, 'in_house'::project_role])
    AND tpa.talent_id = talent.id
    AND tpa.status = 'active'
    AND p.status = 'active'::user_status
  )
);

-- Recreate the Team members policy to work with talent_project_assignments
CREATE POLICY "Team members can view talent for their projects" ON talent
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM team_assignments ta
    JOIN profiles p ON (p.id = ta.user_id)
    JOIN talent_project_assignments tpa ON (ta.project_id = tpa.project_id)
    WHERE ta.user_id = auth.uid()
    AND ta.role = ANY (ARRAY['supervisor'::project_role, 'talent_logistics_coordinator'::project_role, 'talent_escort'::project_role])
    AND tpa.talent_id = talent.id
    AND tpa.status = 'active'
    AND p.status = 'active'::user_status
  )
);

-- Step 4: Now remove the project_id column from talent table
ALTER TABLE talent DROP COLUMN IF EXISTS project_id;

-- Step 5: Drop the old talent_assignments table (replaced by talent_project_assignments)
DROP TABLE IF EXISTS talent_assignments;

-- Step 6: Add any missing constraints and validation that should have been added
DO $$
BEGIN
  -- Add email format constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_rep_email_format' 
    AND conrelid = 'talent'::regclass
  ) THEN
    ALTER TABLE talent 
    ADD CONSTRAINT chk_rep_email_format 
    CHECK (rep_email = '' OR rep_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;

  -- Add phone format constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_rep_phone_format' 
    AND conrelid = 'talent'::regclass
  ) THEN
    ALTER TABLE talent 
    ADD CONSTRAINT chk_rep_phone_format 
    CHECK (rep_phone = '' OR rep_phone ~* '^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$');
  END IF;

  -- Add rep name required constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_rep_name_required' 
    AND conrelid = 'talent'::regclass
  ) THEN
    ALTER TABLE talent 
    ADD CONSTRAINT chk_rep_name_required 
    CHECK (
      (rep_name = '' AND rep_email = '' AND rep_phone = '') OR 
      (rep_name != '' AND rep_email != '' AND rep_phone != '')
    );
  END IF;

  -- Add unique constraint on talent_project_assignments if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'talent_project_assignments_talent_id_project_id_status_key' 
    AND conrelid = 'talent_project_assignments'::regclass
  ) THEN
    ALTER TABLE talent_project_assignments 
    ADD CONSTRAINT talent_project_assignments_talent_id_project_id_status_key 
    UNIQUE(talent_id, project_id, status);
  END IF;
END $$;

COMMIT;