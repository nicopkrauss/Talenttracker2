-- Migration: Disable RLS for Development
-- This migration disables Row Level Security on all tables for easier development
-- WARNING: This reduces security - only use for development/testing
-- Date: 2024-12-19

-- Disable RLS on all main tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_project_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE timecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_role_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_setup_checklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_daily_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_daily_assignments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on additional tables if they exist
DO $$
BEGIN
    -- Try to disable RLS on project_settings if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_settings') THEN
        ALTER TABLE project_settings DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Try to disable RLS on project_audit_log if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_audit_log') THEN
        ALTER TABLE project_audit_log DISABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Try to disable RLS on project_attachments if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_attachments') THEN
        ALTER TABLE project_attachments DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Grant basic permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure service role has full access
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Grant broad permissions to authenticated users for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;