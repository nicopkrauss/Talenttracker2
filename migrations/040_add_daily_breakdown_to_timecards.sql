-- Migration: Add daily breakdown support to timecards
-- This allows storing individual day details while maintaining the current aggregated structure

-- Add daily_breakdown JSONB field to store individual day details
ALTER TABLE timecards 
ADD COLUMN daily_breakdown JSONB;

-- Add index for efficient querying of daily breakdown data
CREATE INDEX idx_timecards_daily_breakdown ON timecards USING GIN (daily_breakdown);

-- Add comment explaining the field structure
COMMENT ON COLUMN timecards.daily_breakdown IS 'JSONB array storing individual day details: [{"date": "2024-01-15", "check_in": "08:00", "check_out": "17:00", "break_start": "12:00", "break_end": "13:00", "hours": 8.0, "notes": "Regular day"}]';

-- Example of daily_breakdown structure:
-- [
--   {
--     "date": "2024-01-15",
--     "check_in_time": "08:00:00",
--     "check_out_time": "17:00:00", 
--     "break_start_time": "12:00:00",
--     "break_end_time": "13:00:00",
--     "hours_worked": 8.0,
--     "break_duration": 1.0,
--     "daily_pay": 200.00,
--     "notes": "Regular workday",
--     "location": "Main Set"
--   },
--   {
--     "date": "2024-01-16", 
--     "check_in_time": "07:00:00",
--     "check_out_time": "19:00:00",
--     "break_start_time": "12:30:00", 
--     "break_end_time": "13:30:00",
--     "hours_worked": 11.0,
--     "break_duration": 1.0,
--     "daily_pay": 275.00,
--     "notes": "Long day with overtime",
--     "location": "Location B"
--   }
-- ]