-- Fix global_settings table permissions for all roles
-- Migration: 034_fix_global_settings_permissions.sql

-- Grant permissions to public role (most permissive, but API handles auth)
GRANT SELECT, UPDATE ON global_settings TO public;

-- Also ensure authenticated and anon have permissions
GRANT SELECT, UPDATE ON global_settings TO authenticated;
GRANT SELECT, UPDATE ON global_settings TO anon;

-- Grant permissions to service_role as well
GRANT ALL ON global_settings TO service_role;