# Manual Project Readiness Migration Guide

Since the automated migration script cannot execute SQL directly, please follow these manual steps to apply the project readiness system migration.

## Prerequisites

1. Access to your Supabase dashboard
2. SQL Editor access in Supabase
3. Backup of your current data (recommended)

## Step 1: Backup Current Data

Before starting, backup your current `project_setup_checklist` data by running this query in the Supabase SQL Editor:

```sql
-- Backup current checklist data
CREATE TABLE project_setup_checklist_backup AS 
SELECT * FROM project_setup_checklist;
```

## Step 2: Create the New Project Readiness Table

Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- Create the new project_readiness table
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
```

## Step 3: Create Indexes

```sql
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_readiness_overall_status ON project_readiness(overall_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_last_updated ON project_readiness(last_updated);
CREATE INDEX IF NOT EXISTS idx_project_readiness_urgent_issues ON project_readiness(urgent_assignment_issues);
CREATE INDEX IF NOT EXISTS idx_project_readiness_locations_status ON project_readiness(locations_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_roles_status ON project_readiness(roles_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_team_status ON project_readiness(team_status);
CREATE INDEX IF NOT EXISTS idx_project_readiness_talent_status ON project_readiness(talent_status);
```

## Step 4: Create Readiness Calculation Function

```sql
-- Function to calculate readiness metrics
CREATE OR REPLACE FUNCTION calculate_project_readiness(p_project_id UUID)
RETURNS VOID AS $$
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
BEGIN
  -- Calculate location metrics
  SELECT COUNT(*) INTO v_custom_locations
  FROM project_locations 
  WHERE project_id = p_project_id AND is_default = FALSE;
  
  -- Calculate role metrics (custom role templates beyond defaults)
  SELECT COUNT(*) INTO v_custom_roles
  FROM project_role_templates 
  WHERE project_id = p_project_id AND is_default = FALSE;
  
  -- Calculate team metrics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN role = 'supervisor' THEN 1 END),
    COUNT(CASE WHEN role = 'talent_escort' THEN 1 END),
    COUNT(CASE WHEN role = 'coordinator' THEN 1 END)
  INTO v_total_staff, v_supervisor_count, v_escort_count, v_coordinator_count
  FROM team_assignments 
  WHERE project_id = p_project_id;
  
  -- Calculate talent metrics
  SELECT COUNT(*) INTO v_total_talent
  FROM talent_project_assignments 
  WHERE project_id = p_project_id;
  
  -- Determine status levels
  SELECT 
    CASE 
      WHEN locations_finalized THEN 'finalized'
      WHEN v_custom_locations > 0 THEN 'configured'
      ELSE 'default-only'
    END,
    CASE 
      WHEN roles_finalized THEN 'finalized'
      WHEN v_custom_roles > 0 THEN 'configured'
      ELSE 'default-only'
    END,
    CASE 
      WHEN team_finalized THEN 'finalized'
      WHEN v_total_staff > 0 THEN 'partial'
      ELSE 'none'
    END,
    CASE 
      WHEN talent_finalized THEN 'finalized'
      WHEN v_total_talent > 0 THEN 'partial'
      ELSE 'none'
    END
  INTO v_locations_status, v_roles_status, v_team_status, v_talent_status
  FROM project_readiness 
  WHERE project_id = p_project_id;
  
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
  
  -- Update the readiness record
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
END;
$$ LANGUAGE plpgsql;
```

## Step 5: Create Database Triggers

```sql
-- Function to automatically update readiness when related data changes
CREATE OR REPLACE FUNCTION trigger_update_project_readiness()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle different table operations
  IF TG_TABLE_NAME = 'projects' THEN
    -- For projects table, use NEW.id or OLD.id
    IF TG_OP = 'DELETE' THEN
      -- Project deleted, readiness will be cascade deleted
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.id);
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'project_locations' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM calculate_project_readiness(OLD.project_id);
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.project_id);
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'project_role_templates' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM calculate_project_readiness(OLD.project_id);
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.project_id);
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'team_assignments' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM calculate_project_readiness(OLD.project_id);
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.project_id);
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'talent_project_assignments' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM calculate_project_readiness(OLD.project_id);
      RETURN OLD;
    ELSE
      PERFORM calculate_project_readiness(NEW.project_id);
      RETURN NEW;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic readiness updates
CREATE TRIGGER trigger_projects_readiness_update
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

CREATE TRIGGER trigger_project_locations_readiness_update
  AFTER INSERT OR UPDATE OR DELETE ON project_locations
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

CREATE TRIGGER trigger_project_role_templates_readiness_update
  AFTER INSERT OR UPDATE OR DELETE ON project_role_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

CREATE TRIGGER trigger_team_assignments_readiness_update
  AFTER INSERT OR UPDATE OR DELETE ON team_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();

CREATE TRIGGER trigger_talent_assignments_readiness_update
  AFTER INSERT OR UPDATE OR DELETE ON talent_project_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_readiness();
```

## Step 6: Migrate Existing Data

```sql
-- Migrate existing data from project_setup_checklist
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
```

## Step 7: Create Readiness Records for All Projects

```sql
-- Create readiness records for projects that don't have checklist entries
INSERT INTO project_readiness (project_id)
SELECT p.id 
FROM projects p
WHERE p.id NOT IN (SELECT project_id FROM project_readiness)
ON CONFLICT (project_id) DO NOTHING;
```

## Step 8: Calculate Initial Readiness Metrics

```sql
-- Calculate initial readiness metrics for all projects
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT id FROM projects LOOP
    PERFORM calculate_project_readiness(project_record.id);
  END LOOP;
END $$;
```

## Step 9: Drop Old Table (Optional)

⚠️ **Warning**: Only do this after verifying the migration worked correctly!

```sql
-- Drop the old project_setup_checklist table
DROP TABLE IF EXISTS project_setup_checklist CASCADE;
```

## Step 10: Verify Migration

```sql
-- Verify the migration worked
SELECT 
  project_id,
  overall_status,
  locations_status,
  roles_status,
  team_status,
  talent_status,
  total_staff_assigned,
  total_talent,
  last_updated
FROM project_readiness
LIMIT 5;
```

## Step 11: Update Prisma Schema

After running the SQL migration, you need to update your Prisma schema to reflect the changes. The schema has already been updated in the codebase, so run:

```bash
npx prisma generate
```

## Step 12: Test the New System

1. Restart your application
2. Navigate to a project page
3. Verify that the new readiness system is working
4. Test the new API endpoints:
   - `GET /api/projects/[id]/readiness`
   - `POST /api/projects/[id]/readiness/finalize`

## Rollback Instructions

If you need to rollback the migration, you can restore the old table from the backup:

```sql
-- Restore old table from backup
CREATE TABLE project_setup_checklist AS 
SELECT * FROM project_setup_checklist_backup;

-- Drop new table
DROP TABLE project_readiness CASCADE;

-- Drop functions and triggers
DROP FUNCTION IF EXISTS calculate_project_readiness(UUID);
DROP FUNCTION IF EXISTS trigger_update_project_readiness();
```

## Troubleshooting

### Common Issues

1. **Foreign key constraint errors**: Make sure all referenced tables (projects, profiles) exist
2. **Permission errors**: Ensure you're running the SQL as a database admin
3. **Trigger errors**: Check that the function exists before creating triggers

### Getting Help

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify that all prerequisite tables exist
3. Run the verification query to check data integrity
4. Contact support if needed

## Next Steps

After completing the migration:
1. The old activation routes have been removed from the codebase
2. New readiness API endpoints are available
3. The UI will need to be updated to use the new readiness system
4. Test all functionality thoroughly before deploying to production