-- Manual SQL: Disable RLS for Time Tracking Components
-- Description: Ensures current_time_tracking_status view and related tables have no RLS restrictions
-- Instructions: Run this SQL in Supabase SQL Editor if time tracking access is restricted
-- Date: 2025-01-21

-- Note: Views don't have RLS directly, but inherit from underlying tables
-- This script ensures all time tracking related tables have RLS disabled for development

-- Disable RLS on timecards table (if needed)
ALTER TABLE timecards DISABLE ROW LEVEL SECURITY;

-- Disable RLS on profiles table (if needed) 
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on projects table (if needed)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users for time tracking operations
GRANT SELECT, INSERT, UPDATE, DELETE ON timecards TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON projects TO authenticated;

-- Grant permissions on the view (though it inherits from tables)
GRANT SELECT ON current_time_tracking_status TO authenticated;

-- Grant permissions on global_settings for time tracking configuration
GRANT SELECT ON global_settings TO authenticated;

-- Record the RLS disable action
INSERT INTO schema_migrations (migration_name, notes) 
VALUES ('037_disable_rls_time_tracking_view', 'Disabled RLS for time tracking components to ensure unrestricted access')
ON CONFLICT (migration_name) DO NOTHING;

-- Verification queries (uncomment to test)
-- SELECT COUNT(*) FROM current_time_tracking_status;
-- SELECT * FROM timecards LIMIT 1;
-- SELECT * FROM global_settings;