-- Migration: Update profiles.role column from varchar to project_role enum
-- Date: 2024-01-15
-- Description: Changes the role column in profiles table to use the existing project_role enum

-- First, update any existing role values to match enum values
UPDATE profiles 
SET role = CASE 
    WHEN LOWER(role) = 'admin' THEN 'admin'
    WHEN LOWER(role) IN ('in-house', 'in_house', 'inhouse') THEN 'in_house'
    WHEN LOWER(role) = 'supervisor' THEN 'supervisor'
    WHEN LOWER(role) IN ('tlc', 'talent_logistics_coordinator', 'talent logistics coordinator') THEN 'talent_logistics_coordinator'
    WHEN LOWER(role) IN ('talent_escort', 'talent escort', 'escort') THEN 'talent_escort'
    ELSE NULL
END
WHERE role IS NOT NULL;

-- Drop the existing role column
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- Add the new role column with project_role enum type
ALTER TABLE profiles ADD COLUMN role project_role;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_enum ON profiles(role);