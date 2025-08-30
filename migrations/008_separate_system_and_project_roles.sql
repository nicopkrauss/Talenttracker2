-- Migration: Separate system roles from project roles
-- Date: 2024-01-15
-- Description: Creates separate enums for system-level roles (admin, in_house) and project-level roles

-- Create the new system_role enum
CREATE TYPE system_role AS ENUM ('admin', 'in_house');

-- Create a new project_role enum with only project-specific roles
CREATE TYPE project_role_new AS ENUM ('supervisor', 'talent_logistics_coordinator', 'talent_escort');

-- Update profiles table to use system_role
-- First, add a new column with the system_role type
ALTER TABLE profiles ADD COLUMN role_new system_role;

-- Migrate existing data: only admin and in_house users get system roles
UPDATE profiles 
SET role_new = CASE 
    WHEN role = 'admin' THEN 'admin'::system_role
    WHEN role = 'in_house' THEN 'in_house'::system_role
    ELSE NULL
END;

-- Drop the old role column
ALTER TABLE profiles DROP COLUMN role;

-- Rename the new column to role
ALTER TABLE profiles RENAME COLUMN role_new TO role;

-- Update team_assignments table to use the new project_role enum
-- First, add a new column
ALTER TABLE team_assignments ADD COLUMN role_new project_role_new;

-- Migrate existing data
UPDATE team_assignments 
SET role_new = CASE 
    WHEN role = 'supervisor' THEN 'supervisor'::project_role_new
    WHEN role = 'talent_logistics_coordinator' THEN 'talent_logistics_coordinator'::project_role_new
    WHEN role = 'talent_escort' THEN 'talent_escort'::project_role_new
    ELSE NULL
END;

-- Drop the old role column from team_assignments
ALTER TABLE team_assignments DROP COLUMN role;

-- Rename the new column to role
ALTER TABLE team_assignments RENAME COLUMN role_new TO role;

-- Drop the old project_role enum
DROP TYPE project_role;

-- Rename the new enum to project_role
ALTER TYPE project_role_new RENAME TO project_role;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_system_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_team_assignments_project_role ON team_assignments(role);