-- Fix permissions for new timecard tables
-- Run this in Supabase SQL Editor

-- Disable RLS on new tables (for development)
ALTER TABLE timecard_headers DISABLE ROW LEVEL SECURITY;
ALTER TABLE timecard_daily_entries DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON timecard_headers TO authenticated;
GRANT ALL ON timecard_daily_entries TO authenticated;

-- Grant permissions to anon users (for API access)
GRANT ALL ON timecard_headers TO anon;
GRANT ALL ON timecard_daily_entries TO anon;

-- Grant permissions to service_role
GRANT ALL ON timecard_headers TO service_role;
GRANT ALL ON timecard_daily_entries TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify the permissions were applied
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('timecard_headers', 'timecard_daily_entries');