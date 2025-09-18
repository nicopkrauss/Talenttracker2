-- EMERGENCY: Disable RLS on all tables for development
-- WARNING: This reduces security - only use for development/testing

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

-- Grant basic permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure service role has full access
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;