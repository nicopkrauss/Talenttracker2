-- Quick Project Readiness Migration SQL
-- Copy and paste this into your Supabase SQL Editor

-- Step 1: Create the new project_readiness table
CREATE TABLE IF NOT EXISTS project_readiness (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Locations
  has_default_locations BOOLEAN DEFAULT TRUE,
  custom_location_count INTEGER DEFAULT 0,
  locations_finalized BOOLEAN DEFAULT FALSE,
  locations_finalized_at TIMESTAMP WITH TIME ZONE,
  locations_finalized_by UUID REFERENCES profiles(id),
  locations_status VARCHAR(20) DEFAULT 'default-only',
  
  -- Roles
  has_default_roles BOOLEAN DEFAULT TRUE,
  custom_role_count INTEGER DEFAULT 0,
  roles_finalized BOOLEAN DEFAULT FALSE,
  roles_finalized_at TIMESTAMP WITH TIME ZONE,
  roles_finalized_by UUID REFERENCES profiles(id),
  roles_status VARCHAR(20) DEFAULT 'default-only',
  
  -- Team
  total_staff_assigned INTEGER DEFAULT 0,
  supervisor_count INTEGER DEFAULT 0,
  escort_count INTEGER DEFAULT 0,
  coordinator_count INTEGER DEFAULT 0,
  team_finalized BOOLEAN DEFAULT FALSE,
  team_finalized_at TIMESTAMP WITH TIME ZONE,
  team_finalized_by UUID REFERENCES profiles(id),
  team_status VARCHAR(20) DEFAULT 'none',
  
  -- Talent
  total_talent INTEGER DEFAULT 0,
  talent_finalized BOOLEAN DEFAULT FALSE,
  talent_finalized_at TIMESTAMP WITH TIME ZONE,
  talent_finalized_by UUID REFERENCES profiles(id),
  talent_status VARCHAR(20) DEFAULT 'none',
  
  -- Assignment Progress
  assignments_status VARCHAR(20) DEFAULT 'none',
  urgent_assignment_issues INTEGER DEFAULT 0,
  
  -- Overall
  overall_status VARCHAR(20) DEFAULT 'getting-started',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (locations_status IN ('default-only', 'configured', 'finalized')),
  CHECK (roles_status IN ('default-only', 'configured', 'finalized')),
  CHECK (team_status IN ('none', 'partial', 'finalized')),
  CHECK (talent_status IN ('none', 'partial', 'finalized')),
  CHECK (assignments_status IN ('none', 'partial', 'current', 'complete')),
  CHECK (overall_status IN ('getting-started', 'operational', 'production-ready'))
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_readiness_overall_status ON project_readiness(overall_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_last_updated ON project_readiness(last_updated);
CREATE INDEX IF NOT EXISTS idx_project_readiness_urgent_issues ON project_readiness(urgent_assignment_issues);
CREATE INDEX IF NOT EXISTS idx_project_readiness_locations_status ON project_readiness(locations_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_roles_status ON project_readiness(roles_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_team_status ON project_readiness(team_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_talent_status ON project_readiness(talent_status);

-- Step 3: Migrate existing data from project_setup_checklist
INSERT INTO project_readiness (
  project_id,
  locations_finalized,
  locations_finalized_at,
  roles_finalized,
  roles_finalized_at,
  team_finalized,
  team_finalized_at,
  talent_finalized,
  talent_finalized_at,
  created_at,
  updated_at
)
SELECT 
  psc.project_id,
  psc.locations_completed,
  CASE WHEN psc.locations_completed THEN psc.updated_at END,
  psc.roles_and_pay_completed,
  CASE WHEN psc.roles_and_pay_completed THEN psc.updated_at END,
  psc.team_assignments_completed,
  CASE WHEN psc.team_assignments_completed THEN psc.updated_at END,
  psc.talent_roster_completed,
  CASE WHEN psc.talent_roster_completed THEN psc.updated_at END,
  psc.created_at,
  psc.updated_at
FROM project_setup_checklist psc
ON CONFLICT (project_id) DO NOTHING;

-- Step 4: Create readiness records for projects that don't have checklist entries
INSERT INTO project_readiness (project_id)
SELECT p.id 
FROM projects p
WHERE p.id NOT IN (SELECT project_id FROM project_readiness)
ON CONFLICT (project_id) DO NOTHING;

-- Step 5: Drop the old project_setup_checklist table
DROP TABLE IF EXISTS project_setup_checklist CASCADE;