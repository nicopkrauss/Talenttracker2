-- Migration: Drop Old Timecards Table
-- Clean transition to normalized structure since only test data exists

-- Drop the old timecards table and all its constraints
DROP TABLE IF EXISTS timecards CASCADE;

-- Verify new normalized tables exist and are properly structured
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('timecard_headers', 'timecard_daily_entries')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verify triggers exist for automatic total calculation
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'timecard_daily_entries'
  AND trigger_schema = 'public';

-- Comment on the clean transition
COMMENT ON TABLE timecard_headers IS 'Normalized timecard structure - replaces old timecards table';
COMMENT ON TABLE timecard_daily_entries IS 'Individual day entries for normalized timecards';

-- Success message
SELECT 'Old timecards table dropped successfully. Normalized structure is now active.' AS status;