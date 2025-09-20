-- Disable RLS on global_settings table
-- Migration: 032_disable_global_settings_rls.sql

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Admins can read global settings" ON global_settings;
DROP POLICY IF EXISTS "Admins can update global settings" ON global_settings;

-- Disable Row Level Security on global_settings table
ALTER TABLE global_settings DISABLE ROW LEVEL SECURITY;

-- Note: Authentication and authorization are handled at the application level
-- in the API routes, so RLS is not needed for this table.