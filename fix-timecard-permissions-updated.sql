-- Fix permissions for timecard tables specifically

-- Grant permissions for timecard_headers and timecard_daily_entries
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timecard_headers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timecard_daily_entries TO authenticated;

-- Grant all privileges to service_role
GRANT ALL ON public.timecard_headers TO service_role;
GRANT ALL ON public.timecard_daily_entries TO service_role;

-- Grant permissions to anon users (for API access)
GRANT ALL ON public.timecard_headers TO anon;
GRANT ALL ON public.timecard_daily_entries TO anon;

-- Drop existing policies for timecard tables
DROP POLICY IF EXISTS "Authenticated users can access timecard_headers" ON timecard_headers;
DROP POLICY IF EXISTS "Service role can manage timecard_headers" ON timecard_headers;
DROP POLICY IF EXISTS "Authenticated users can access timecard_daily_entries" ON timecard_daily_entries;
DROP POLICY IF EXISTS "Service role can manage timecard_daily_entries" ON timecard_daily_entries;

-- Create permissive policies for timecard tables
CREATE POLICY "Authenticated users can access timecard_headers" ON timecard_headers 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage timecard_headers" ON timecard_headers 
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can access timecard_daily_entries" ON timecard_daily_entries 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage timecard_daily_entries" ON timecard_daily_entries 
  FOR ALL USING (auth.role() = 'service_role');

-- Temporarily disable RLS for development (can be re-enabled later)
ALTER TABLE timecard_headers DISABLE ROW LEVEL SECURITY;
ALTER TABLE timecard_daily_entries DISABLE ROW LEVEL SECURITY;

-- Verify the tables exist and show their structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('timecard_headers', 'timecard_daily_entries')
ORDER BY table_name, ordinal_position;